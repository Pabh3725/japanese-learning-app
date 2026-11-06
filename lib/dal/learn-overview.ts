// DAL cho trang Learn: số thật của người học. Server-only. Lọc từ giống getStageSession để số trên thẻ khớp với lượt học.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readDailyLimits } from '@/lib/dal/daily-limits'
import { newWordsBlockedBy, sessionsFor, type NewWordsBlock } from '@/lib/learn/session'
import { countMetToday, newPerDayOf, newWordsForToday, remainingNewToday } from '@/lib/learning/new-words'
import { RULES_V4 } from '@/lib/learning/rules'
import { reachedKanjiIntro } from '@/lib/learning/stage'
import { nextStudyDayStart } from '@/lib/learning/time'

const PAGE = 1000

export interface LearnOverview {
  /** Số từ mới còn học được hôm nay: theo giới hạn trong Settings và số từ còn lại. */
  newToday: number
  /** Số thẻ đang chờ ở trang Stage 3: thẻ Hán Việt và thẻ Giới thiệu Hán tự. */
  stage3Waiting: number
  /** Số câu đang đến hẹn của từng Stage. */
  due: { 2: number; 4: number; 5: number }
  /** Tổng số câu đến hẹn còn làm được hôm nay, sau khi áp trần. */
  questionsToday: number
  /** Số phiên còn lại hôm nay. */
  sessions: number
  /** Lý do hôm nay không có thêm từ mới. */
  block: NewWordsBlock
  /** Số câu Learn đã trả lời hôm nay. */
  answeredToday: number
  /** Số từ có thể mượn thêm của ngày mai. */
  canBorrow: number
  newPerDay: number
  /** Số từ chưa gặp trong lộ trình. */
  wordsLeft: number
  completed: number
  inProgress: number
  total: number
  /** Bài đang học: bài đầu tiên còn từ chưa gặp. null khi đã gặp hết. */
  currentLesson: { lesson: number; met: number; total: number } | null
}

type DueRow = {
  stage_number: 2 | 4 | 5
  stage_points: number
  learner_vocabulary: { vocabulary_id: string; kanji_intro_seen_at: string | null }
}
const DAY_MS = 86_400_000

type LessonRow = { id: string; lesson: number | null }

