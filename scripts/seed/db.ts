// SeedDb thật, dùng supabase-js với SERVICE ROLE key (bỏ qua RLS).
// Chỉ được import từ script chạy ở terminal, không bao giờ từ app Next.js.

import { createClient } from '@supabase/supabase-js'
import type { Row, SeedDb } from './run'

const PAGE = 1000 // PostgREST trả tối đa 1000 dòng mỗi lần
const CHUNK = 500 // gửi upsert theo lô

export function createSupabaseSeedDb(url: string, serviceRoleKey: string): SeedDb {
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    async fetchAll(table, columns) {
      const out: Row[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb
          .from(table)
          .select(columns.join(','))
          .order(columns[0])
          .order(columns[1] ?? columns[0]) // thứ tự cố định để chia trang không sót dòng
          .range(from, from + PAGE - 1)
        if (error) throw new Error(`Đọc ${table} lỗi: ${error.message}`)
        const rows = (data ?? []) as unknown as Row[]
        out.push(...rows)
        if (rows.length < PAGE) return out
      }
    },

    async upsert(table, rows, onConflict) {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await sb.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict })
        if (error) throw new Error(`Ghi ${table} lỗi: ${error.message}${error.details ? ` (${error.details})` : ''}`)
      }
    },

    async deleteLinks(links) {
      for (const l of links) {
        const { error } = await sb
          .from('vocabulary_kanji')
          .delete()
          .eq('vocabulary_id', l.vocabulary_id)
          .eq('position', l.position)
        if (error) throw new Error(`Xoá liên kết thừa lỗi: ${error.message}`)
      }
    },
  }
}

/**
 * Chặn dùng nhầm anon/publishable key: key đó không ghi được (RLS chặn) và nếu
 * ai đó lỡ dán service key vào biến NEXT_PUBLIC_ thì càng phải phát hiện sớm.
 */
export function assertServiceRoleKey(key: string): void {
  if (key.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SECRET_KEY đang là publishable key. Cần secret key (sb_secret_...) hoặc service_role key.')
  }
  if (key.startsWith('sb_secret_')) return
  const payload = key.split('.')[1]
  if (!payload) throw new Error('SUPABASE_SECRET_KEY không đúng định dạng.')
  try {
    const role = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role
    if (role !== 'service_role') {
      throw new Error(`SUPABASE_SECRET_KEY có role "${role}", cần "service_role" (đây có thể là anon key).`)
    }
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error('SUPABASE_SECRET_KEY không đúng định dạng.')
    throw e
  }
}
