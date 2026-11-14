// V11 — Thứ tự Card trong một lượt Review (docs/learning-rules.md §0c). Pure.
// 1. Card dễ quên nhất trước: xác suất nhớ của FSRS chỉ phụ thuộc tỉ lệ (số ngày đã qua ÷ stability), tỉ lệ càng lớn càng dễ quên.
//    Card chưa ôn lần nào (stability 0) xếp sau Card đã ôn.
// 2. Card riêng của từ có sao xếp sau Card thường (giữ luật cũ).
// 3. Hai Card của cùng một từ không đứng gần nhau (cách ít nhất SAME_WORD_GAP Card) khi còn cách khác.

export interface OrderableCard {
  id: string
  vocabularyId: string
  isStar: boolean
  stability: number
  lastReviewAt: string | null
}

export const SAME_WORD_GAP = 3
const DAY_MS = 86_400_000

/** Mức dễ quên: số ngày đã qua ÷ stability. -1 với Card chưa ôn lần nào. */
export function forgetRisk(card: Pick<OrderableCard, 'stability' | 'lastReviewAt'>, now: Date): number {
  if (!card.lastReviewAt || card.stability <= 0) return -1
  return Math.max(0, now.getTime() - Date.parse(card.lastReviewAt)) / DAY_MS / card.stability
}

/** Đổi chỗ tối thiểu để hai Card cùng từ cách nhau ít nhất `gap` Card. */
export function spreadSameWord<T extends Pick<OrderableCard, 'vocabularyId'>>(cards: readonly T[], gap = SAME_WORD_GAP): T[] {
  const rest = [...cards]
  const out: T[] = []
  while (rest.length > 0) {
    const recent = new Set(out.slice(-gap).map((c) => c.vocabularyId))
    const i = rest.findIndex((c) => !recent.has(c.vocabularyId))
    out.push(rest.splice(i === -1 ? 0 : i, 1)[0])
  }
  return out
}

export function orderReviewCards<T extends OrderableCard>(cards: readonly T[], now: Date): T[] {
  const risk = new Map(cards.map((c) => [c.id, forgetRisk(c, now)]))
  const sorted = [...cards].sort((a, b) => Number(a.isStar) - Number(b.isStar) || risk.get(b.id)! - risk.get(a.id)! || a.id.localeCompare(b.id))
  return spreadSameWord(sorted)
}
