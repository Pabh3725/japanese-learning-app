// DAL cho trang Learn: số thật của người học. Server-only. Lọc từ giống getStageSession để số trên thẻ khớp với lượt học.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { DUPLICATE_KANA_CODES } from '@/lib/intro/words'
import { newPerDayOf, remainingNewToday } from '@/lib/learning/new-words'
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
  completed: number
  inProgress: number
  total: number
}

type DueRow = {
  stage_number: 2 | 4 | 5
  stage_points: number
  learner_vocabulary: { vocabulary_id: string; kanji_intro_seen_at: string | null }
}
const DAY_MS = 86_400_000

export async function getLearnOverview(): Promise<LearnOverview> {
  const user = await requireUser()
  const supabase = await createClient()

  const [total, duplicates, started, excluded, settings, kanjiPending] = await Promise.all([
    supabase.from('vocabularies').select('id', { count: 'exact', head: true }),
    supabase.from('vocabularies').select('id').in('code', [...DUPLICATE_KANA_CODES]),
    supabase.from('learner_vocabulary').select('vocabulary_id, current_stage, learning_status, created_at').eq('user_id', user.id).range(0, PAGE - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, PAGE - 1),
    supabase.from('learner_settings').select('daily_new_limit').eq('user_id', user.id).maybeSingle(),
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
  if (duplicates.error) throw new Error(`Không đọc được vocabularies: ${duplicates.error.message}`)
  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)
  if (settings.error) throw new Error(`Không đọc được learner_settings: ${settings.error.message}`)
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
  // Dòng trùng không tính vào lộ trình, trừ khi người học đã bắt đầu dòng đó
  const hiddenIds = (duplicates.data ?? []).map((r) => r.id).filter((id) => !startedIds.has(id))
  const count = (total.count ?? 0) - hiddenIds.length

  const due = { 2: 0, 4: 0, 5: 0 }
  for (const row of dueRows) {
    const { vocabulary_id: id, kanji_intro_seen_at: seen } = row.learner_vocabulary
    const waitingKanjiIntro = row.stage_number === 4 && seen === null && reachedKanjiIntro(row.stage_points)
    if (!excludedIds.has(id) && !waitingKanjiIntro) due[row.stage_number]++
  }
  const completed = active.filter((r) => r.learning_status === 'initial_complete').length

  const startOfToday = new Date(nextStudyDayStart(new Date()).getTime() - DAY_MS).toISOString()
  const metToday = (started.data ?? []).filter((r) => r.created_at >= startOfToday).length
  const left = count - new Set([...startedIds, ...excludedIds]).size
  const kanjiWaiting = ((kanjiPending.data ?? []) as unknown as { learner_vocabulary: { vocabulary_id: string } }[]).filter(
    (r) => !excludedIds.has(r.learner_vocabulary.vocabulary_id),
  ).length

  return {
    newToday: Math.min(left, remainingNewToday(newPerDayOf(settings.data?.daily_new_limit), metToday)),
    stage3Waiting: active.filter((r) => r.learning_status === 'learning' && r.current_stage === 3).length + kanjiWaiting,
    due,
    completed,
    inProgress: active.length - completed,
    total: count,
  }
}
