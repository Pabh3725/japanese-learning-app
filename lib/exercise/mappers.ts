// VOC-04 — Đổi dữ liệu qua lại giữa database và engine luật học (lib/learning, ENG-02).
// Pure: không gọi database, không đọc giờ hệ thống. lib/dal/exercise.ts dùng các hàm này.
// Cùng khuôn với lib/srs/mappers.ts (SRS-03).

import { EXERCISES } from '../learning/rules'
import { allowedExercises, type StageAttempt, type StageAttemptResult, type WordState } from '../learning/stage'
import { firstDueAt } from '../learning/cards'
import { studyDate } from '../learning/time'
import type { ExerciseCode, Outcome, Stage, StudyDate } from '../learning/types'

// ---------------------------------------------------------------------------
// 1. Kiểm tra dữ liệu trình duyệt gửi lên — KHÔNG tin trình duyệt
// ---------------------------------------------------------------------------

/** Những gì trình duyệt được phép gửi. Điểm, stage, card… server tự tính. */
export interface SubmitExerciseRequest {
  learnerVocabularyId: string
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

/** Dữ liệu lạ / thiếu / sai kiểu → null. */
export function parseSubmitExerciseRequest(input: unknown): SubmitExerciseRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const v = input as Record<string, unknown>

  const ok =
    typeof v.learnerVocabularyId === 'string' && UUID.test(v.learnerVocabularyId) &&
    typeof v.clientEventId === 'string' && UUID.test(v.clientEventId) &&
    typeof v.exercise === 'string' && Object.hasOwn(EXERCISES, v.exercise) &&
    typeof v.outcome === 'string' && (OUTCOMES as readonly string[]).includes(v.outcome) &&
    Number.isInteger(v.daySeq) && (v.daySeq as number) >= 1 &&
    (v.responseMs === undefined || (typeof v.responseMs === 'number' && Number.isFinite(v.responseMs) && v.responseMs >= 0))
  if (!ok) return null

  return {
    learnerVocabularyId: v.learnerVocabularyId as string,
    clientEventId: v.clientEventId as string,
    exercise: v.exercise as ExerciseCode,
    outcome: v.outcome as Outcome,
    daySeq: v.daySeq as number,
    responseMs: v.responseMs as number | undefined,
  }
}

// ---------------------------------------------------------------------------
// 2. Database → WordState (đầu vào của engine)
// ---------------------------------------------------------------------------

/** Một dòng learner_vocabulary như Supabase trả về. */
export interface LearnerVocabularyRow {
  id: string
  current_stage: number
  learning_status: string
  stage_points: number
  stage_points_today: number
  points_date: string | null
  version: number
}

/** Phần WordState không nằm trong learner_vocabulary — suy ra từ nhật ký. */
export interface WordContext {
  isKanaOnly: boolean
  earned: readonly ExerciseCode[]
  lastSeq: number | null
  lastSeqDate: StudyDate | null
}

export function rowToWordState(row: LearnerVocabularyRow, ctx: WordContext): WordState | null {
  if (row.learning_status === 'initial_complete') {
    return { ...baseState(row, ctx), stage: 'complete' }
  }
  if (row.learning_status !== 'learning') return null
  if (![1, 2, 3, 4, 5].includes(row.current_stage)) return null
  return { ...baseState(row, ctx), stage: row.current_stage as Stage }
}

function baseState(row: LearnerVocabularyRow, ctx: WordContext) {
  return {
    isKanaOnly: ctx.isKanaOnly,
    points: row.stage_points,
    plusToday: row.stage_points_today,
    plusDate: row.points_date,
    earned: ctx.earned,
    lastSeq: ctx.lastSeq,
    lastSeqDate: ctx.lastSeqDate,
  }
}

/**
 * Q1 — "Dạng bài đã được +1 ở stage hiện tại" suy ra từ exercise_logs của stage đó.
 * Một từ không bao giờ quay lại stage cũ nên lọc theo stage_number là đủ.
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
 * Q3 — Câu gần nhất của từ HÔM NAY, tính cả câu học lẫn câu review.
 * `seqs` là day_seq của các câu hôm nay (đã lọc theo ngày ở query); null = câu cũ chưa có day_seq.
 */
export function deriveLastSeq(seqs: readonly (number | null)[], today: StudyDate): Pick<WordContext, 'lastSeq' | 'lastSeqDate'> {
  const known = seqs.filter((s): s is number => typeof s === 'number')
  if (known.length === 0) return { lastSeq: null, lastSeqDate: null }
  return { lastSeq: Math.max(...known), lastSeqDate: today }
}

/** Dạng bài này có hợp lệ với trạng thái hiện tại của từ không. */
export function canAnswer(state: WordState, exercise: ExerciseCode): boolean {
  const { stage } = state
  if (stage !== 2 && stage !== 4 && stage !== 5) return false
  return allowedExercises(stage, state.isKanaOnly).includes(exercise)
}

// ---------------------------------------------------------------------------
// 3. Kết quả engine → tham số hàm Postgres public.submit_exercise
// ---------------------------------------------------------------------------

export interface SubmitExerciseInput {
  learnerVocabularyId: string
  clientEventId: string
  /** version của learner_vocabulary lúc server đọc (chống ghi đè giữa 2 thiết bị). */
  expectedVersion: number
  /** Stage của từ LÚC trả lời. */
  stageBefore: 2 | 4 | 5
  attempt: StageAttempt
  result: StageAttemptResult
  responseMs?: number
}

export function toSubmitExerciseParams({
  learnerVocabularyId,
  clientEventId,
  expectedVersion,
  stageBefore,
  attempt,
  result,
  responseMs,
}: SubmitExerciseInput) {
  const s = result.state
  const completed = s.stage === 'complete'
  const hasCards = result.cardsCreated.length > 0
  return {
    p_learner_vocabulary_id: learnerVocabularyId,
    p_client_event_id: clientEventId,
    p_expected_version: expectedVersion,
    p_answered_at: attempt.now.toISOString(),
    // nhật ký
    p_stage_number: stageBefore,
    p_exercise_type: attempt.exercise,
    p_outcome: attempt.outcome,
    p_points: result.delta,
    p_counted: result.counted,
    p_study_date: studyDate(attempt.now),
    p_day_seq: attempt.seq,
    // trạng thái mới
    p_new_stage: s.stage === 'complete' ? 5 : s.stage,
    p_completed: completed,
    p_stage_points: s.points,
    p_stage_points_today: s.plusToday,
    p_points_date: s.plusDate,
    // card mới — hạn đầu: 00:00 (giờ VN) ngày học hôm sau (R5)
    p_new_card_types: result.cardsCreated,
    p_new_cards_due_at: hasCards ? firstDueAt(attempt.now).toISOString() : null,
    p_response_time_ms: responseMs === undefined ? null : Math.round(responseMs),
  }
}

export type SubmitExerciseStatus = 'saved' | 'duplicate' | 'conflict' | 'not_found' | 'stage_changed'

const STATUSES: readonly SubmitExerciseStatus[] = ['saved', 'duplicate', 'conflict', 'not_found', 'stage_changed']

/** Đọc kết quả jsonb của submit_exercise. Lạ → báo lỗi (không đoán). */
export function parseSubmitExerciseResult(data: unknown): SubmitExerciseStatus {
  const status = (data as { status?: unknown } | null)?.status
  const found = STATUSES.find((s) => s === status)
  if (!found) throw new Error(`submit_exercise trả về kết quả lạ: ${JSON.stringify(data)}`)
  return found
}
