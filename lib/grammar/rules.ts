// Grammar — luật Học, Ôn, mở bài. Pure. Luật: docs/grammar-rules.md (GRAMMAR_V1).
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs'
import { firstDueAt } from '../learning/cards'
import { nextStudyDayStart, studyDate } from '../learning/time'
import type { Outcome, StudyDate } from '../learning/types'
import { capInterval, fromFsrs, toFsrs, type Schedule } from '../srs/scheduler'
import { EXERCISE_TIER, type GrammarExercise } from './types'

export const GRAMMAR_V1 = {
  lessons: 50,
  unlock: { vocabStage3Share: 0.5, previousLessonDoneShare: 0.5 },
  newPerDay: { default: 1, min: 1, max: 3 },
  learning: {
    completeAt: 40,
    questionsPerSitting: 8,
    maxPositivePerDay: 8,
    wrong: -2,
    /** Ngày của 5 buổi (ngày 1 là ngày xem thẻ): 1, 2, 3, 5, 8 → khoảng cách 1, 1, 2, 3. */
    sittingGaps: [1, 1, 2, 3],
    tiers: { 1: 0, 2: 15, 3: 30 },
    minCorrectPerTier: 3,
    minDistinctTypes: 8,
    correctStreak: 3,
  },
  review: { maxPerDay: 20, minPerDay: 5, capMax: 50, questionsPerPoint: [2, 3] as const, maxIntervalDays: 90 },
  pick: { currentTierWeight: 1.5, weakTypeWeight: 1.5, weakTypeErrorRate: 0.3, weakWindow: 10, sentenceCooldownDays: 7 },
} as const

const DAY_MS = 86_400_000

export type Tier = 1 | 2 | 3

/** Bậc theo điểm: G1 Hiểu 0–14, G2 Dùng 15–29, G3 Tạo 30–40. */
export function tierOf(points: number): Tier {
  const { tiers } = GRAMMAR_V1.learning
  return points >= tiers[3] ? 3 : points >= tiers[2] ? 2 : 1
}

/** Dạng được hỏi ở bậc (gồm dạng của bậc dưới). */
export function exercisesUpTo(tier: Tier, available: readonly GrammarExercise[]): GrammarExercise[] {
  return available.filter((e) => EXERCISE_TIER[e] <= tier)
}

export interface GrammarLearningState {
  points: number
  pointsToday: number
  pointsDate: StudyDate | null
}

/** Một câu Học đã trả lời, đọc từ nhật ký. */
export interface LearningLog {
  exercise: GrammarExercise
  tier: Tier
  outcome: Outcome
}

export interface LearningResult {
  state: GrammarLearningState
  delta: number
}

/** Đúng +1 (tối đa +8 mỗi mẫu mỗi ngày); đúng nhờ gợi ý 0; sai −2, không dưới 0. */
export function applyLearningAnswer(state: GrammarLearningState, outcome: Outcome, now: Date): LearningResult {
  const today = studyDate(now)
  const plusToday = state.pointsDate === today ? state.pointsToday : 0
  const { maxPositivePerDay, wrong } = GRAMMAR_V1.learning
  const raw = outcome === 'correct' ? 1 : outcome === 'wrong' ? wrong : 0
  const gain = raw > 0 && plusToday >= maxPositivePerDay ? 0 : raw
  const points = Math.max(0, state.points + gain)
  return { state: { points, pointsToday: gain > 0 ? plusToday + 1 : plusToday, pointsDate: today }, delta: points - state.points }
}

/**
 * Học xong (§6.4): đủ 40 điểm, đúng ≥ 3 câu mỗi bậc, đúng ≥ 8 dạng khác nhau (hoặc mọi dạng mẫu có nếu ít hơn 8),
 * và 3 câu đúng liên tiếp. `logs`: mới nhất trước, đã gồm câu vừa trả lời.
 */
