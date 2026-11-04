// SRS-03 — Đổi dữ liệu qua lại giữa database và bộ tính lịch (lib/srs/scheduler).
// Pure: không gọi database. lib/dal/review.ts dùng các hàm này.

import type { CardStatus, CardType } from '../learning/types'
import type { ReviewAnswer } from '../learning/scoring'
import type { ReviewCard, ReviewResult, ScheduleState } from './scheduler'

const CARD_TYPES: readonly CardType[] = [
  'vocab.meaning_kana',
  'vocab.kana_hanviet',
  'vocab.meaning_kanji',
  'vocab.kanji_meaning_hanviet',
  'vocab.meaning_hanviet',
]

/** Một dòng review_cards như Supabase trả về (timestamp là chuỗi ISO). */
export interface ReviewCardRow {
  id: string
  card_type: string | null
  state: number
  due_at: string
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  last_review_at: string | null
  card_points: number
  retired_at: string | null
  practice_points_today: number
  practice_points_date: string | null
  version: number
}

export interface CardContext {
  /** Từ của card là từ chỉ có Kana (vocabularies.is_kana_only). */
  isKanaOnly: boolean
  /** Từ đang bị loại khỏi lộ trình (R8) → card tạm dừng. */
  excluded: boolean
}

/** Dòng database → card của bộ tính lịch. Dòng cũ thiếu card_type hoặc sai dạng → null. */
export function rowToReviewCard(row: ReviewCardRow, ctx: CardContext): ReviewCard | null {
  const type = CARD_TYPES.find((t) => t === row.card_type)
  if (!type || row.state < 0 || row.state > 3) return null

  const status: CardStatus = row.retired_at ? 'retired' : ctx.excluded ? 'suspended' : 'active'
  return {
    points: {
      type,
      wordIsKanaOnly: ctx.isKanaOnly,
      status,
      points: row.card_points,
      practicePlusToday: row.practice_points_today,
      practiceDate: row.practice_points_date,
    },
    schedule: {
      state: row.state as ScheduleState,
      due: new Date(row.due_at),
      stability: row.stability,
      difficulty: row.difficulty,
      scheduledDays: row.scheduled_days,
      learningSteps: row.learning_steps,
      reps: row.reps,
      lapses: row.lapses,
      lastReviewAt: row.last_review_at ? new Date(row.last_review_at) : null,
    },
  }
}

export interface SubmitReviewInput {
  cardId: string
  clientEventId: string
  /** version của card lúc server đọc (chống ghi đè giữa 2 thiết bị). */
  expectedVersion: number
  answer: ReviewAnswer
  result: ReviewResult
  studyDate?: string | null
  daySeq?: number | null
}

/** Kết quả bộ tính lịch → tham số của hàm Postgres public.submit_review. */
export function toSubmitReviewParams({ cardId, clientEventId, expectedVersion, answer, result, studyDate, daySeq }: SubmitReviewInput) {
  const { card, log } = result
  const s = card.schedule
  return {
    p_review_card_id: cardId,
    p_client_event_id: clientEventId,
    p_expected_version: expectedVersion,
    p_reviewed_at: log.reviewedAt.toISOString(),
    p_state: s.state,
    p_due_at: s.due.toISOString(),
    p_stability: s.stability,
    p_difficulty: s.difficulty,
    p_scheduled_days: s.scheduledDays,
    p_learning_steps: s.learningSteps,
    p_reps: s.reps,
    p_lapses: s.lapses,
    p_card_points: card.points.points,
    p_retire: card.points.status === 'retired',
    p_rating: log.ratingNumber,
    p_card_points_delta: log.cardPointsDelta,
    p_state_before: log.stateBefore,
    p_due_before: log.dueBefore.toISOString(),
    p_exercise_type: answer.exercise,
    p_response_time_ms: Math.max(0, Math.round(answer.responseMs)),
    p_study_date: studyDate ?? null,
    p_day_seq: daySeq ?? null,
  }
}

export type SubmitReviewStatus = 'saved' | 'duplicate' | 'conflict' | 'not_found' | 'not_active'

const STATUSES: readonly SubmitReviewStatus[] = ['saved', 'duplicate', 'conflict', 'not_found', 'not_active']

/** Đọc kết quả jsonb của submit_review. Lạ → báo lỗi (không đoán). */
export function parseSubmitReviewResult(data: unknown): SubmitReviewStatus {
  const status = (data as { status?: unknown } | null)?.status
  const found = STATUSES.find((s) => s === status)
  if (!found) throw new Error(`submit_review trả về kết quả lạ: ${JSON.stringify(data)}`)
  return found
}
