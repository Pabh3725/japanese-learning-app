// SES-01 — Số liệu trong ngày của Learn: chụp D, S lần đầu trong ngày học, giới hạn, số từ mượn. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { RULES_V4 } from '@/lib/learning/rules'
import { addStudyDays, studyDate } from '@/lib/learning/time'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000

export interface DailyLimits {
  newPerDay: number
  stageCap: number
  reviewCap: number
  unlockThreshold: number
  /** D: Card đến hạn, chụp lần đầu trong ngày. */
  cardsDueToday: number
  /** S: câu Stage đến hẹn, chụp lần đầu trong ngày. */
  stageDueToday: number
  answeredToday: number
  /** Số từ hôm qua đã mượn của hôm nay. */
  borrowedForToday: number
  /** Số từ hôm nay đã mượn của ngày mai. */
  borrowedForNext: number
}

/** Đếm dòng đến hạn, bỏ từ đã đánh dấu là đã biết. Đọc từng trang vì Data API trả tối đa 1000 dòng. */
async function countDue(supabase: Supabase, table: 'review_cards' | 'learner_stage_schedules', userId: string, excludedIds: ReadonlySet<string>): Promise<number> {
  const now = new Date().toISOString()
  const filterColumn = table === 'review_cards' ? 'retired_at' : 'completed_at'
  let total = 0
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select('id, learner_vocabulary!inner(vocabulary_id)').eq('user_id', userId).is(filterColumn, null).lte('due_at', now)
    // Card riêng của từ có sao không được làm dừng từ mới
    if (table === 'review_cards') query = query.neq('card_type', 'vocab.star_recall')
    // S chỉ tính kỹ năng Từ vựng; Từ Kanji có trần riêng
    else query = query.in('stage_number', [2, 5])
    const { data, error } = await query.order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được ${table}: ${error.message}`)
    const rows = (data ?? []) as unknown as { learner_vocabulary: { vocabulary_id: string } }[]
    total += rows.filter((r) => !excludedIds.has(r.learner_vocabulary.vocabulary_id)).length
    if (rows.length < PAGE) return total
  }
}

/** Dòng kế hoạch của hôm nay. Lần đọc đầu trong ngày thì chụp D và S; các lần sau giữ nguyên. */
async function todayPlan(supabase: Supabase, userId: string, today: string) {
  const { data, error } = await supabase
    .from('learner_daily_plans')
    .select('due_snapshot, stage_snapshot, borrowed_for_next')
    .eq('user_id', userId)
    .eq('study_date', today)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_daily_plans: ${error.message}`)
  if (data) return data

  const { data: excluded, error: excludedError } = await supabase
    .from('learner_vocabulary_exclusions')
    .select('vocabulary_id')
    .eq('user_id', userId)
    .not('excluded_at', 'is', null)
    .range(0, PAGE - 1)
  if (excludedError) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excludedError.message}`)
  const excludedIds = new Set(excluded?.map((r) => r.vocabulary_id))
  const [dueSnapshot, stageSnapshot] = await Promise.all([
    countDue(supabase, 'review_cards', userId, excludedIds),
    countDue(supabase, 'learner_stage_schedules', userId, excludedIds),
  ])
  // Hai request đồng thời: dòng đến trước được giữ, số chụp không đổi trong ngày
  const { error: insertError } = await supabase
    .from('learner_daily_plans')
    .upsert({ user_id: userId, study_date: today, due_snapshot: dueSnapshot, stage_snapshot: stageSnapshot }, { onConflict: 'user_id,study_date', ignoreDuplicates: true })
  if (insertError) throw new Error(`Không ghi được learner_daily_plans: ${insertError.message}`)
  return { due_snapshot: dueSnapshot, stage_snapshot: stageSnapshot, borrowed_for_next: 0 }
}

export async function readDailyLimits(supabase: Supabase, userId: string): Promise<DailyLimits> {
  const today = studyDate(new Date())
  const [settings, plan, yesterday, answered] = await Promise.all([
    supabase.from('learner_settings').select('daily_new_limit, stage_cap, review_cap, unlock_threshold').eq('user_id', userId).maybeSingle(),
    todayPlan(supabase, userId, today),
    supabase.from('learner_daily_plans').select('borrowed_for_next').eq('user_id', userId).eq('study_date', addStudyDays(today, -1)).maybeSingle(),
    supabase.from('exercise_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('study_date', today).eq('source', 'lesson').in('stage_number', [2, 5]),
  ])
  if (settings.error) throw new Error(`Không đọc được learner_settings: ${settings.error.message}`)
  if (yesterday.error) throw new Error(`Không đọc được learner_daily_plans: ${yesterday.error.message}`)
  if (answered.error) throw new Error(`Không đọc được exercise_logs: ${answered.error.message}`)
  const { defaults } = RULES_V4
  return {
    newPerDay: settings.data?.daily_new_limit ?? defaults.newPerDay,
    stageCap: settings.data?.stage_cap ?? defaults.stageCap,
    reviewCap: settings.data?.review_cap ?? defaults.reviewCap,
    unlockThreshold: settings.data?.unlock_threshold ?? defaults.unlockThreshold,
    cardsDueToday: plan.due_snapshot,
    stageDueToday: plan.stage_snapshot,
    answeredToday: answered.count ?? 0,
    borrowedForToday: yesterday.data?.borrowed_for_next ?? 0,
    borrowedForNext: plan.borrowed_for_next,
  }
}

export async function saveBorrowed(supabase: Supabase, userId: string, borrowedForNext: number): Promise<void> {
  const { error } = await supabase
    .from('learner_daily_plans')
    .update({ borrowed_for_next: borrowedForNext })
    .eq('user_id', userId)
    .eq('study_date', studyDate(new Date()))
  if (error) throw new Error(`Không ghi được learner_daily_plans: ${error.message}`)
}
