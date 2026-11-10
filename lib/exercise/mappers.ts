// VOC-04, SCH-01 — Đổi dữ liệu qua lại giữa database và engine luật học (lib/learning).
// Pure: không gọi database, không đọc giờ hệ thống. lib/dal/exercise.ts dùng các hàm này.
// Cùng khuôn với lib/srs/mappers.ts (SRS-03).

import { EXERCISES } from '../learning/rules'
import {
  allowedExercises,
  VOCABULARY_STAGES,
  type StageAttempt,
  type StageAttemptResult,
  type StageState,
} from '../learning/stage'
import { firstDueAt } from '../learning/cards'
import { studyDate } from '../learning/time'
import type { ExerciseCode, Outcome, ScoredStage, StudyDate } from '../learning/types'
import type { Schedule, ScheduleState } from '../srs/scheduler'

// ---------------------------------------------------------------------------
// 1. Kiểm tra dữ liệu trình duyệt gửi lên — KHÔNG tin trình duyệt
// ---------------------------------------------------------------------------

/** Những gì trình duyệt được phép gửi. Điểm, stage, card… server tự tính. */
export interface SubmitExerciseRequest {
  learnerVocabularyId: string
  /** Stage của câu này: một dạng bài có thể thuộc nhiều stage (hanviet_from_kana ở Stage 2 và 5). */
  stage: ScoredStage
  /** Mã riêng cho MỖI lần bấm (crypto.randomUUID()). Gửi lại → cùng mã. */
  clientEventId: string
  exercise: ExerciseCode
  outcome: Outcome
  /** Vị trí câu trong ngày học (không tính câu vòng boss). SES-01 sẽ cấp. */
  daySeq: number
  responseMs?: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OUTCOMES: readonly Outcome[] = ['correct', 'hint', 'wrong']
const SCORED_STAGES: readonly number[] = [2, 3, 5, 6]

/** Dữ liệu lạ / thiếu / sai kiểu → null. */
export function parseSubmitExerciseRequest(input: unknown): SubmitExerciseRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const v = input as Record<string, unknown>

  const ok =
    typeof v.learnerVocabularyId === 'string' && UUID.test(v.learnerVocabularyId) &&
    typeof v.stage === 'number' && SCORED_STAGES.includes(v.stage) &&
    typeof v.clientEventId === 'string' && UUID.test(v.clientEventId) &&
    typeof v.exercise === 'string' && Object.hasOwn(EXERCISES, v.exercise) &&
    typeof v.outcome === 'string' && (OUTCOMES as readonly string[]).includes(v.outcome) &&
    Number.isInteger(v.daySeq) && (v.daySeq as number) >= 1 &&
    (v.responseMs === undefined || (typeof v.responseMs === 'number' && Number.isFinite(v.responseMs) && v.responseMs >= 0))
  if (!ok) return null

  return {
    learnerVocabularyId: v.learnerVocabularyId as string,
    stage: v.stage as ScoredStage,
    clientEventId: v.clientEventId as string,
    exercise: v.exercise as ExerciseCode,
    outcome: v.outcome as Outcome,
    daySeq: v.daySeq as number,
    responseMs: v.responseMs as number | undefined,
  }
}

// ---------------------------------------------------------------------------
// 2. Database → trạng thái của engine và lịch
// ---------------------------------------------------------------------------

/** Một dòng learner_stage_schedules như Supabase trả về (timestamp là chuỗi ISO). */
export interface StageScheduleRow {
  id: string
  stage_number: number
  state: number
  due_at: string
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  last_review_at: string | null
  stage_points: number
  stage_points_today: number
  points_date: string | null
  unlocked_next_at: string | null
  completed_at: string | null
  version: number
}

/** Phần StageState không nằm trong dòng lịch — suy ra từ nhật ký. */
export interface StageContext {
  earned: readonly ExerciseCode[]
  lastSeq: number | null
  lastSeqDate: StudyDate | null
  correctStreak: number
}

export function rowToStageState(row: StageScheduleRow, ctx: StageContext): StageState | null {
  if (!SCORED_STAGES.includes(row.stage_number)) return null
  return {
    stage: row.stage_number as ScoredStage,
    points: row.stage_points,
    plusToday: row.stage_points_today,
    plusDate: row.points_date,
    earned: ctx.earned,
    unlockedNext: row.unlocked_next_at !== null,
    lastSeq: ctx.lastSeq,
    lastSeqDate: ctx.lastSeqDate,
    correctStreak: ctx.correctStreak,
  }
}

export function rowToSchedule(row: StageScheduleRow): Schedule {
  return {
    state: row.state as ScheduleState,
    due: new Date(row.due_at),
    stability: row.stability,
    difficulty: row.difficulty,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    lastReviewAt: row.last_review_at ? new Date(row.last_review_at) : null,
  }
}

