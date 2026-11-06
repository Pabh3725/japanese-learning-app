// Giới hạn từ mới mỗi ngày do người học chỉnh trong Settings. Pure.
import { RULES_V4 } from './rules'

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
  return isValidNewPerDay(stored) ? stored : RULES_V4.defaults.newPerDay
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
  stage_cap: { label: 'Stage questions per day', hint: 'Learn stops for the day at this number.', min: 20, max: 1000 },
  review_cap: { label: 'Cards per day', hint: 'Extra cards move to the next day.', min: 10, max: 500 },
  unlock_threshold: { label: 'Cards before pausing new words', hint: 'New words pause when this many cards are due.', min: 0, max: 500 },
  kanji_new_per_day: { label: 'New Kanji per day', hint: 'Used when the Kanji area opens.', min: 0, max: 50 },
  kanji_cap: { label: 'Kanji questions per day', hint: 'Used when the Kanji area opens.', min: 10, max: 500 },
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