export function canComplete(points: number, logs: readonly LearningLog[], availableTypes: number): boolean {
  const { completeAt, minCorrectPerTier, minDistinctTypes, correctStreak } = GRAMMAR_V1.learning
  if (points < completeAt) return false
  const correct = logs.filter((l) => l.outcome === 'correct')
  for (const tier of [1, 2, 3] as const) if (correct.filter((l) => l.tier === tier).length < minCorrectPerTier) return false
  if (new Set(correct.map((l) => l.exercise)).size < Math.min(minDistinctTypes, availableTypes)) return false
  const streak = logs.findIndex((l) => l.outcome !== 'correct')
  return (streak === -1 ? logs.length : streak) >= correctStreak
}

/** Buổi kế tiếp, 00:00 giờ VN. `sittingsDone`: số buổi đã làm, tính cả buổi vừa xong. Quá 5 buổi thì mỗi ngày một buổi. */
export function nextSittingAt(now: Date, sittingsDone: number): { due: Date; days: number } {
  const days = GRAMMAR_V1.learning.sittingGaps[sittingsDone - 1] ?? 1
  return { due: new Date(nextStudyDayStart(now).getTime() + (days - 1) * DAY_MS), days }
}

// ---------------------------------------------------------------------------
// Ôn (§7): Card FSRS mỗi mẫu, tối đa 90 ngày, không có Easy
// ---------------------------------------------------------------------------

const maxDays = GRAMMAR_V1.review.maxIntervalDays
const withFuzz = fsrs(generatorParameters({ enable_fuzz: true, maximum_interval: maxDays }))
const noFuzz = fsrs(generatorParameters({ enable_fuzz: false, maximum_interval: maxDays }))

export type GrammarRating = 'Good' | 'Hard' | 'Again'

/** Gộp kết quả các câu của một mẫu trong lượt ôn: đúng hết Good; sai 1 câu (chưa tới một nửa) Hard; sai ≥ một nửa Again. */
export function reviewRating(outcomes: readonly Outcome[]): GrammarRating {
  const wrong = outcomes.filter((o) => o !== 'correct').length
  if (wrong === 0) return 'Good'
  return wrong * 2 >= outcomes.length ? 'Again' : 'Hard'
}

export function newReviewSchedule(now: Date): Schedule {
  return { ...fromFsrs(createEmptyCard(now)), due: firstDueAt(now), lastReviewAt: null }
}

export function nextReviewSchedule(schedule: Schedule, rating: GrammarRating, now: Date, fuzz = true): Schedule {
  const grade = { Good: Rating.Good, Hard: Rating.Hard, Again: Rating.Again }[rating]
  return capInterval(fromFsrs((fuzz ? withFuzz : noFuzz).next(toFsrs(schedule), now, grade).card), now, maxDays)
}

/** Số câu của một mẫu trong lượt ôn: 3 khi mẫu làm được đủ dạng "dùng/tạo", không thì 2. */
export function reviewQuestionCount(rng: () => number): 2 | 3 {
  return rng() < 0.5 ? 2 : 3
}

// ---------------------------------------------------------------------------
// Mở bài (§3)
// ---------------------------------------------------------------------------

export interface LessonUnlockInput {
  /** Từ của bài n không bị loại: tổng và số đã xong Stage 3 (từ đã biết tính là xong). */
  vocabTotal: number
  vocabDone: number
  /** Mẫu đã duyệt của bài n−1: tổng và số đã học xong. Bài 1: 0 / 0. */
  previousTotal: number
  previousDone: number
}

export interface LessonUnlock {
  open: boolean
  /** Còn thiếu bao nhiêu từ xong Stage 3, bao nhiêu mẫu bài trước. */
  vocabMissing: number
  previousMissing: number
}

export function lessonUnlock(input: LessonUnlockInput): LessonUnlock {
  const { vocabStage3Share, previousLessonDoneShare } = GRAMMAR_V1.unlock
  const vocabNeed = Math.ceil(input.vocabTotal * vocabStage3Share)
  const prevNeed = Math.ceil(input.previousTotal * previousLessonDoneShare)
  const vocabMissing = Math.max(0, vocabNeed - input.vocabDone)
  const previousMissing = Math.max(0, prevNeed - input.previousDone)
  return { open: vocabMissing === 0 && previousMissing === 0, vocabMissing, previousMissing }
}
