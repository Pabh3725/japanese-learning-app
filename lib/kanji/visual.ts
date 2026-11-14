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

/**
 * Vị trí của thành phần cấp trên cùng trong KanjiVG → thứ tự ghép và nhãn ô. Bao ngoài (广, 辶, 門…) ghép trước phần bên trong.
 * Thành phần không có vị trí (KanjiVG không ghi) thì chữ đó không có câu ghép.
 */
const POSITIONS: Record<string, { order: number; label: string }> = {
  left: { order: 0, label: 'left' },
  tare: { order: 0, label: 'outside' },
  nyo: { order: 0, label: 'outside' },
  kamae: { order: 0, label: 'outside' },
  top: { order: 1, label: 'top' },
  right: { order: 2, label: 'right' },
  middle: { order: 2, label: 'middle' },
  bottom: { order: 3, label: 'bottom' },
  tarec: { order: 4, label: 'inside' },
  nyoc: { order: 4, label: 'inside' },
  kamaec: { order: 4, label: 'inside' },
}

/** Thông tin một thành phần, chỉ lấy từ dữ liệu đã duyệt: tên bộ thủ, Hán Việt và nghĩa của chữ Kanji. */
export interface PartInfo {
  /** Tên bộ thủ (đã duyệt) khi thành phần là một bộ hoặc dạng biến thể của bộ. */
  radicalName: string | null
  /** Có khi thành phần cũng là một chữ Kanji trong bảng chữ. */
  hanViet: string | null
  meaning: string | null
}

export interface PartsQuestion {
  kind: 'kanji_parts'
  character: string
  hanViet: string
  meaning: string
  /** Nhãn vị trí của từng ô theo thứ tự ghép: left, right, top, bottom, outside, inside, middle. */
  slots: string[]
  /** Thành phần đúng theo thứ tự ghép. */
  answer: string[]
  /** Mảnh để chọn: thành phần đúng và mảnh nhiễu, đã xáo. */
  pool: string[]
  /** Giải thích sau khi ghép, mỗi dòng một ý. */
  explanation: string
}

/** Một dòng giải thích của thành phần: "亻 (left): Bộ Nhân, a form of 人" / "木 (right): MỘC · cây". */
function describePart(part: KanjiPart, slot: string, info: PartInfo): string {
  const bits: string[] = []
  if (info.hanViet || info.meaning) bits.push([info.hanViet, info.meaning].filter(Boolean).join(' · '))
  if (info.radicalName) bits.push(part.original && part.original !== part.c ? `${info.radicalName}, a form of ${part.original}` : info.radicalName)
  return `${part.c} (${slot})${bits.length > 0 ? `: ${bits.join(' · ')}` : ''}`
}

/**
 * Dạng C (V10): ghép 2–3 thành phần cấp trên cùng theo vị trí, có giải thích. null khi chữ không có 2–3 thành phần đều có vị trí.
 * `info`: tra tên bộ thủ / Hán Việt / nghĩa của một thành phần. `radical`: bộ thủ chính thức của chữ (khi không nằm trong các thành phần).
 */
export function buildPartsQuestion(
  kanji: { character: string; hanViet: string; meaning: string; parts: readonly KanjiPart[] },
  others: readonly { character: string; parts: readonly KanjiPart[] }[],
  info: (part: KanjiPart) => PartInfo = () => ({ radicalName: null, hanViet: null, meaning: null }),
  rng: Rng = Math.random,
  radical: { character: string; name: string | null } | null = null,
): PartsQuestion | null {
  const top = kanji.parts
  if (top.length < 2 || top.length > 3 || !top.every((p) => p.pos && POSITIONS[p.pos])) return null
  const ordered = [...top].sort((a, b) => POSITIONS[a.pos!].order - POSITIONS[b.pos!].order)
  const answer = ordered.map((p) => p.c)
  const slots = ordered.map((p) => POSITIONS[p.pos!].label)
  // Mảnh nhiễu: thành phần cấp trên cùng của chữ khác, không trùng mảnh đúng
  const fromOthers = others.filter((o) => o.character !== kanji.character).flatMap((o) => o.parts.map((p) => p.c))
  const distractors = shuffle([...new Set(fromOthers)].filter((c) => !answer.includes(c)), rng).slice(0, 3)
  if (distractors.length < 2) return null
  const lines = [`${kanji.character} = ${answer.join(' + ')}`, ...ordered.map((p, i) => describePart(p, slots[i], info(p)))]
  // Bộ thủ chính thức của chữ khi KanjiVG không đánh dấu thành phần nào là bộ
  if (radical && !ordered.some((p) => p.radical)) lines.push(`Radical of ${kanji.character}: ${radical.character}${radical.name ? ` (${radical.name})` : ''}`)
  return {
    kind: 'kanji_parts',
    character: kanji.character,
    hanViet: kanji.hanViet,
    meaning: kanji.meaning,
    slots,
    answer,
    pool: shuffle([...answer, ...distractors], rng),
    explanation: lines.join('\n'),
  }
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
