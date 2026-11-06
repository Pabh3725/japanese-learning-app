// Giới hạn từ mới mỗi ngày do người học chỉnh trong Settings. Pure.
import { RULES_V4 } from './rules'

export const NEW_PER_DAY_OPTIONS = [3, 5, 8, 12, 20] as const
const MIN_NEW_PER_DAY = 1
const MAX_NEW_PER_DAY = 100

/** Không tin trình duyệt: chỉ nhận số nguyên trong khoảng cho phép. */
export function isValidNewPerDay(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_NEW_PER_DAY && (value as number) <= MAX_NEW_PER_DAY
}

/** Giá trị trong database có thể null với tài khoản cũ. */
export function newPerDayOf(stored: number | null | undefined): number {
  return isValidNewPerDay(stored) ? stored : RULES_V4.defaults.newPerDay
}

/** Số từ mới còn được học hôm nay. */
export function remainingNewToday(limit: number, metToday: number): number {
  return Math.max(0, limit - metToday)
}
