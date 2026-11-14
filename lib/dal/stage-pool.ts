// V10 — Kho câu Stage trong ngày (docs/learning-rules.md §0): mục đến hẹn, cộng mục đã trả lời hôm nay mà chưa đủ
// `stagePerDay` câu. Dùng chung cho bài Learn (ứng viên AIS) và Home / Learn (số câu còn lại hôm nay). Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { readAllPages, readInChunks } from '@/lib/dal/pages'
import { isWeak, stagePerDayFor } from '@/lib/learn/stage-per-day'
import { studyDate } from '@/lib/learning/time'
import type { ScoredStage } from '@/lib/learning/types'

type Supabase = Awaited<ReturnType<typeof createClient>>

const DAY_MS = 86_400_000

export interface StagePoolItem {
  lvId: string
  vocabularyId: string
  stage: ScoredStage
  /** Số ngày quá hẹn; mục chưa tới hẹn (đã trả lời hôm nay) là 0. */
  overdueDays: number
  /** Số câu tính điểm còn được hỏi hôm nay. */
  left: number
  /** V11: từ yếu (stability thấp): được ưu tiên trong bài. */
  weak: boolean
}

type ScheduleRow = { stage_number: number; due_at: string; stability: number; learner_vocabulary: { id: string; vocabulary_id: string } }

const SCHEDULE_COLUMNS = 'stage_number, due_at, stability, learner_vocabulary!inner(id, vocabulary_id)'

/** Số câu Stage tính điểm đã trả lời hôm nay, theo `lvId:stage`. */
async function readAnsweredToday(supabase: Supabase, userId: string, stages: readonly ScoredStage[], today: string): Promise<Map<string, number>> {
  const rows = await readAllPages('exercise_logs', (from, to) =>
    supabase
      .from('exercise_logs')
      .select('learner_vocabulary_id, stage_number')
      .eq('user_id', userId)
      .eq('study_date', today)
      .eq('source', 'lesson')
      .in('stage_number', [...stages])
      .order('id')
      .range(from, to),
  )
  const counts = new Map<string, number>()
  for (const r of rows) {
    const key = `${r.learner_vocabulary_id}:${r.stage_number}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export async function readStagePool(supabase: Supabase, userId: string, stages: readonly ScoredStage[], excluded: ReadonlySet<string>, now = new Date()): Promise<StagePoolItem[]> {
  const [due, answered] = await Promise.all([
    readAllPages('learner_stage_schedules', (from, to) =>
      supabase
        .from('learner_stage_schedules')
        .select(SCHEDULE_COLUMNS)
        .eq('user_id', userId)
        .in('stage_number', [...stages])
        .is('completed_at', null)
        .lte('due_at', now.toISOString())
        .order('id')
        .range(from, to),
    ),
    readAnsweredToday(supabase, userId, stages, studyDate(now)),
  ])
  const rows = new Map<string, ScheduleRow>()
  for (const r of due as unknown as ScheduleRow[]) rows.set(`${r.learner_vocabulary.id}:${r.stage_number}`, r)

  // Mục đã trả lời hôm nay nên hẹn đã sang ngày sau, nhưng chưa đủ số câu của ngày
  const missing = [...new Set([...answered.keys()].filter((k) => !rows.has(k)).map((k) => k.split(':')[0]))]
  const later = await readInChunks('learner_stage_schedules', missing, (chunk) =>
    supabase.from('learner_stage_schedules').select(SCHEDULE_COLUMNS).eq('user_id', userId).in('stage_number', [...stages]).is('completed_at', null).in('learner_vocabulary_id', chunk),
  )
  for (const r of later as unknown as ScheduleRow[]) {
    const key = `${r.learner_vocabulary.id}:${r.stage_number}`
    if (answered.has(key) && !rows.has(key)) rows.set(key, r)
  }

  const items: StagePoolItem[] = []
  for (const [key, r] of rows) {
    if (excluded.has(r.learner_vocabulary.vocabulary_id)) continue
    // V11: số câu mỗi ngày theo độ chắc (yếu 3, vừa 2, chắc 1), tính theo stability hiện tại
    const left = stagePerDayFor(r.stability) - (answered.get(key) ?? 0)
    if (left <= 0) continue
    items.push({
      lvId: r.learner_vocabulary.id,
      vocabularyId: r.learner_vocabulary.vocabulary_id,
      stage: r.stage_number as ScoredStage,
      overdueDays: Math.max(0, Math.floor((now.getTime() - Date.parse(r.due_at)) / DAY_MS)),
      left,
      weak: isWeak(r.stability),
    })
  }
  return items
}
