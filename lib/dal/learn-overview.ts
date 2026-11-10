// DAL cho trang Learn: số thật của người học. Server-only. Lọc từ giống getStageSession để số trên thẻ khớp với lượt học.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readDailyLimits } from '@/lib/dal/daily-limits'
import { readSkillLevels } from '@/lib/dal/skill-levels'
import { readStarRound, readStarredIds } from '@/lib/dal/star-relearn'
import { inLevel, nextLevel } from '@/lib/learn/levels'
import { newWordsBlockedBy, sessionsFor, type NewWordsBlock, pathLevels, type PathLevel } from '@/lib/learn/session'
import { countMetToday, newPerDayOf, newWordsForToday, remainingNewToday } from '@/lib/learning/new-words'
import { nextStudyDayStart } from '@/lib/learning/time'

const PAGE = 1000

export interface LearnOverview {
  /** Số từ mới còn học được hôm nay: theo giới hạn trong Settings và số từ còn lại. */
  newToday: number
  /** Số câu đang đến hẹn của từng Stage. */
  due: { 2: number; 3: number }
  /** Cấp từ vựng đang học. */
  level: number
  /** Cấp sau có thể mở khi đã mở hết từ của cấp này; null nếu chưa tới lúc. */
  nextLevel: number | null
  /** Tổng số câu đến hẹn còn làm được hôm nay, sau khi áp trần. */
  questionsToday: number
  /** Số phiên còn lại hôm nay. */
  sessions: number
  /** Lý do hôm nay không có thêm từ mới. */
  block: NewWordsBlock
  /** Tiến độ tách theo cấp: N5 là bài 1–25, N4 từ bài 26. */
  levels: PathLevel[]
  /** Số từ có sao, không tính từ đã biết. */
  starredCount: number
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
  stage_number: 2 | 3
  stage_points: number
  learner_vocabulary: { vocabulary_id: string; kanji_intro_seen_at: string | null }
}
const DAY_MS = 86_400_000

type LessonRow = { id: string; lesson: number | null; jlpt_level: number | null }

async function readLessons(supabase: Awaited<ReturnType<typeof createClient>>): Promise<LessonRow[]> {
  const rows: LessonRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('vocabularies').select('id, lesson, jlpt_level').order('sort_order').range(from, from + PAGE - 1)
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

  const [total, lessons, started, excluded, limits, levels] = await Promise.all([
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
    readSkillLevels(supabase, user.id),
  ])
  if (total.error) throw new Error(`Không đọc được vocabularies: ${total.error.message}`)
  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)

  // Mỗi từ có tới 3 dòng lịch, nên số dòng có thể vượt 1000 mỗi lần của Data API
  const dueRows: DueRow[] = []
  const now = new Date().toISOString()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('learner_stage_schedules')
      .select('stage_number, stage_points, learner_vocabulary!inner(vocabulary_id, learning_status, kanji_intro_seen_at)')
      .eq('user_id', user.id)
      .in('stage_number', [2, 3])
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

  const due = { 2: 0, 3: 0 }
  for (const row of dueRows) {
    if (!excludedIds.has(row.learner_vocabulary.vocabulary_id)) due[row.stage_number as 2 | 3]++
  }
  const completed = active.filter((r) => r.learning_status === 'initial_complete').length

  const startOfToday = new Date(nextStudyDayStart(new Date()).getTime() - DAY_MS).toISOString()
  const metToday = countMetToday(started.data ?? [], excludedIds, startOfToday)
  const startedIds2 = new Set(active.map((r) => r.vocabulary_id))
  const inLevelWords = lessons.filter((r) => inLevel(r.jlpt_level, levels.vocabulary) && !excludedIds.has(r.id))
  // Chỉ tính từ của cấp đang học; hết từ thì app hỏi rồi mới mở cấp sau
  const left = inLevelWords.filter((r) => !startedIds2.has(r.id)).length

  const dueTotal = due[2] + due[3]
  const block = newWordsBlockedBy({
    cardsDue: limits.cardsDueToday,
    unlockThreshold: limits.unlockThreshold,
    stageDue: limits.stageDueToday,
    stageCap: limits.stageCap,
  })
  const newPerDay = newPerDayOf(limits.newPerDay)
  const newToday = block ? 0 : Math.min(left, remainingNewToday(newWordsForToday(newPerDay, limits.borrowedForToday, limits.borrowedForNext), metToday))
  // Câu vòng học thêm của từ có sao chạy song song, không tính vào trần câu Stage
  const starItems = await readStarRound<{ is_kana_only: boolean; han_viet: string | null }>(supabase, user.id, 'is_kana_only, han_viet', excludedIds)
  const starLeft = starItems.reduce((sum, item) => sum + item.exercises.length - item.answered, 0)
  const starredIds = await readStarredIds(supabase, user.id)
  const questionsToday = Math.min(dueTotal, Math.max(0, limits.stageCap - limits.answeredToday)) + starLeft

  return {
    newToday,
    due,
    questionsToday,
    sessions: sessionsFor(questionsToday + newToday),
    block,
    level: levels.vocabulary,
    nextLevel: left === 0 ? nextLevel(levels.vocabulary, lessons.map((r) => r.jlpt_level)) : null,
    levels: pathLevels(lessons, new Set(active.filter((r) => r.learning_status === 'initial_complete').map((r) => r.vocabulary_id)), excludedIds),
    starredCount: starredIds.filter((id) => !excludedIds.has(id)).length,
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
