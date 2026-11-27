// Grammar V3 — đổi chữ của câu hỏi (ngân hàng V3 lưu dạng chữ) thành mảnh có cách đọc để hiện furigana. Pure.
import type { GrammarPiece } from '../types'

const KANJI = /[一-鿿㐀-䶿々〆]/
export const BLANK_MARK = '（＿＿）'

/** Mảnh hiển thị; blank = ô trống của câu hỏi. */
export interface V3Piece extends GrammarPiece {
  blank?: true
}

/** Từ điển chữ → cách đọc, lấy từ các mảnh có Kanji của câu gốc (và câu hỏi đi trước) cùng mẫu. */
export function readingDict(sentences: readonly { pieces: readonly GrammarPiece[]; prompt?: { pieces: readonly GrammarPiece[] } }[]): Map<string, string> {
  const dict = new Map<string, string>()
  for (const s of sentences) {
    for (const p of [...s.pieces, ...(s.prompt?.pieces ?? [])]) if (p.r && KANJI.test(p.t) && !dict.has(p.t)) dict.set(p.t, p.r)
  }
  return dict
}

/** Tách chữ thành mảnh: đoạn khớp dài nhất trong từ điển có cách đọc, phần còn lại giữ nguyên; （＿＿） thành ô trống. */
export function toPieces(text: string, dict: ReadonlyMap<string, string>): V3Piece[] {
  const maxLen = Math.max(1, ...[...dict.keys()].map((k) => k.length))
  const out: V3Piece[] = []
  let plain = ''
  const flush = () => {
    if (plain) out.push({ t: plain })
    plain = ''
  }
  for (let i = 0; i < text.length; ) {
    if (text.startsWith(BLANK_MARK, i)) {
      flush()
      out.push({ t: '', blank: true })
      i += BLANK_MARK.length
      continue
    }
    let hit = ''
    if (KANJI.test(text[i]) || KANJI.test(text.slice(i, i + maxLen))) {
      for (let len = Math.min(maxLen, text.length - i); len > 0; len--) {
        const k = text.slice(i, i + len)
        if (dict.has(k)) {
          hit = k
          break
        }
      }
    }
    if (hit) {
      flush()
      out.push({ t: hit, r: dict.get(hit) })
      i += hit.length
    } else {
      plain += text[i]
      i++
    }
  }
  flush()
  return out
}
