// V12: nhịp học tự nhập từng khu (chủ dự án chốt 2026-11-24, thay cho cân bằng) — đề xuất số chữ / từ Kanji mỗi ngày
// để xong cùng lúc với từ vựng Kana, và ước tính bao lâu nữa xong từ vựng của cấp. Pure (dùng được ở trình duyệt).
import type { Zone } from './card-types'

/** Số ngày để mục mới cuối cùng xong Intro: Intro 1 + 2 ngày đầu, Intro 3 ngày sau (2026-11-26). */
export const INTRO_DAYS = 2

/**
 * Một từ Kanji chưa mở của cấp đang học, để ước tính ngày sớm nhất mở được (2026-11-26):
 * Kana của từ phải qua Intro 1, mọi chữ phải học xong.
 */
export interface WordKanjiPace {
  /** Từ N5 (5) được ưu tiên trước từ N4 (4). */
  level: number
  /** Thuộc cấp đang học của khu (chỉ những từ này tính vào ngày xong). */
  current: boolean
  /** Thứ tự (từ 0) của từ trong hàng chờ mở của khu Kana; null khi Kana của từ đã mở. */
  kanaRank: number | null
  /** Kana đã mở nhưng chưa qua Intro 1: còn chừng này ngày. */
  kanaDays: number
  /** Thứ tự lớn nhất (từ 0) trong hàng chờ mở của khu Kanji của các chữ chưa mở; null khi mọi chữ đã mở. */
  kanjiRank: number | null
  /** Chữ đã mở nhưng chưa học xong: còn chừng này ngày (lớn nhất). */
  kanjiDays: number
}

export interface PaceInput {
  /** Số mục chưa mở của cấp đang học, theo khu. */
  remaining: Record<Zone, number>
  /** Số mục mới mỗi ngày người học đặt, theo khu. */
  perDay: Record<Zone, number>
  /** Thời gian học ước tính của một mục, theo khu (giây, gồm Intro và các lần ôn đầu). */
  seconds: Record<Zone, number>
  /** Từ Kanji chưa mở: có thì số ngày của khu Từ Kanji tính theo ngày sớm nhất mở được của từng từ. */
  wordKanji?: readonly WordKanjiPace[]
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

/** Chữ mở ngày d thì học xong (có Card) vào ngày d + 2: Intro 1 + 2 ngày đầu, Intro 3 ngày sau. */
const KANJI_LEARNED_AFTER = 2

/**
 * Số ngày tới khi mở hết từ Kanji của cấp đang học: mỗi ngày mở tối đa `perDay` từ trong số từ đã đủ điều kiện
 * (từ N5 trước), ngày thiếu thì thôi, không bù. null khi có từ không bao giờ đủ điều kiện (khu Kana / Kanji đặt 0) hoặc đặt 0.
 */
export function wordKanjiDays(words: readonly WordKanjiPace[], perDay: Record<Zone, number>): number | null {
  const current = words.filter((w) => w.current).length
  if (current === 0) return 0
  if (perDay.word_kanji <= 0) return null
  // Ngày sớm nhất mở được: kế hoạch mở mục mới chạy đầu ngày, nên từ đủ điều kiện hôm nay thì mở từ ngày hôm sau
  const ready = words.map((w) => {
    const kana = w.kanaRank === null ? w.kanaDays : perDay.kana > 0 ? Math.floor(w.kanaRank / perDay.kana) : Infinity
    const kanji = Math.max(w.kanjiDays, w.kanjiRank === null ? 0 : perDay.kanji > 0 ? Math.floor(w.kanjiRank / perDay.kanji) + KANJI_LEARNED_AFTER : Infinity)
    return { w, day: Math.max(kana, kanji) + 1 }
  })
  if (ready.some((r) => r.w.current && r.day === Infinity)) return null
  const queue = ready.filter((r) => r.day !== Infinity).sort((a, b) => a.day - b.day)
  // Hai hàng chờ theo cấp (N5 trước N4), lấy từ đầu hàng: mỗi ngày O(số từ mở), chạy được nhiều lần khi người học đang gõ
  const waiting: Record<number, typeof queue> = { 5: [], 4: [] }
  const head: Record<number, number> = { 5: 0, 4: 0 }
  const size = (lv: number) => waiting[lv].length - head[lv]
  let left = current
  let next = 0
  for (let day = 0; left > 0; day++) {
    while (next < queue.length && queue[next].day <= day) {
      const r = queue[next++]
      waiting[r.w.level === 5 ? 5 : 4].push(r)
    }
    for (let n = 0; n < perDay.word_kanji; n++) {
      const lv = size(5) > 0 ? 5 : size(4) > 0 ? 4 : null
      if (lv === null) break
      if (waiting[lv][head[lv]++].w.current) left--
    }
    if (left === 0) return day + 1
    if (size(5) + size(4) === 0 && next < queue.length) day = Math.max(day, queue[next].day - 1)
  }
  return 0
}

export function paceEstimate({ remaining, perDay, seconds, wordKanji }: PaceInput): PaceEstimate {
  const days: Record<Zone, number | null> = {
    kana: daysFor(remaining.kana, perDay.kana),
    kanji: daysFor(remaining.kanji, perDay.kanji),
    word_kanji: wordKanji ? wordKanjiDays(wordKanji, perDay) : daysFor(remaining.word_kanji, perDay.word_kanji),
  }
  const kanaDays = days.kana && days.kana > 0 ? days.kana : null
  const suggestKanji = kanaDays === null ? null : remaining.kanji > 0 ? Math.ceil(remaining.kanji / kanaDays) : 0
  // Từ Kanji: số nhỏ nhất mỗi ngày để mở hết không muộn hơn Kana (khi đã tính ngày từ đủ điều kiện), không quá 50
  const suggestWords = (): number | null => {
    if (kanaDays === null) return null
    if (remaining.word_kanji === 0) return 0
    if (!wordKanji) return Math.ceil(remaining.word_kanji / kanaDays)
    for (let n = 1; n <= 50; n++) {
      const d = wordKanjiDays(wordKanji, { ...perDay, word_kanji: n })
      if (d !== null && d <= kanaDays) return n
    }
    return null
  }
  const all = Object.values(days)
  const total = all.some((d) => d === null) ? null : Math.max(...(all as number[])) + (all.some((d) => (d as number) > 0) ? INTRO_DAYS : 0)
  const minutes = Math.round((perDay.kana * seconds.kana + perDay.kanji * seconds.kanji + perDay.word_kanji * seconds.word_kanji) / 60)
  return { suggest: { kanji: suggestKanji, word_kanji: suggestWords() }, days, total, minutes }
}
