// VOC-07, VOC-08 — Tách một từ thành mảnh để ghép. Pure.

const KANJI = /[一-鿿㐀-䶿々〆]/

/** Một phần của cách viết: mảnh Kanji phải ghép (null) hoặc kana giữ cố định. 休む → [null, 'む']. */
export type ExpressionPart = string | null

export function expressionTemplate(expression: string): ExpressionPart[] {
  const parts: ExpressionPart[] = []
  for (const char of expression) {
    if (KANJI.test(char)) parts.push(null)
    else if (typeof parts[parts.length - 1] === 'string') parts[parts.length - 1] += char
    else parts.push(char)
  }
  return parts
}

/** Các chữ Kanji của từ, gồm 々. 時々 → ['時', '々']; 休む → ['休']. */
export function kanjiPieces(expression: string): string[] {
  return Array.from(expression).filter((char) => KANJI.test(char))
}

/** HỌC HIỆU → ['HỌC', 'HIỆU']. */
export function hanVietPieces(hanViet: string): string[] {
  return hanViet.trim().split(/\s+/)
}

const MAX_MEANING_PIECES = 6

/**
 * Nghĩa đủ đơn giản để ghép: tối đa 6 chữ, không có `;`, ngoặc, `~`, chữ Nhật.
 * Trả null với nghĩa còn lại, khi đó dùng chọn 1/6. Không tự cắt theo `;` vì một số dấu `;` thay cho `/`.
 */
export function meaningPieces(meaning: string): string[] | null {
  if (/[;()[\]~–\-?.!:぀-ヿ一-鿿]/.test(meaning)) return null
  const pieces = meaning.trim().split(/\s+/)
  return pieces.length >= 1 && pieces.length <= MAX_MEANING_PIECES ? pieces : null
}
