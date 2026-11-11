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

type Rng = () => number

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Hai thành phần đứng cạnh nhau theo một hướng rõ ràng thì mới ghép được. */
const LAYOUTS: Record<string, 'row' | 'column'> = { left: 'row', right: 'row', top: 'column', bottom: 'column' }

export interface PartsQuestion {
  kind: 'kanji_parts'
  character: string
  hanViet: string
  meaning: string
  layout: 'row' | 'column'
  /** Thành phần đúng theo thứ tự trái → phải hoặc trên → dưới. */
  answer: string[]
  /** Mảnh để chọn: thành phần đúng và mảnh nhiễu, đã xáo. */
  pool: string[]
}

/** Dạng C: ghép thành phần theo vị trí. null khi chữ không có đúng hai thành phần trái–phải hoặc trên–dưới. */
export function buildPartsQuestion(
  kanji: { character: string; hanViet: string; meaning: string; parts: readonly KanjiPart[] },
  others: readonly { character: string; parts: readonly KanjiPart[] }[],
  rng: Rng = Math.random,
): PartsQuestion | null {
  const top = kanji.parts
  if (top.length !== 2 || !top[0].pos || !top[1].pos) return null
  const layout = LAYOUTS[top[0].pos]
  if (!layout || LAYOUTS[top[1].pos] !== layout || top[0].c === top[1].c) return null
  const answer = top.map((p) => p.c)
  // Mảnh nhiễu: thành phần của chữ khác cùng kiểu bố cục, không trùng mảnh đúng
  const fromOthers = others
    .filter((o) => o.character !== kanji.character && o.parts.length === 2 && o.parts.every((p) => p.pos && LAYOUTS[p.pos] === layout))
    .flatMap((o) => o.parts.map((p) => p.c))
  const distractors = shuffle([...new Set(fromOthers)].filter((c) => !answer.includes(c)), rng).slice(0, 4)
  if (distractors.length < 2) return null
  return { kind: 'kanji_parts', character: kanji.character, hanViet: kanji.hanViet, meaning: kanji.meaning, layout, answer, pool: shuffle([...answer, ...distractors], rng) }
}

export function gradeParts(q: Pick<PartsQuestion, 'answer'>, given: readonly string[]): boolean {
  return given.length === q.answer.length && given.every((c, i) => c === q.answer[i])
}

export interface SimilarQuestion {
  kind: 'kanji_similar'
  /** Đề: nghĩa và Hán Việt của chữ đúng. */
  meaning: string
  hanViet: string
  answer: string
  options: string[]
  /** Giải thích điểm khác, hiện sau khi trả lời. */
  explanation: string
}

/** Dạng E: chọn đúng chữ giữa các chữ gần giống đã duyệt. Câu riêng, không điểm (chủ dự án chọn 2026-11-14). */
export function buildSimilarQuestion(
  kanji: { character: string; hanViet: string; meaning: string },
  pairs: readonly { other: string; explanation: string }[],
  rng: Rng = Math.random,
): SimilarQuestion | null {
  if (pairs.length === 0) return null
  const chosen = shuffle(pairs, rng).slice(0, 3)
  return {
    kind: 'kanji_similar',
    meaning: kanji.meaning,
    hanViet: kanji.hanViet,
    answer: kanji.character,
    options: shuffle([kanji.character, ...chosen.map((p) => p.other)], rng),
    explanation: chosen.map((p) => p.explanation).join(' '),
  }
}

export interface KanjiMatchItem {
  id: string
  character: string
  hanViet: string
  meaning: string
  reading: string
}

/** Dạng F: ghép chữ với nghĩa hoặc Hán Việt. Cần ít nhất 4 chữ; nghĩa hoặc Hán Việt trùng nhau thì bỏ để không có hai đáp án đúng. */
export function pickMatchItems(items: readonly KanjiMatchItem[], by: 'meaning' | 'hanViet', rng: Rng = Math.random, size = 6): KanjiMatchItem[] | null {
  const seen = new Set<string>()
  const unique = shuffle(items, rng).filter((k) => {
    const key = (by === 'meaning' ? k.meaning : k.hanViet).toLowerCase()
    if (seen.has(key) || seen.has(k.character)) return false
    seen.add(key)
    seen.add(k.character)
    return true
  })
  return unique.length >= 4 ? unique.slice(0, size) : null
}
