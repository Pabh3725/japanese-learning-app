// UI-01, FUN-01 — Số liệu thật cho Progress, thanh bên và khối tổng kết hôm nay ở màn kết thúc phiên, đọc từ nhật ký. Server-only.
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

  // Review và Kanji không ghi day_seq: đọc từ mới về cũ, dừng khi đã qua chỗ chuỗi đứt
  for (const table of ['review_logs', 'kanji_logs'] as const) {
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error: logError } = await supabase
        .from(table)
        .select('study_date')
        .eq('user_id', userId)
        .not('study_date', 'is', null)
        .order('study_date', { ascending: false })
        .range(from, from + PAGE - 1)
      if (logError) throw new Error(`Không đọc được ${table}: ${logError.message}`)
      for (const row of rows ?? []) days.add(row.study_date as StudyDate)
      const oldest = rows?.at(-1)?.study_date as StudyDate | undefined
      if (!oldest || (rows?.length ?? 0) < PAGE) break
      if (oldest < addStudyDays(today, -(currentStreak(days, today) + 1))) break
    }
  }
  return { streak: currentStreak(days, today), studiedToday: days.has(today) }
}

export async function getStudyStreak(): Promise<{ streak: number; studiedToday: boolean }> {
  const user = await requireUser()
  const supabase = await createClient()
  return readStreak(supabase, user.id, studyDate(new Date()))
}

/** Đếm số câu theo ngày: câu học, câu ôn và câu Kanji. */
async function addCountsByDay(supabase: Supabase, table: 'exercise_logs' | 'review_logs' | 'kanji_logs', userId: string, since: StudyDate, counts: Map<StudyDate, number>) {
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
    addCountsByDay(supabase, 'kanji_logs', user.id, week[0], counts),
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

export interface SkillSummary {
  answered: number
  correct: number
  /** Số stage hoàn tất hôm nay; ở Kanji là số chữ xong giai đoạn Học. */
  completed: number
}

export interface DaySummary {
  vocabulary: SkillSummary & { points: number }
  wordKanji: SkillSummary & { points: number }
  kanji: SkillSummary
  answered: number
}

/** Tổng kết hôm nay của cả 3 mục, lấy từ nhật ký nên vẫn đúng khi học nhiều phiên hoặc tải lại trang. */
export async function getDaySummary(): Promise<DaySummary> {
  const user = await requireUser()
  const supabase = await createClient()
  const now = new Date()
  const today = studyDate(now)
  const dayStart = new Date(nextStudyDayStart(now).getTime() - 24 * 60 * 60 * 1000).toISOString()
  const vocabulary = { answered: 0, correct: 0, completed: 0, points: 0 }
  const wordKanji = { answered: 0, correct: 0, completed: 0, points: 0 }
  const kanji = { answered: 0, correct: 0, completed: 0 }

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('outcome, points, stage_number')
      .eq('user_id', user.id)
      .eq('study_date', today)
      .eq('source', 'lesson')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được exercise_logs: ${error.message}`)
    for (const log of data ?? []) {
      const skill = log.stage_number === 5 || log.stage_number === 6 ? wordKanji : vocabulary
      skill.answered += 1
      if (log.outcome !== 'wrong') skill.correct += 1
      skill.points += log.points
    }
    if ((data?.length ?? 0) < PAGE) break
  }
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('kanji_logs').select('outcome').eq('user_id', user.id).eq('study_date', today).order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được kanji_logs: ${error.message}`)
    for (const log of data ?? []) {
      kanji.answered += 1
      if (log.outcome !== 'wrong') kanji.correct += 1
    }
    if ((data?.length ?? 0) < PAGE) break
  }

  const [stages, learned] = await Promise.all([
    supabase.from('learner_stage_schedules').select('stage_number').eq('user_id', user.id).gte('completed_at', dayStart).range(0, PAGE - 1),
    supabase.from('learner_kanji').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('completed_at', dayStart),
  ])
  if (stages.error) throw new Error(`Không đọc được learner_stage_schedules: ${stages.error.message}`)
  if (learned.error) throw new Error(`Không đọc được learner_kanji: ${learned.error.message}`)
  for (const row of stages.data ?? []) (row.stage_number === 5 || row.stage_number === 6 ? wordKanji : vocabulary).completed += 1
  kanji.completed = learned.count ?? 0

  return { vocabulary, wordKanji, kanji, answered: vocabulary.answered + wordKanji.answered + kanji.answered }
}
