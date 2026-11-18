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
 * Thứ tự học chữ: cấp N5 → N4 → …, trong cấp chữ phổ biến hơn trước, rồi ít nét hơn.
 * Chữ là thành phần của chữ khác thì được đưa lên học ngay trước chữ đó.
 */
export function kanjiOrder(rows: readonly KanjiRow[]): string[] {
  const by = new Map(rows.map((r) => [r.character, r]))
  const sorted = [...rows].sort(
    (a, b) =>
      (b.level ?? 0) - (a.level ?? 0) ||
      (a.freq ?? Number.MAX_SAFE_INTEGER) - (b.freq ?? Number.MAX_SAFE_INTEGER) ||
      (a.strokes ?? 99) - (b.strokes ?? 99) ||
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
  /** JLPT 5 / 4 / …; hàng chờ chỉ dành cho N5–N4. */
  level: number | null
  /** Từ "chỉ Kana" theo chính sách Kanji của từ: không có thẻ Từ vựng Kanji. */
  kanaOnly: boolean
  /** Chữ Kanji trong từ. */
  kanji: readonly string[]
}

export type WordKanjiStatus =
  /** Không có thẻ Từ vựng Kanji. */
  | 'none'
  /** Chưa đủ điều kiện, không thuộc hàng chờ. */
  | 'locked'
  /** Đủ điều kiện mở theo cách thường. */
  | 'open'
  /** Hàng chờ: từ N5–N4 có chữ chưa học; mở khi có điều kiện kích hoạt (`queueTriggered`). */
  | 'queued'

/** Trạng thái mở thẻ Từ vựng Kanji của một từ (§6). */
export function wordKanjiStatus(word: WordRow, kanaProgress: Progress | undefined, kanjiProgress: ReadonlyMap<string, Progress>): WordKanjiStatus {
  if (word.kanaOnly || word.kanji.length === 0) return 'none'
  const kanaReady = pastStage1(kanaProgress)
  const kanjiReady = word.kanji.every((c) => pastStage1(kanjiProgress.get(c)))
  if (kanaReady && kanjiReady) return 'open'
  // Từ N5–N4 có chữ chưa học vào hàng chờ: học thẳng dạng Kanji khi tới lượt, không cần học chữ trước
  if (!kanjiReady && (word.level === 5 || word.level === 4)) return 'queued'
  return 'locked'
}

/**
 * Hàng chờ được mở khi có một trong ba điều (§6): đã học hết từ vựng Kana của cấp, đã học hết Kanji của cấp,
 * hoặc hôm đó không còn từ vựng Kanji nào khác mở được. "Học hết" = mọi mục của cấp đã mở (đã qua Stage 1 trở đi).
 */
export function queueTriggered(state: { kanaAllOpened: boolean; kanjiAllOpened: boolean; otherOpenable: number }): boolean {
  return state.kanaAllOpened || state.kanjiAllOpened || state.otherOpenable === 0
}