async function readLessons(supabase: Awaited<ReturnType<typeof createClient>>): Promise<LessonRow[]> {
  const rows: LessonRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('vocabularies').select('id, lesson').order('sort_order').range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được vocabularies: ${error.message}`)
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGE) return rows
  }
}

/** Từ đã gặp hoặc đã đánh dấu là đã biết đều coi là xong với bài đó. */
function currentLesson(rows: readonly LessonRow[], doneIds: ReadonlySet<string>): LearnOverview['currentLesson'] {
  const lesson = rows.find((r) => r.lesson !== null && !doneIds.has(r.id))?.lesson
  if (!lesson) return null
  const inLesson = rows.filter((r) => r.lesson === lesson)
  return { lesson, met: inLesson.filter((r) => doneIds.has(r.id)).length, total: inLesson.length }
}

export async function getLearnOverview(): Promise<LearnOverview> {
  const user = await requireUser()
  const supabase = await createClient()

  const [total, lessons, started, excluded, limits, kanjiPending] = await Promise.all([
    supabase.from('vocabularies').select('id', { count: 'exact', head: true }),
    readLessons(supabase),
    supabase.from('learner_vocabulary').select('vocabulary_id, current_stage, learning_status, created_at').eq('user_id', user.id).range(0, PAGE - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, PAGE - 1),
    readDailyLimits(supabase, user.id),
    // Từ ở Stage 4 đã đủ điểm mà chưa xem thẻ Giới thiệu Hán tự, kể cả khi chưa đến hẹn
    supabase
      .from('learner_stage_schedules')
      .select('learner_vocabulary!inner(vocabulary_id)')
      .eq('user_id', user.id)
      .eq('stage_number', 4)
      .is('completed_at', null)
      .gte('stage_points', RULES_V4.stageSteps[4].kanjiIntroAt)
      .is('learner_vocabulary.kanji_intro_seen_at', null)
      .range(0, PAGE - 1),
  ])
  if (total.error) throw new Error(`Không đọc được vocabularies: ${total.error.message}`)
  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)
  if (kanjiPending.error) throw new Error(`Không đọc được learner_stage_schedules: ${kanjiPending.error.message}`)

  // Mỗi từ có tới 3 dòng lịch, nên số dòng có thể vượt 1000 mỗi lần của Data API
  const dueRows: DueRow[] = []
  const now = new Date().toISOString()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('learner_stage_schedules')
      .select('stage_number, stage_points, learner_vocabulary!inner(vocabulary_id, learning_status, kanji_intro_seen_at)')
      .eq('user_id', user.id)
      .eq('learner_vocabulary.learning_status', 'learning')
      .is('completed_at', null)
      .lte('due_at', now)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được learner_stage_schedules: ${error.message}`)
    dueRows.push(...((data ?? []) as unknown as DueRow[]))
    if ((data?.length ?? 0) < PAGE) break
  }

  const excludedIds = new Set(excluded.data?.map((r) => r.vocabulary_id))
  const active = (started.data ?? []).filter((r) => !excludedIds.has(r.vocabulary_id))
  const startedIds = new Set(started.data?.map((r) => r.vocabulary_id))
  // Từ đã biết không còn trong lộ trình
  const count = (total.count ?? 0) - excludedIds.size

  const due = { 2: 0, 4: 0, 5: 0 }
  for (const row of dueRows) {
    const { vocabulary_id: id, kanji_intro_seen_at: seen } = row.learner_vocabulary
    const waitingKanjiIntro = row.stage_number === 4 && seen === null && reachedKanjiIntro(row.stage_points)
    if (!excludedIds.has(id) && !waitingKanjiIntro) due[row.stage_number]++
  }
  const completed = active.filter((r) => r.learning_status === 'initial_complete').length

  const startOfToday = new Date(nextStudyDayStart(new Date()).getTime() - DAY_MS).toISOString()
  const metToday = countMetToday(started.data ?? [], excludedIds, startOfToday)
  const left = count - active.length
  const kanjiWaiting = ((kanjiPending.data ?? []) as unknown as { learner_vocabulary: { vocabulary_id: string } }[]).filter(
    (r) => !excludedIds.has(r.learner_vocabulary.vocabulary_id),
  ).length

  const dueTotal = due[2] + due[4] + due[5]
  const block = newWordsBlockedBy({
    cardsDue: limits.cardsDueToday,
    unlockThreshold: limits.unlockThreshold,
    stageDue: limits.stageDueToday,
    stageCap: limits.stageCap,
  })
  const newPerDay = newPerDayOf(limits.newPerDay)
  const newToday = block ? 0 : Math.min(left, remainingNewToday(newWordsForToday(newPerDay, limits.borrowedForToday, limits.borrowedForNext), metToday))
  const stage3Waiting = active.filter((r) => r.learning_status === 'learning' && r.current_stage === 3).length + kanjiWaiting
  const questionsToday = Math.min(dueTotal, Math.max(0, limits.stageCap - limits.answeredToday))

  return {
    newToday,
    stage3Waiting,
    due,
    questionsToday,
    sessions: sessionsFor(questionsToday + newToday + stage3Waiting),
    block,
    answeredToday: limits.answeredToday,
    canBorrow: block ? 0 : Math.min(left - newToday, Math.max(0, newPerDay - limits.borrowedForNext)),
    newPerDay,
    wordsLeft: left,
    currentLesson: currentLesson(lessons, new Set([...startedIds, ...excludedIds])),
    completed,
    inProgress: active.length - completed,
    total: count,
  }
}
