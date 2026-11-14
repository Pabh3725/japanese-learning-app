// V11 — Tỷ lệ nhớ thật (true retention) để so với mục tiêu của FSRS. Pure.
// Chỉ tính lần ôn của Card đã ở giai đoạn ôn (Review): không tính lần ôn đầu của Card mới, các bước học lại trong ngày,
// hay câu hỏi lại trong cùng lượt sau khi sai. Mỗi Card mỗi ngày chỉ tính lần ôn đầu.

export type RetentionArea = 'vocabulary' | 'kanji_words' | 'kanji'

export interface RetentionEntry {
  area: RetentionArea
  cardId: string
  date: string
  /** Thời điểm, để lấy lần ôn đầu trong ngày. */
  at: string
  recalled: boolean
}

export interface RetentionRate {
  /** null khi chưa có lần ôn nào. */
  rate: number | null
  count: number
}

export interface RetentionStats {
  overall: RetentionRate
  byArea: Record<RetentionArea, RetentionRate>
}

/** Mục tiêu nhớ của FSRS (request_retention mặc định của ts-fsrs). */
export const TARGET_RETENTION = 0.9

const rateOf = (items: readonly RetentionEntry[]): RetentionRate => ({ rate: items.length > 0 ? items.filter((e) => e.recalled).length / items.length : null, count: items.length })

export function computeRetention(entries: readonly RetentionEntry[]): RetentionStats {
  // Lần ôn đầu của mỗi Card trong mỗi ngày
  const first = new Map<string, RetentionEntry>()
  for (const e of entries) {
    const key = `${e.cardId}:${e.date}`
    const cur = first.get(key)
    if (!cur || e.at < cur.at) first.set(key, e)
  }
  const list = [...first.values()]
  return {
    overall: rateOf(list),
    byArea: {
      vocabulary: rateOf(list.filter((e) => e.area === 'vocabulary')),
      kanji_words: rateOf(list.filter((e) => e.area === 'kanji_words')),
      kanji: rateOf(list.filter((e) => e.area === 'kanji')),
    },
  }
}
