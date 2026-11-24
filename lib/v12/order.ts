// V12 §5–6: thứ tự mở bộ thủ / chữ Kanji, điều kiện mở chữ và Từ vựng Kanji, hàng chờ. Pure.
import type { Stage } from './card-types'
import { RULES_V12 } from './rules'

/** Stage của một mục với người học: chưa mở, Stage 1–3, hoặc đã có Card. */
export type Progress = 'none' | Stage | 'review'

/** Đã qua Stage 1 (đang Stage 2 trở lên hoặc đã có Card). */
export const pastStage1 = (p: Progress | undefined) => p === 2 || p === 3 || p === 'review'

// ---------------------------------------------------------------------------
// Bộ thủ (§5.1)
// ---------------------------------------------------------------------------

export interface RadicalRow {
  number: number
  /** Số chữ N5–N4 có bộ này (radical_meanings.csv). */
  n5n4Kanji: number
}

/** Bộ trong phạm vi học (≥ 2 chữ N5–N4), bộ có trong nhiều chữ hơn học trước. */
export function radicalOrder(rows: readonly RadicalRow[]): number[] {
  return rows
    .filter((r) => r.n5n4Kanji >= RULES_V12.radicals.minKanji)
    .sort((a, b) => b.n5n4Kanji - a.n5n4Kanji || a.number - b.number)
    .map((r) => r.number)
}

// ---------------------------------------------------------------------------
// Chữ Kanji (§5.2)
// ---------------------------------------------------------------------------

export interface KanjiRow {
  character: string
  /** JLPT 5 → 1; null xếp sau cùng. */
  level: number | null
  /** Hạng tần suất (1 phổ biến nhất); null xếp cuối cấp. */
  freq: number | null
  strokes: number | null
  /** Chữ Kanji là thành phần của chữ này (để học thành phần trước). */
  components: readonly string[]
  /** Số các bộ thủ có trong chữ. */
  radicals: readonly number[]
}

/**
 * Thứ tự học chữ: dễ → khó (chủ dự án chốt 2026-11-24) — cấp N5 → N4 → …, trong cấp chữ ít nét hơn trước,
 * cùng số nét thì chữ phổ biến hơn trước. Chữ là thành phần của chữ khác thì được đưa lên học ngay trước chữ đó.
 */
export function kanjiOrder(rows: readonly KanjiRow[]): string[] {
  const by = new Map(rows.map((r) => [r.character, r]))
  const sorted = [...rows].sort(
    (a, b) =>
      (b.level ?? 0) - (a.level ?? 0) ||
      (a.strokes ?? 99) - (b.strokes ?? 99) ||
      (a.freq ?? Number.MAX_SAFE_INTEGER) - (b.freq ?? Number.MAX_SAFE_INTEGER) ||
      a.character.localeCompare(b.character),
  )
  const out: string[] = []
  const placed = new Set<string>()
  const visiting = new Set<string>()
  const put = (c: string) => {
    if (placed.has(c) || visiting.has(c)) return
    visiting.add(c)
    for (const part of by.get(c)?.components ?? []) if (by.has(part)) put(part)
    visiting.delete(c)
    placed.add(c)
    out.push(c)
  }
  for (const r of sorted) put(r.character)
  return out
}

/** Chữ chỉ mở khi mọi bộ thủ **trong phạm vi học** của nó đã qua Stage 1 (§5.2). Bộ ngoài phạm vi không chặn. */
export function canOpenKanji(kanji: Pick<KanjiRow, 'radicals'>, inScope: ReadonlySet<number>, radicalProgress: ReadonlyMap<number, Progress>): boolean {
  return kanji.radicals.filter((n) => inScope.has(n)).every((n) => pastStage1(radicalProgress.get(n)))
}

// ---------------------------------------------------------------------------
// Từ vựng Kanji (§6)
// ---------------------------------------------------------------------------

export interface WordRow {
  id: string
  /** JLPT 5 / 4 / … của từ. */
  level: number | null
  /** Từ "chỉ Kana" theo chính sách Kanji của từ: không có thẻ Từ vựng Kanji. */
  kanaOnly: boolean
  /** Chữ Kanji trong từ. */
  kanji: readonly string[]
}

export type WordKanjiStatus =
  /** Không có thẻ Từ vựng Kanji. */
  | 'none'
  /** Chưa đủ điều kiện. */
  | 'locked'
  /** Đủ điều kiện mở. */
  | 'open'

/**
 * Trạng thái mở thẻ Từ vựng Kanji của một từ (§6, chủ dự án chốt 2026-11-24): từ vựng Kana của từ đã vào Stage 2 trở đi,
 * **và mọi chữ Kanji của từ đã học xong ở khu Kanji** (xong Intro, có Card, hoặc đã đánh dấu "đã biết").
 * Không còn hàng chờ: từ có chữ chưa học thì chờ tới khi chữ được học theo thứ tự của khu Kanji.
 */
export function wordKanjiStatus(word: WordRow, kanaProgress: Progress | undefined, kanjiProgress: ReadonlyMap<string, Progress>): WordKanjiStatus {
  if (word.kanaOnly || word.kanji.length === 0) return 'none'
  return pastStage1(kanaProgress) && word.kanji.every((c) => kanjiProgress.get(c) === 'review') ? 'open' : 'locked'
}

/**
 * Card Từ vựng Kanji đang chờ chữ (chủ dự án chốt 2026-11-24, phương án b): Card chuyển từ bản cũ hoặc mở trước luật trên
 * có chữ chưa học xong thì tạm không vào lượt ôn (giữ nguyên lịch FSRS) cho tới khi mọi chữ của từ học xong.
 * `kanjiProgress` chỉ gồm chữ học được ở khu Kanji (N5–N4); chữ ngoài phạm vi không chặn.
 */
export function wordKanjiWaiting(kanji: readonly string[], kanjiProgress: ReadonlyMap<string, Progress>): boolean {
  return kanji.some((c) => kanjiProgress.has(c) && kanjiProgress.get(c) !== 'review')
}
