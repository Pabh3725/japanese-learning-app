// V9 R12 — Kanji trực quan: kiểu dữ liệu hiển thị và các câu hỗ trợ (không điểm, không lịch). Pure.
// Dữ liệu: KanjiVG (Ulrich Apel, CC BY-SA 3.0) qua pnpm kanji:visual và pnpm seed.

export interface KanjiPart {
  c: string
  original?: string
  pos?: string
  radical?: boolean
  parts?: KanjiPart[]
}

export interface KanjiVisualView {
  /** Bộ thủ: chữ bộ, số Khang Hy, tên tiếng Việt khi đã duyệt. */
  radical: { character: string; number: number; name: string | null } | null
  parts: KanjiPart[]
  /** Nét viết SVG theo thứ tự, hệ toạ độ 109 × 109. */
  strokes: string[]
}

export const KANJIVG_CREDIT = 'Stroke order and components: KanjiVG by Ulrich Apel, CC BY-SA 3.0'
