// Vị trí câu kế tiếp trong ngày học (daySeq), dùng cho luật giãn cách.
// Tạm thời cho các màn bài tập riêng lẻ (VOC-02, VOC-03): SES-01 / REV-02 sẽ cấp vị trí trong hàng đợi.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import type { StudyDate } from '@/lib/learning/types'

/** Số lớn nhất trong ngày (câu học + câu review) + 1. Câu đầu ngày là 1. */
export async function getNextDaySeq(today: StudyDate): Promise<number> {
  const user = await requireUser()
  const supabase = await createClient()

  const [exercise, review] = await Promise.all([
    supabase
      .from('exercise_logs')
      .select('day_seq')
      .eq('user_id', user.id)
      .eq('study_date', today)
      .eq('source', 'lesson')
      .order('day_seq', { ascending: false })
      .limit(1),
    supabase
      .from('review_logs')
      .select('day_seq')
      .eq('user_id', user.id)
      .eq('study_date', today)
      .not('day_seq', 'is', null)
      .order('day_seq', { ascending: false })
      .limit(1),
  ])
  if (exercise.error) throw new Error(`Không đọc được exercise_logs: ${exercise.error.message}`)
  if (review.error) throw new Error(`Không đọc được review_logs: ${review.error.message}`)

  const highest = Math.max(0, exercise.data?.[0]?.day_seq ?? 0, review.data?.[0]?.day_seq ?? 0)
  return highest + 1
}
