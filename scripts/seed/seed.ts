// pnpm seed            → validate, in kế hoạch, rồi GHI vào database
// pnpm seed --dry-run  → validate, in kế hoạch, KHÔNG ghi
// pnpm seed --check    → chỉ validate file, không cần key, không chạm database
//
// Biến môi trường (đặt trong .env.local, KHÔNG commit):
//   NEXT_PUBLIC_SUPABASE_URL   URL project (hoặc SUPABASE_URL)
//   SUPABASE_SECRET_KEY        secret key (sb_secret_...) — KHÔNG có prefix NEXT_PUBLIC_
//                              (tên cũ SUPABASE_SERVICE_ROLE_KEY vẫn đọc được)

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runSeed, type SeedDb } from './run'

const DATA_DIR = join(process.cwd(), 'data', 'n5')

async function main() {
  const args = new Set(process.argv.slice(2))
  const check = args.has('--check')
  const dryRun = args.has('--dry-run')
  const unknown = [...args].filter((a) => a !== '--check' && a !== '--dry-run')
  if (unknown.length) throw new Error(`Không hiểu tham số: ${unknown.join(' ')}. Dùng --dry-run hoặc --check.`)

  const read = (name: string) => ({ name, text: readFileSync(join(DATA_DIR, name), 'utf8') })
  const files = {
    kanji: read('kanji.csv'),
    vocabularies: read('vocabularies.csv'),
    // V9 gói 3: chính sách Kanji của từ, do pnpm policy:propose tạo rồi chủ dự án duyệt
    ...(existsSync(join(DATA_DIR, 'kanji_policy.csv')) ? { policy: read('kanji_policy.csv') } : {}),
  }

  let db: SeedDb | null = null
  if (!check) {
    try {
      process.loadEnvFile('.env.local')
    } catch {
      // không có file thì dùng biến môi trường sẵn có
    }
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env.local.')
    }
    // Nạp supabase-js chỉ khi cần DB, để --check chạy được ở mọi nơi
    const { assertServiceRoleKey, createSupabaseSeedDb } = await import('./db')
    assertServiceRoleKey(key)
    console.log(`Database: ${new URL(url).host}${dryRun ? '  (dry-run)' : ''}\n`)
    db = createSupabaseSeedDb(url, key)
  }

  const result = await runSeed({ files, db, dryRun, log: (s) => console.log(s) })
  process.exitCode = result.ok ? 0 : 1
}

main().catch((e: unknown) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exitCode = 1
})
