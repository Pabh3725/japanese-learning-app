// Đáp án nhiễu của câu trắc nghiệm Kanji chỉ lấy từ chữ đã học (chủ dự án 2026-11-12): nếu lẫn chữ lạ,
// chữ quen duy nhất trong các lựa chọn gần như luôn là đáp án. Thiếu chữ đã học thì bù bằng chữ sắp học cùng cấp.
import type { Rng } from '../exercise/questions'
import type { KanjiRow } from './questions'

/** Bậc ưu tiên của một chữ khi làm đáp án nhiễu: số nhỏ được lấy trước. */
export type KanjiTier = (kanji: Pick<KanjiRow, 'id'>) => number

export const TIER_LEARNED = 0
const TIER_UPCOMING = 1
const TIER_OTHER = 2
/** Chữ sắp học chia nhóm 10 theo thứ tự học: nhóm gần được lấy trước, trong nhóm thì ngẫu nhiên. */
const UPCOMING_GROUP = 10

/**
 * - 0: đã học (đã xem thẻ giới thiệu, hoặc đã đánh dấu đã biết).
 * - 1.xxx: chưa học, cùng cấp JLPT đang học, chữ sắp học trước.
 * - 2: còn lại (chỉ dùng khi hai bậc trên không đủ).
 * `all` theo thứ tự học (kanji.study_order).
 */
export function kanjiTier(all: readonly Pick<KanjiRow, 'id' | 'jlpt_level'>[], learned: ReadonlySet<string>, level: number): KanjiTier {
  const upcoming = new Map<string, number>()
  for (const kanji of all) {
    if (!learned.has(kanji.id) && (kanji.jlpt_level ?? 1) === level) upcoming.set(kanji.id, upcoming.size)
  }
  return (kanji) => {
    if (learned.has(kanji.id)) return TIER_LEARNED
    const index = upcoming.get(kanji.id)
    return index === undefined ? TIER_OTHER : TIER_UPCOMING + Math.floor(index / UPCOMING_GROUP) / 10_000
  }
}

/** Xếp theo bậc, cùng bậc thì ngẫu nhiên. Mọi phần tử cùng bậc thì kết quả là một lần xáo trộn. */
export function rankByTier<T>(items: readonly T[], tierOf: (item: T) => number, rng: Rng): T[] {
  return items
    .map((item) => ({ item, tier: tierOf(item), r: rng() }))
    .sort((a, b) => a.tier - b.tier || a.r - b.r)
    .map((o) => o.item)
}
