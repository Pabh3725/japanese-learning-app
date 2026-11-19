// Cân bằng mẫu ngữ pháp mới (chủ dự án chốt 2026-11-19, docs/grammar-rules.md §3a). Pure.
// Grammar có mục tiêu riêng: số phút mỗi ngày hoặc ngày hoàn thành cấp. Tính lại mỗi ngày trên số mẫu còn lại thật.
import { addStudyDays } from '../learning/time'
import type { StudyDate } from '../learning/types'
import { GRAMMAR_V1 } from './rules'

export type GrammarBalanceTarget = { kind: 'minutes'; minutes: number } | { kind: 'date'; date: StudyDate }

export interface GrammarBalance {
  /** Mẫu mới hôm nay (0 khi hết mẫu của cấp; còn mẫu thì 1–10). */
  perDay: number
  /** Số ngày còn lại tới lúc xong cấp (kể cả hôm nay). */
  days: number
  finishDate: StudyDate
}

/** Thời gian ước tính cho một mẫu mới: các buổi Học cộng các lần ôn đầu (PROPOSED, chỉnh khi có số liệu thật). */
export function secondsPerPattern(): number {
  const { questionsPerSitting, sittingGaps } = GRAMMAR_V1.learning
  const { secondsPerQuestion, reviewQuestionsPerPattern } = GRAMMAR_V1.balance
  return (questionsPerSitting * (sittingGaps.length + 1) + reviewQuestionsPerPattern) * secondsPerQuestion
}

/** "Xong trước ngày" chỉ dùng khi có ngày và ngày chưa qua; ngày đã qua hoặc chưa chọn thì dùng số phút. */
export function grammarBalanceTarget(kind: 'minutes' | 'date', date: StudyDate | null, minutes: number, today: StudyDate): GrammarBalanceTarget {
  return kind === 'date' && date !== null && date >= today ? { kind: 'date', date } : { kind: 'minutes', minutes }
}

function daysInclusive(from: StudyDate, to: StudyDate): number {
  let n = 1
  for (let d = from; d < to && n < 5000; d = addStudyDays(d, 1)) n++
  return n
}

/** Số thứ tự ngày (tính từ 1970-01-01) của một ngày học. */
const dayNumber = (d: StudyDate) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000)

/**
 * Số mẫu mới hôm nay để xong `remaining` mẫu của cấp theo mục tiêu.
 * - Số phút: tốc độ r = phút × 60 / thời gian một mẫu; hôm nay mở ⌊r·(k+1)⌋ − ⌊r·k⌋ mẫu (k = số thứ tự ngày),
 *   nên trung bình đúng r mà không cần lưu phần lẻ (ví dụ r = 1,2 → 1, 1, 1, 1, 2).
 * - Ngày hoàn thành: chia đều số còn lại cho số ngày còn lại (tính lại mỗi ngày, ngày cuối mở hết).
 * Luôn trong khoảng 1–10 khi còn mẫu.
 */
export function grammarBalance(remaining: number, target: GrammarBalanceTarget, today: StudyDate): GrammarBalance {
  const { min, max } = GRAMMAR_V1.newPerDay
  if (remaining <= 0) return { perDay: 0, days: 0, finishDate: today }
  let perDay: number
  let days: number
  if (target.kind === 'date') {
    days = daysInclusive(today, target.date)
    perDay = remaining - Math.floor((remaining * (days - 1)) / days)
  } else {
    const rate = (Math.max(1, target.minutes) * 60) / secondsPerPattern()
    const k = dayNumber(today)
    perDay = Math.floor(rate * (k + 1)) - Math.floor(rate * k)
    days = Math.ceil(remaining / Math.min(max, Math.max(min, rate)))
  }
  perDay = Math.min(max, Math.max(min, perDay), remaining)
  return { perDay, days, finishDate: addStudyDays(today, days - 1) }
}
