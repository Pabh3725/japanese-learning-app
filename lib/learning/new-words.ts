// Giới hạn từ mới mỗi ngày do người học chỉnh trong Settings. Pure.
import { RULES_V9 } from './rules'

export const MIN_NEW_PER_DAY = 1
export const MAX_NEW_PER_DAY = 50

/** Không tin trình duyệt: chỉ nhận số nguyên trong khoảng cho phép. */
export function isValidNewPerDay(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_NEW_PER_DAY && (value as number) <= MAX_NEW_PER_DAY
}

/** Giá trị trong database có thể null với tài khoản cũ. */
export function newPerDayOf(stored: number | null | undefined): number {
  // Tài khoản từng đặt trên mức mới thì hạ về mức tối đa, không rơi về mặc định
  if (Number.isInteger(stored) && (stored as number) > MAX_NEW_PER_DAY) return MAX_NEW_PER_DAY
  return isValidNewPerDay(stored) ? stored : RULES_V9.defaults.newPerDay
}

/** Số từ mới đã gặp hôm nay. Từ đã đánh dấu là đã biết không tính vào chỉ tiêu trong ngày. */
export function countMetToday(
  started: readonly { vocabulary_id: string; created_at: string }[],
  excludedIds: ReadonlySet<string>,
  startOfToday: string,
): number {
  return started.filter((r) => r.created_at >= startOfToday && !excludedIds.has(r.vocabulary_id)).length
}

/** Số từ mới còn được học hôm nay. */
export function remainingNewToday(limit: number, metToday: number): number {
  return Math.max(0, limit - metToday)
}

/** Các giới hạn khối lượng trong Settings. Khoảng cho phép: docs/PROJECT_SPEC.md §18.5. */
export const STUDY_LIMITS = {
  lesson_size: { label: 'Questions per lesson', hint: 'Each Learn lesson has this many questions, including quick checks.', min: 20, max: 100 },
  learn_cap: { label: 'Learn questions per day', hint: 'Shared by Vocabulary, Kanji words and Kanji learning. Quick checks and Kanji cards do not count.', min: 20, max: 1000 },
  review_cap: { label: 'Vocabulary cards per day', hint: 'Review · Vocabulary. Extra cards move to the next day.', min: 10, max: 500 },
  word_kanji_review_cap: { label: 'Kanji word cards per day', hint: 'Review · Kanji words. Extra cards move to the next day.', min: 10, max: 500 },
  unlock_threshold: { label: 'Cards before pausing new words', hint: 'New words pause when this many cards are due.', min: 0, max: 500 },
  kanji_new_per_day: { label: 'New Kanji per day', hint: 'Counts Kanji already opened today. New ones pause when questions need the room.', min: 0, max: 50 },
  kanji_cap: { label: 'Kanji learning questions per day', hint: 'Questions for Kanji still in the Learning stage (4 sittings). Counts toward Learn questions per day. New Kanji pause when they need the room.', min: 10, max: 500 },
  kanji_review_cap: { label: 'Kanji cards per day', hint: 'Review cards for Kanji you have finished learning, shown in Learn lessons. Do not count toward Learn questions per day. Extra cards move to the next day.', min: 10, max: 500 },
  grammar_new_per_day: { label: 'New grammar patterns per day', hint: 'Each new pattern is practiced in 5 sittings over 8 days.', min: 1, max: 10 },
  grammar_review_cap: { label: 'Grammar patterns to review per day', hint: 'Each pattern due gets 2–3 questions. Extra patterns move to the next day.', min: 5, max: 50 },
} as const

export type StudyLimitKey = keyof typeof STUDY_LIMITS

export function isValidStudyLimit(key: unknown, value: unknown): key is StudyLimitKey {
  if (typeof key !== 'string' || !Object.hasOwn(STUDY_LIMITS, key) || !Number.isInteger(value)) return false
  const { min, max } = STUDY_LIMITS[key as StudyLimitKey]
  return (value as number) >= min && (value as number) <= max
}

/** Số từ mới của hôm nay: giới hạn, trừ phần hôm qua đã mượn, cộng phần hôm nay mượn của ngày mai. */
export function newWordsForToday(newPerDay: number, borrowedForToday: number, borrowedForNext: number): number {
  return Math.max(0, newPerDay - borrowedForToday) + borrowedForNext
}
