// R2 — Chấm một câu. docs/learning-rules.md §4.

import { EXERCISES, RULES_V4 } from './rules'
import type { ExerciseCode, Outcome, Rating } from './types'

/** R2.1 — Câu học → điểm stage thô (chưa xét giãn cách / trần ngày). */
export function scoreExercise(outcome: Outcome): number {
  return RULES_V4.stagePoints[outcome]
}

/** R9 — Câu Stage → rating cho lịch của Stage. Không có Easy. */
export function stageRating(outcome: Outcome): Exclude<Rating, 'Easy'> {
  if (outcome === 'wrong') return 'Again'
  return outcome === 'hint' ? 'Hard' : 'Good'
}

export interface ReviewAnswer {
  outcome: Outcome
  exercise: ExerciseCode
  /** Thời gian từ lúc câu hiện ra tới lúc nộp. */
  responseMs: number
}

/** R2.2 — Câu review → rating FSRS và điểm card. */
export function scoreReview(answer: ReviewAnswer): { rating: Rating; cardPoints: number } {
  const rating = reviewRating(answer)
  return { rating, cardPoints: RULES_V4.review.cardPoints[rating] }
}

function reviewRating({ outcome, exercise, responseMs }: ReviewAnswer): Rating {
  if (outcome === 'wrong') return 'Again'
  if (outcome === 'hint') return 'Hard'
  const { kind } = EXERCISES[exercise]
  const fast = responseMs < RULES_V4.review.easyMaxMs
  // Dạng chọn (trắc nghiệm, câu nghe) tối đa Good
  if (fast && RULES_V4.review.easyKinds.includes(kind)) return 'Easy'
  return 'Good'
}

/** R2.3 — Câu practice → điểm card thô (chưa xét trần practice). */
export function scorePractice(outcome: Outcome): number {
  return RULES_V4.practice.cardPoints[outcome]
}
