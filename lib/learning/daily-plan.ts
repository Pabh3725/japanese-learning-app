// R7 — Số lượng cho Bài học hôm nay và mượn quota. docs/learning-rules.md §9.
// Chỉ tính SỐ LƯỢNG; việc chọn card/từ cụ thể thuộc SES-01.

import { RULES_V3 } from './rules'

export interface StudySettings {
  newPerDay: number
  reviewCap: number
  unlockThreshold: number
}

export const DEFAULT_SETTINGS: StudySettings = {
  newPerDay: RULES_V3.defaults.newPerDay,
  reviewCap: RULES_V3.defaults.reviewCap,
  unlockThreshold: RULES_V3.defaults.unlockThreshold,
}

export interface DailyPlanInput {
  /** Số card due chụp lúc dựng bài học lần đầu trong ngày (D). */
  dueSnapshot: number
  /** Số từ mới hôm trước đã mượn của hôm nay. */
  borrowedForToday: number
  settings?: StudySettings
}

export interface DailyPlan {
  reviewCount: number
  /** Card due vượt trần, dời sang ngày sau. */
  reviewDeferred: number
  newWords: number
  newWordsUnlocked: boolean
}

export function planDailyCounts({ dueSnapshot, borrowedForToday, settings = DEFAULT_SETTINGS }: DailyPlanInput): DailyPlan {
  const reviewCount = Math.min(dueSnapshot, settings.reviewCap)
  const newWordsUnlocked = dueSnapshot < settings.unlockThreshold
  return {
    reviewCount,
    reviewDeferred: dueSnapshot - reviewCount,
    newWordsUnlocked,
    newWords: newWordsUnlocked ? Math.max(0, settings.newPerDay - borrowedForToday) : 0,
  }
}

export interface BorrowInput {
  dueSnapshot: number
  /** Số từ đã mượn cho ngày học kế tiếp. */
  alreadyBorrowedForTomorrow: number
  requested: number
  settings?: StudySettings
}

/** "Học thêm": số từ được phép mượn của ngày mai (tối đa trọn quota 1 ngày). */
export function allowedBorrow({
  dueSnapshot,
  alreadyBorrowedForTomorrow,
  requested,
  settings = DEFAULT_SETTINGS,
}: BorrowInput): number {
  if (dueSnapshot >= settings.unlockThreshold) return 0
  const room = settings.newPerDay * RULES_V3.borrow.maxDaysAhead - alreadyBorrowedForTomorrow
  return Math.max(0, Math.min(requested, room))
}
