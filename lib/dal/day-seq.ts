// Vị trí câu kế tiếp trong ngày học (daySeq), dùng cho luật giãn cách.
// Tạm thời cho các màn bài tập riêng lẻ (VOC-02, VOC-03): SES-01 / REV-02 sẽ cấp vị trí trong hàng đợi.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import type { StudyDate } from '@/lib/learning/types'

/**
 * Câu tính điểm gần nhất trong ngày học (V9 R3): câu Stage, câu Học Kanji, câu Card Kanji (và câu Review cũ có day_seq).
 * Câu kiểm tra nhanh không tăng số này, chỉ đặt mốc bằng đúng số này.
 */
export async function getLastDaySeq(today: StudyDate): Promise<number> {
  const user = await requireUser()
  const supabase = await createClient()
  const latest = (table: 'exercise_logs' | 'review_logs' | 'kanji_logs') => {
    let query = supabase.from(table).select('day_seq').eq('user_id', user.id).eq('study_date', today).not('day_seq', 'is', null)
    if (table === 'exercise_logs') query = query.eq('source', 'lesson')
    return query.order('day_seq', { ascending: false }).limit(1)
  }
  const results = await Promise.all([latest('exercise_logs'), latest('review_logs'), latest('kanji_logs')])
  for (const r of results) if (r.error) throw new Error(`Không đọc được thứ tự câu trong ngày: ${r.error.message}`)
  return Math.max(0, ...results.map((r) => (r.data?.[0]?.day_seq as number | undefined) ?? 0))
}

/** Thứ tự của câu tính điểm kế tiếp. Câu đầu ngày là 1. */
export async function getNextDaySeq(today: StudyDate): Promise<number> {
  return (await getLastDaySeq(today)) + 1
}