/**
 * Q1 — "Dạng bài đã được +1 ở stage này" suy ra từ exercise_logs của stage đó.
 */
export function deriveEarned(logs: readonly { exercise_type: string; points: number }[]): ExerciseCode[] {
  const out: ExerciseCode[] = []
  for (const log of logs) {
    if (log.points <= 0 || !Object.hasOwn(EXERCISES, log.exercise_type)) continue
    const code = log.exercise_type as ExerciseCode
    if (!out.includes(code)) out.push(code)
  }
  return out
}

/**
 * Q3 — Câu gần nhất của từ HÔM NAY trong khu Learn, ở bất kỳ stage nào.
 * `seqs` là day_seq của các câu hôm nay (đã lọc theo ngày ở query); null = câu cũ chưa có day_seq.
 */
export function deriveLastSeq(seqs: readonly (number | null)[], today: StudyDate): Pick<StageContext, 'lastSeq' | 'lastSeqDate'> {
  const known = seqs.filter((s): s is number => typeof s === 'number')
  if (known.length === 0) return { lastSeq: null, lastSeqDate: null }
  return { lastSeq: Math.max(...known), lastSeqDate: today }
}

/** Dạng bài này có hợp lệ với stage của từ không. */
export function canAnswer(state: StageState, exercise: ExerciseCode): boolean {
  return allowedExercises(state.stage).includes(exercise)
}

// ---------------------------------------------------------------------------
// 3. Kết quả engine → tham số hàm Postgres public.submit_stage_exercise
// ---------------------------------------------------------------------------

export interface SubmitStageExerciseInput {
  scheduleId: string
  clientEventId: string
  /** version của dòng lịch lúc server đọc (chống ghi đè giữa 2 thiết bị). */
  expectedVersion: number
  attempt: StageAttempt
  result: StageAttemptResult
  /** Lịch mới của stage, do lib/srs/stage-scheduler tính. */
  schedule: Schedule
  responseMs?: number
}

export function toSubmitStageExerciseParams({
  scheduleId,
  clientEventId,
  expectedVersion,
  attempt,
  result,
  schedule,
  responseMs,
}: SubmitStageExerciseInput) {
  const s = result.state
  const hasCards = result.cardsCreated.length > 0
  return {
    p_schedule_id: scheduleId,
    p_client_event_id: clientEventId,
    p_expected_version: expectedVersion,
    p_answered_at: attempt.now.toISOString(),
    // nhật ký
    p_exercise_type: attempt.exercise,
    p_outcome: attempt.outcome,
    p_points: result.delta,
    p_counted: result.counted,
    p_study_date: studyDate(attempt.now),
    p_day_seq: attempt.seq,
    p_response_time_ms: responseMs === undefined ? null : Math.round(responseMs),
    // điểm của stage
    p_stage_points: s.points,
    p_stage_points_today: s.plusToday,
    p_points_date: s.plusDate,
    // lịch của stage
    p_state: schedule.state,
    p_due_at: schedule.due.toISOString(),
    p_stability: schedule.stability,
    p_difficulty: schedule.difficulty,
    p_scheduled_days: schedule.scheduledDays,
    p_learning_steps: schedule.learningSteps,
    p_reps: schedule.reps,
    p_lapses: schedule.lapses,
    p_last_review_at: schedule.lastReviewAt?.toISOString() ?? null,
    // mở stage sau: Stage 3 và 6 cần tạo lịch ở đây
    p_unlocked_stage: result.unlockedStage,
    p_open_schedule: result.unlockedStage === 3 || result.unlockedStage === 6,
    // hoàn tất stage
    p_completed: result.completed,
    p_required_stages: [...VOCABULARY_STAGES],
    // card mới — hạn đầu: 00:00 (giờ VN) ngày học hôm sau (R5)
    p_new_card_types: result.cardsCreated,
    p_new_cards_due_at: hasCards ? firstDueAt(attempt.now).toISOString() : null,
  }
}

export type SubmitExerciseStatus = 'saved' | 'duplicate' | 'conflict' | 'not_found' | 'stage_changed'

const STATUSES: readonly SubmitExerciseStatus[] = ['saved', 'duplicate', 'conflict', 'not_found', 'stage_changed']

/** Đọc kết quả jsonb của submit_stage_exercise. Lạ → báo lỗi (không đoán). */
export function parseSubmitExerciseResult(data: unknown): SubmitExerciseStatus {
  const status = (data as { status?: unknown } | null)?.status
  const found = STATUSES.find((s) => s === status)
  if (!found) throw new Error(`submit_stage_exercise trả về kết quả lạ: ${JSON.stringify(data)}`)
  return found
}
