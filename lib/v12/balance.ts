// V12 §8: tự cân bằng số mục mới mỗi ngày theo thời gian học — ba khu xong cùng ngày, theo từng cấp. Pure.
import { addStudyDays } from '../learning/time'
import type { StudyDate } from '../learning/types'
import { kindOf, lastStage, reviewCardsFor, typesFor, type Area, type Stage, type Zone } from './card-types'
import { passPoints } from './stage'
import { RULES_V12 } from './rules'

/**
 * §8.1: thời gian ước tính (giây) của một mục = thẻ giới thiệu + số câu tối thiểu qua các Stage (mỗi loại thẻ đủ điểm,
 * trả lời đúng hết) + số lần ôn Card trong 60 ngày đầu. Chữ Kanji tính không có loại thẻ phân biệt chữ giống nhau.
 */
export function estimatedSeconds(area: Area): number {
  const { intro, choice, typing, card } = RULES_V12.seconds
  let total = intro
  for (let s = 1 as Stage; s <= lastStage(area); s = (s + 1) as Stage) {
    for (const t of typesFor(area, s)) total += passPoints(s) * (kindOf(t) === 'typing' ? typing : choice)
  }
  return total + reviewCardsFor(area).length * RULES_V12.reviewsPerCard * card
}

/**
 * §8.1: sau 14 ngày học, thay ước tính bằng thời gian thật: nhân ước tính với tỷ lệ
 * (tổng thời gian trả lời thật / tổng thời gian ước tính của chính các câu đó). Chưa đủ dữ liệu thì giữ ước tính.
 */
export function calibratedSeconds(area: Area, stats: { studyDays: number; realMs: number; estimatedSeconds: number } | null): number {
  const base = estimatedSeconds(area)
  if (!stats || stats.studyDays < RULES_V12.realTimeAfterDays || stats.estimatedSeconds <= 0 || stats.realMs <= 0) return base
  return base * (stats.realMs / 1000 / stats.estimatedSeconds)
}

export interface Remaining {
  /** Số mục chưa mở của cấp hiện tại, theo loại mục. */
  kana: number
  radical: number
  kanji: number
  word_kanji: number
}

export type BalanceTarget = { kind: 'date'; date: StudyDate } | { kind: 'minutes'; minutes: number }

/**
 * Mục tiêu cân bằng từ Settings. "Xong trước ngày" chỉ dùng khi đã có ngày và ngày đó chưa qua; ngày đã qua hoặc chưa chọn
 * thì dùng số phút mỗi ngày — để không bao giờ dồn toàn bộ mục còn lại vào một ngày (Settings chỉ cho chọn từ ngày mai).
 */
export function balanceTarget(kind: 'minutes' | 'date', date: StudyDate | null, minutes: number, today: StudyDate): BalanceTarget {
  return kind === 'date' && date !== null && date >= today ? { kind: 'date', date } : { kind: 'minutes', minutes }
}

export interface BalanceResult {
  /** Số ngày còn lại tới lúc xong cấp (kể cả hôm nay). */
  days: number
  /** Ngày dự kiến xong cấp. */
  finishDate: StudyDate
  /** Số mục mới hôm nay của từng loại mục (bộ thủ học trước chữ trong khu Kanji). */
  today: Record<keyof Remaining, number>
  /** Phần lẻ cộng dồn sang ngày mai, theo loại mục. */
  carry: Record<keyof Remaining, number>
  /** Số phút ước tính cho mục mới hôm nay, theo khu. */
  minutes: Record<Zone, number>
}

const AREAS: readonly (keyof Remaining)[] = ['kana', 'radical', 'kanji', 'word_kanji']

/** Số ngày từ `from` tới `to`, tính cả hai đầu. */
function daysInclusive(from: StudyDate, to: StudyDate): number {
  let n = 1
  for (let d = from; d < to && n < 5000; d = addStudyDays(d, 1)) n++
  return n
}

/**
 * §8.2: mỗi loại mục mở (còn lại / N) mục mỗi ngày, N là số ngày còn lại — nên ba khu hết cùng ngày; phần lẻ cộng dồn.
 * Gọi lại mỗi ngày với số còn lại thật (khu chậm sẽ tự được tăng chỉ tiêu).
 * Khu Kanji: bộ thủ học trước chữ — chỉ tiêu (theo thời gian) của khu dùng cho bộ thủ tới khi hết bộ, phần còn lại cho chữ.
 */
export function balance(
  remaining: Remaining,
  target: BalanceTarget,
  todayDate: StudyDate,
  seconds: Record<Area, number> = { kana: estimatedSeconds('kana'), radical: estimatedSeconds('radical'), kanji: estimatedSeconds('kanji'), word_kanji: estimatedSeconds('word_kanji') },
  carryIn: Partial<Record<keyof Remaining, number>> = {},
  paused: Partial<Record<Zone, boolean>> = {},
): BalanceResult {
  // Khu người học tự dừng (chủ dự án chốt 2026-11-19): không mở mục mới, thời gian của khu chia cho các khu còn chạy —
  // tính như thể khu dừng không còn mục nào; phần lẻ cộng dồn của khu dừng giữ nguyên tới khi bật lại.
  const all = remaining
  remaining = {
    kana: paused.kana ? 0 : all.kana,
    radical: paused.kanji ? 0 : all.radical,
    kanji: paused.kanji ? 0 : all.kanji,
    word_kanji: paused.word_kanji ? 0 : all.word_kanji,
  }
  const totalSeconds = AREAS.reduce((s, a) => s + remaining[a] * seconds[a], 0)
  const days = Math.max(
    1,
    target.kind === 'date' ? daysInclusive(todayDate, target.date) : Math.ceil(totalSeconds / (Math.max(1, target.minutes) * 60)),
  )
  const today = { kana: 0, radical: 0, kanji: 0, word_kanji: 0 }
  const carry = { kana: 0, radical: 0, kanji: 0, word_kanji: 0 }
  const share = (a: keyof Remaining, exact: number) => {
    const withCarry = exact + (carryIn[a] ?? 0)
    // Tránh sai số dấu phẩy động khi tổng phần lẻ vừa tròn
    const whole = Math.min(remaining[a], Math.floor(withCarry + 1e-9))
    today[a] = whole
    carry[a] = remaining[a] - whole > 0 ? Math.max(0, withCarry - whole) : all[a] > 0 && remaining[a] === 0 ? (carryIn[a] ?? 0) : 0
  }
  share('kana', remaining.kana / days)
  share('word_kanji', remaining.word_kanji / days)
  // Khu Kanji: chỉ tiêu theo thời gian của cả khu, bộ thủ dùng trước
  const zoneSecondsToday = (remaining.radical * seconds.radical + remaining.kanji * seconds.kanji) / days
  const radicalExact = Math.min(remaining.radical, zoneSecondsToday / seconds.radical)
  share('radical', radicalExact)
  const leftForKanji = Math.max(0, zoneSecondsToday - today.radical * seconds.radical)
  share('kanji', remaining.radical - today.radical > 0 ? 0 : leftForKanji / seconds.kanji)
  const minutes = {
    kana: (today.kana * seconds.kana) / 60,
    kanji: (today.radical * seconds.radical + today.kanji * seconds.kanji) / 60,
    word_kanji: (today.word_kanji * seconds.word_kanji) / 60,
  }
  return { days, finishDate: addStudyDays(todayDate, days - 1), today, carry, minutes }
}
