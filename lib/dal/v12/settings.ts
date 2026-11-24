// V12: cài đặt học (Settings §2, §8). Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import type { Zone } from '@/lib/v12/card-types'
import { addStudyDays, studyDate } from '@/lib/learning/time'
import { RULES_V12 } from '@/lib/v12/rules'

export interface V12Settings {
  setSize: number
  caps: Record<Zone, number>
  balanceOn: boolean
  /** 'items': tổng số mục mới mỗi ngày (mặc định); 'date': xong cấp vào ngày đã chọn. */
  balanceTarget: 'items' | 'date'
  /** Tổng số mục mới mỗi ngày, chia cho ba khu. */
  balanceItems: number
  balanceDate: string | null
  balanceMinutes: number
  balanceCarry: Record<string, number>
  /** Số mục mới mỗi ngày khi tắt cân bằng. Khu Kanji gồm bộ thủ và chữ. */
  newPerDay: Record<Zone, number>
  /** Khu người học tự dừng mục mới. */
  pausedZones: Record<Zone, boolean>
  /** Bộ thủ mới mỗi ngày ở bộ thẻ bộ thủ (phần More). */
  newRadicalsPerDay: number
}

const COLUMNS = 'set_size, v12_kana_cap, v12_kanji_cap, v12_word_kanji_cap, balance_on, balance_target, balance_date, balance_minutes, balance_items, balance_carry, v12_new_kana, v12_new_kanji, v12_new_word_kanji, v12_pause_kana, v12_pause_kanji, v12_pause_word_kanji, v12_new_radical'

export async function readV12Settings(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<V12Settings> {
  const { data, error } = await supabase.from('learner_settings').select(COLUMNS).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  const d = (data ?? {}) as Record<string, unknown>
  return {
    setSize: (d.set_size as number) ?? RULES_V12.set.default,
    caps: { kana: (d.v12_kana_cap as number) ?? RULES_V12.caps.kana, kanji: (d.v12_kanji_cap as number) ?? RULES_V12.caps.kanji, word_kanji: (d.v12_word_kanji_cap as number) ?? RULES_V12.caps.word_kanji },
    balanceOn: (d.balance_on as boolean) ?? false,
    balanceTarget: d.balance_target === 'date' ? 'date' : 'items',
    balanceItems: (d.balance_items as number) ?? RULES_V12.balance.defaultItems,
    balanceDate: (d.balance_date as string | null) ?? null,
    balanceMinutes: (d.balance_minutes as number) ?? RULES_V12.balance.defaultMinutes,
    balanceCarry: (d.balance_carry as Record<string, number>) ?? {},
    newPerDay: { kana: (d.v12_new_kana as number) ?? 10, kanji: (d.v12_new_kanji as number) ?? 2, word_kanji: (d.v12_new_word_kanji as number) ?? 2 },
    pausedZones: { kana: d.v12_pause_kana === true, kanji: d.v12_pause_kanji === true, word_kanji: d.v12_pause_word_kanji === true },
    newRadicalsPerDay: (d.v12_new_radical as number) ?? 5,
  }
}

export async function getV12Settings(): Promise<V12Settings> {
  const user = await requireUser()
  return readV12Settings(await createClient(), user.id)
}

/** Giới hạn cho phép của từng cột (khớp CHECK trong migration 20261128000001). */
const LIMITS: Record<string, [number, number]> = {
  set_size: [RULES_V12.set.min, RULES_V12.set.max],
  v12_kana_cap: [RULES_V12.caps.min, RULES_V12.caps.max],
  v12_kanji_cap: [RULES_V12.caps.min, RULES_V12.caps.max],
  v12_word_kanji_cap: [RULES_V12.caps.min, RULES_V12.caps.max],
  balance_minutes: [5, 240],
  balance_items: [1, 100],
  v12_new_kana: [0, 50],
  v12_new_kanji: [0, 50],
  v12_new_word_kanji: [0, 50],
  v12_new_radical: [0, 30],
}

export async function saveV12Setting(key: unknown, value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  let ok = false
  if (typeof key === 'string' && key in LIMITS) ok = Number.isInteger(value) && (value as number) >= LIMITS[key][0] && (value as number) <= LIMITS[key][1]
  else if (key === 'balance_on' || key === 'v12_pause_kana' || key === 'v12_pause_kanji' || key === 'v12_pause_word_kanji') ok = typeof value === 'boolean'
  else if (key === 'balance_target') ok = value === 'items' || value === 'date'
  // Ngày hoàn thành: từ ngày học mai trở đi (hôm nay hoặc ngày đã qua sẽ dồn mọi mục còn lại vào một ngày)
  else if (key === 'balance_date') ok = value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= addStudyDays(studyDate(new Date()), 1))
  if (!ok) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('learner_settings').upsert({ user_id: user.id, [key as string]: value }, { onConflict: 'user_id' })
  if (error) throw new Error(`Không lưu được learner_settings: ${error.message}`)
  return { status: 'saved' }
}
