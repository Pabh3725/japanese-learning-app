// V12 — Thứ tự mở chữ Kanji mới (docs/learning-rules.md §0d, chủ dự án duyệt 2026-11-14). Pure.
// 1. Chữ cần sớm cho từ vựng trước, theo mức: 1 = trong từ đang ở giai đoạn Kanji (Stage 4–6), 2 = trong từ đã xong Stage 3
//    đang chờ vào giai đoạn Kanji, 3 = trong từ đang học Kana (Stage 1–3), 4 = còn lại. Chỉ tính từ được học dạng Kanji.
// 2. Cùng mức: ít nét trước; còn bằng thì giữ thứ tự cũ (study_order: chữ gặp sớm trong lộ trình từ vựng trước).
// 3. Thành phần trước chữ ghép: chữ sắp mở có thành phần cũng là chữ đang chờ mở thì mở thành phần đó trước.

export type NeedTier = 1 | 2 | 3 | 4

export interface NewKanjiCandidate {
  id: string
  character: string
  /** null khi chưa có dữ liệu nét: xếp sau chữ có số nét. */
  strokes: number | null
  /** Thứ tự cũ (study_order). */
  studyOrder: number
}

export function orderNewKanji<T extends NewKanjiCandidate>(
  candidates: readonly T[],
  tierOf: (kanjiId: string) => NeedTier,
  componentsOf: (character: string) => readonly string[],
): T[] {
  const sorted = [...candidates].sort(
    (a, b) => tierOf(a.id) - tierOf(b.id) || (a.strokes ?? Number.MAX_SAFE_INTEGER) - (b.strokes ?? Number.MAX_SAFE_INTEGER) || a.studyOrder - b.studyOrder,
  )
  const byChar = new Map(sorted.map((c) => [c.character, c]))
  const out: T[] = []
  const placed = new Set<string>()
  const place = (c: T, path: Set<string>) => {
    if (placed.has(c.character) || path.has(c.character)) return
    path.add(c.character)
    // Thành phần là chữ đang chờ mở: mở trước (thành phần của thành phần cũng vậy)
    for (const part of componentsOf(c.character)) {
      const comp = byChar.get(part)
      if (comp && comp.character !== c.character) place(comp, path)
    }
    path.delete(c.character)
    if (placed.has(c.character)) return
    placed.add(c.character)
    out.push(c)
  }
  for (const c of sorted) place(c, new Set())
  return out
}
