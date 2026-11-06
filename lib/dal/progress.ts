// UI-01, FUN-01 — Số liệu thật cho Progress, thanh bên và tổng kết ngày, đọc từ nhật ký. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { addStudyDays, nextStudyDayStart, studyDate } from '@/lib/learning/time'
import { currentStreak, lastSevenDays, weekdayLabel } from '@/lib/learning/streak'
import type { StudyDate } from '@/lib/learning/types'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const RETENTION_DAYS = 30

async function readStreak(supabase: Supabase, userId: string, today: StudyDate) {
  // Mỗi ngày có đúng một câu học day_seq = 1, nên chỉ đọc một dòng cho mỗi ngày
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('study_date')
    .eq('user_id', userId)
    .eq('source', 'lesson')
    .eq('day_seq', 1)
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được exercise_logs: ${error.message}`)
  const days = new Set<StudyDate>(data?.map((r) => r.study_date))

  // Review không ghi day_seq: đọc từ mới về cũ, dừng khi đã qua chỗ chuỗi đứt
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error: reviewError } = await supabase
      .from('review_logs')
      .select('study_date')
      .eq('user_id', userId)
      .not('study_date', 'is', null)
      .order('study_date', { ascending: false })
      .range(from, from + PAGE - 1)
    if (reviewError) throw new Error(`Không đọc được review_logs: ${reviewError.message}`)
    for (const row of rows ?? []) days.add(row.study_date as StudyDate)
    const oldest = rows?.at(-1)?.study_date as StudyDate | undefined
    if (!oldest || (rows?.length ?? 0) < PAGE) break
    if (oldest < addStudyDays(today, -(currentStreak(days, today) + 1))) break
  }
  return { streak: currentStreak(days, today), studiedToday: days.has(today) }
}

export async function getStudyStreak(): Promise<{ streak: number; studiedToday: boolean }> {
  const user = await requireUser()
  const supabase = await createClient()
  return readStreak(supabase, user.id, studyDate(new Date()))
}

/** Đếm số câu theo ngày, gồm cả câu học và câu ôn. */
async function addCountsByDay(supabase: Supabase, table: 'exercise_logs' | 'review_logs', userId: string, since: StudyDate, counts: Map<StudyDate, number>) {
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select('study_date').eq('user_id', userId).gte('study_date', since).order('id').range(from, from + PAGE - 1)
    if (table === 'exercise_logs') query = query.eq('source', 'lesson')
    const { data, error } = await query
    if (error) throw new Error(`Không đọc được ${table}: ${error.message}`)
    for (const row of data ?? []) {
      const day = row.study_date as StudyDate
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    if ((data?.length ?? 0) < PAGE) return
  }
}

export interface ProgressStats {
  streak: number
  /** Tỷ lệ Card nhớ được trong 30 ngày, null khi chưa ôn lần nào. */
  retention: number | null
  week: { date: StudyDate; label: string; answered: number }[]
}

export async function getProgressStats(): Promise<ProgressStats> {
  const user = await requireUser()
  const supabase = await createClient()
  const today = studyDate(new Date())
  const week = lastSevenDays(today)
  const counts = new Map<StudyDate, number>()
  const since = addStudyDays(today, -RETENTION_DAYS)
  const reviewCount = () => supabase.from('review_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('study_date', since)

  const [streak, total, forgot] = await Promise.all([
    readStreak(supabase, user.id, today),
    reviewCount(),
    reviewCount().eq('rating', 1),
    addCountsByDay(supabase, 'exercise_logs', user.id, week[0], counts),
    addCountsByDay(supabase, 'review_logs', user.id, week[0], counts),
  ])
  if (total.error) throw new Error(`Không đọc được review_logs: ${total.error.message}`)
  if (forgot.error) throw new Error(`Không đọc được review_logs: ${forgot.error.message}`)

  const reviewed = total.count ?? 0
  return {
    streak: streak.streak,
    retention: reviewed > 0 ? (reviewed - (forgot.count ?? 0)) / reviewed : null,
    week: week.map((date) => ({ date, label: weekdayLabel(date), answered: counts.get(date) ?? 0 })),
  }
}

export interface DaySummary {
  answered: number
  correct: number
  points: number
  stagesCompleted: number
}

/** Tổng kết Learn của hôm nay, lấy từ nhật ký nên vẫn đúng khi học nhiều phiên hoặc tải lại trang. */
export async function getDaySummary(): Promise<DaySummary> {
  const user = await requireUser()
  const supabase = await createClient()
  const now = new Date()
  const summary: DaySummary = { answered: 0, correct: 0, points: 0, stagesCompleted: 0 }

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('outcome, points')
      .eq('user_id', user.id)
      .eq('study_date', studyDate(now))
      .eq('source', 'lesson')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được exercise_logs: ${error.message}`)
    for (const log of data ?? []) {
      summary.answered += 1
      if (log.outcome !== 'wrong') summary.correct += 1
      summary.points += log.points
    }
    if ((data?.length ?? 0) < PAGE) break
  }

  const dayStart = new Date(nextStudyDayStart(now).getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('learner_stage_schedules')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('completed_at', dayStart)
  if (error) throw new Error(`Không đọc được learner_stage_schedules: ${error.message}`)
  summary.stagesCompleted = count ?? 0
  return summary
}
