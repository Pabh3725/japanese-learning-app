// DAL cho trang Learn: số thật của người học. Server-only. Lọc từ giống getStageSession để số trên thẻ khớp với lượt học.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'

const PAGE = 1000

export interface LearnOverview {
  /** Từ chưa gặp và chưa bị loại. */
  newWords: number
  /** Từ đang chờ xem thẻ Stage 3. */
  stage3Waiting: number
  /** Số câu đang đến hẹn của từng Stage. */
  due: { 2: number; 4: number; 5: number }
  completed: number
  inProgress: number
  total: number
}

type DueRow = { stage_number: 2 | 4 | 5; learner_vocabulary: { vocabulary_id: string } }

export async function getLearnOverview(): Promise<LearnOverview> {
  const user = await requireUser()
  const supabase = await createClient()

  const [total, started, excluded] = await Promise.all([
    supabase.from('vocabularies').select('id', { count: 'exact', head: true }),
    supabase.from('learner_vocabulary').select('vocabulary_id, current_stage, learning_status').eq('user_id', user.id).range(0, PAGE - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, PAGE - 1),
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
      .select('stage_number, learner_vocabulary!inner(vocabulary_id, learning_status)')
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
  const count = total.count ?? 0

  const due = { 2: 0, 4: 0, 5: 0 }
  for (const row of dueRows) {
    if (!excludedIds.has(row.learner_vocabulary.vocabulary_id)) due[row.stage_number]++
  }
  const completed = active.filter((r) => r.learning_status === 'initial_complete').length

  return {
    newWords: count - new Set([...startedIds, ...excludedIds]).size,
    stage3Waiting: active.filter((r) => r.learning_status === 'learning' && r.current_stage === 3).length,
    due,
    completed,
    inProgress: active.length - completed,
    total: count,
  }
}
