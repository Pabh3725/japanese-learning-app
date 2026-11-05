// R5, R6 — Card: hạn đầu tiên, điểm card, bỏ card giàn giáo. docs/learning-rules.md §7, §8.

import { RULES_V3 } from './rules'
import { scorePractice, scoreReview, type ReviewAnswer } from './scoring'
import { nextStudyDayStart, studyDate } from './time'
import type { CardStatus, CardType, Outcome, Rating, StudyDate } from './types'

/** Phần điểm/trạng thái của một card (lịch FSRS do ts-fsrs quản lý riêng). */
export interface CardPointsState {
  type: CardType
  /** Từ của card là từ chỉ có Kana. */
  wordIsKanaOnly: boolean
  status: CardStatus
  /** Có thể âm. */
  points: number
  practicePlusToday: number
  practiceDate: StudyDate | null
}

export function newCardState(type: CardType, wordIsKanaOnly: boolean): CardPointsState {
  return { type, wordIsKanaOnly, status: 'active', points: 0, practicePlusToday: 0, practiceDate: null }
}

/** Card mới được ôn lần đầu lúc 00:00 (giờ VN) ngày học hôm sau. */
export function firstDueAt(createdAt: Date): Date {
  return nextStudyDayStart(createdAt)
}

/** R6 — Card giàn giáo đã đủ điểm để bỏ chưa. */
export function shouldRetire(card: Pick<CardPointsState, 'type' | 'points' | 'wordIsKanaOnly'>): boolean {
  if (card.type === 'vocab.meaning_kana' && card.wordIsKanaOnly) return false
  const threshold = RULES_V3.retireAt[card.type]
  return threshold !== undefined && card.points >= threshold
}

export interface CardPointsResult {
  card: CardPointsState
  delta: number
  retiredNow: boolean
}

/** Áp kết quả một câu review vào điểm card. */
export function applyReviewToCard(
  card: CardPointsState,
  answer: ReviewAnswer,
): CardPointsResult & { rating: Rating } {
  const { rating, cardPoints } = scoreReview(answer)
  return { ...applyDelta(card, cardPoints, card), rating }
}

/** Áp kết quả một câu practice (Luyện tập, vòng boss): trần +3 điểm mỗi card mỗi ngày. */
export function applyPracticeToCard(card: CardPointsState, outcome: Outcome, now: Date): CardPointsResult {
  const today = studyDate(now)
  const plusToday = card.practiceDate === today ? card.practicePlusToday : 0
  const raw = scorePractice(outcome)
  const delta = raw > 0 && plusToday >= RULES_V3.practice.maxPositivePerCardPerDay ? 0 : raw
  const withDay: CardPointsState = {
    ...card,
    practiceDate: today,
    practicePlusToday: delta > 0 ? plusToday + 1 : plusToday,
  }
  return applyDelta(card, delta, withDay)
}

function applyDelta(original: CardPointsState, delta: number, base: CardPointsState): CardPointsResult {
  // Card không active (bỏ hoặc tạm ngưng) thì không cộng điểm
  if (original.status !== 'active') return { card: original, delta: 0, retiredNow: false }
  const updated: CardPointsState = { ...base, points: base.points + delta }
  if (shouldRetire(updated)) {
    return { card: { ...updated, status: 'retired' }, delta, retiredNow: true }
  }
  return { card: updated, delta, retiredNow: false }
}
