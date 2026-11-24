// V12: nhịp học tự nhập từng khu (chủ dự án chốt 2026-11-24, thay cho cân bằng) — đề xuất số chữ / từ Kanji mỗi ngày
// để xong cùng lúc với từ vựng Kana, và ước tính bao lâu nữa xong từ vựng của cấp. Pure (dùng được ở trình duyệt).
import type { Zone } from './card-types'

/** Số ngày để mục mới cuối cùng xong Intro (Intro 1 → 2 → 3 mỗi Intro một ngày khi trả lời đúng). */
export const INTRO_DAYS = 3

export interface PaceInput {
  /** Số mục chưa mở của cấp đang học, theo khu. */
  remaining: Record<Zone, number>
  /** Số mục mới mỗi ngày người học đặt, theo khu. */
  perDay: Record<Zone, number>
  /** Thời gian học ước tính của một mục, theo khu (giây, gồm Intro và các lần ôn đầu). */
  seconds: Record<Zone, number>
}

export interface PaceEstimate {
  /** Đề xuất số mục mới mỗi ngày của khu Kanji và Từ vựng Kanji để xong cùng ngày với Kana; null khi Kana đặt 0 hoặc đã hết. */
  suggest: { kanji: number | null; word_kanji: number | null }
  /** Số ngày tới khi mở hết mục của từng khu; null khi khu còn mục nhưng đặt 0 mục mỗi ngày. */
  days: Record<Zone, number | null>
  /** Số ngày tới khi xong hết từ vựng của cấp (mục cuối cùng xong Intro); null khi có khu dừng mà còn mục. */
  total: number | null
  /** Phút học mỗi ngày khi đã đều đặn. */
  minutes: number
}

const daysFor = (remaining: number, perDay: number): number | null => (remaining <= 0 ? 0 : perDay > 0 ? Math.ceil(remaining / perDay) : null)

export function paceEstimate({ remaining, perDay, seconds }: PaceInput): PaceEstimate {
  const days: Record<Zone, number | null> = {
    kana: daysFor(remaining.kana, perDay.kana),
    kanji: daysFor(remaining.kanji, perDay.kanji),
    word_kanji: daysFor(remaining.word_kanji, perDay.word_kanji),
  }
  const kanaDays = days.kana && days.kana > 0 ? days.kana : null
  const suggestFor = (z: 'kanji' | 'word_kanji') => (kanaDays === null ? null : remaining[z] > 0 ? Math.ceil(remaining[z] / kanaDays) : 0)
  const all = Object.values(days)
  const total = all.some((d) => d === null) ? null : Math.max(...(all as number[])) + (all.some((d) => (d as number) > 0) ? INTRO_DAYS : 0)
  const minutes = Math.round((perDay.kana * seconds.kana + perDay.kanji * seconds.kanji + perDay.word_kanji * seconds.word_kanji) / 60)
  return { suggest: { kanji: suggestFor('kanji'), word_kanji: suggestFor('word_kanji') }, days, total, minutes }
}
