// Grammar — dựng câu hỏi từ câu gốc và chấm (§5). Pure, tất định theo seed: server dựng lại đúng câu để chấm.
import { canReorder, isPunctuation, sentenceText, type GrammarExercise, type GrammarPiece, type GrammarSentenceData, type GrammarSlot } from './types'

type Rng = () => number

export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const pickOne = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

/** Câu gốc kèm id, như đọc từ database. */
export interface SentenceRow extends GrammarSentenceData {
  id: string
}

export interface QuestionOption {
  id: string
  label: string
}

export interface ShownSentence {
  pieces: GrammarPiece[]
  /** Mảnh bị khoét (hiện ＿). */
  blank?: number
  /** Tìm chỗ sai: các mảnh gạch dưới, theo thứ tự trong câu; người học chọn một. */
  underline?: number[]
  /** ★: các mảnh bị che (theo thứ tự trong câu) và mảnh có ★. */
  hidden?: number[]
  star?: number
}

export interface GrammarQuestion {
  exercise: GrammarExercise
  sentenceId: string
  seed: number
  /** Câu hỏi bằng tiếng Anh cho giao diện. */
  instruction: string
  /** Nghĩa tiếng Việt hiện kèm (đề hoặc gợi ý). */
  meaning?: string
  /** Gợi ý thêm: dạng từ điển + thể (chọn dạng, gõ dạng). */
  hint?: string
  /** Câu hỏi / lời nói đi trước (câu đáp). */
  context?: { pieces: GrammarPiece[]; meaning: string }
  /** Câu để hiện; dạng nghe thì ẩn tới khi trả lời. */
  sentence?: ShownSentence
  /** Cách đọc để máy đọc (dạng nghe). */
  speak?: string
  answer: 'option' | 'tiles' | 'typing' | 'truefalse'
  options?: QuestionOption[]
  /** Mảnh để sắp xếp / ghép: id là chỉ số trong `tilesPool`. */
  tiles?: GrammarPiece[]
}

export interface GradeResult {
  correct: boolean
  /** Đáp án đúng để hiện lại. */
  expected: string
  /** id của lựa chọn đúng (dạng chọn), để tô màu. */
  answerId?: string
}

const PARTICLES = new Set(['は', 'も', 'の', 'か', 'に', 'へ', 'で', 'と', 'から', 'まで', 'ね', 'よ'])
const ADNOMINALS = new Set(['この', 'その', 'あの'])

const content = (s: Pick<GrammarSentenceData, 'pieces'>) => s.pieces.map((p, i) => ({ p, i })).filter(({ p }) => !isPunctuation(p))

/**
 * Chia câu thành cụm: mỗi cụm kết thúc ở (các) trợ từ; cụm kết thúc bằng の hoặc là この/その/あの dính vào cụm sau.
 * Cụm cuối là vị ngữ, luôn đứng cuối. Các cụm khác đổi chỗ cho nhau vẫn đúng ngữ pháp.
 */
export function chunksOf(pieces: readonly GrammarPiece[]): string[][] {
  const words = pieces.filter((p) => !isPunctuation(p)).map((p) => p.t)
  const raw: string[][] = []
  let cur: string[] = []
  words.forEach((w, i) => {
    cur.push(w)
    const next = words[i + 1]
    if (PARTICLES.has(w) && next !== undefined && !PARTICLES.has(next)) {
      raw.push(cur)
      cur = []
    }
  })
  if (cur.length) raw.push(cur)
  const merged: string[][] = []
  for (const c of raw) {
    const prev = merged[merged.length - 1]
    if (prev && (prev[prev.length - 1] === 'の' || (prev.length === 1 && ADNOMINALS.has(prev[0])))) prev.push(...c)
    else merged.push([...c])
  }
  return merged
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]]
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]))
}

const SEP = '\u0001'

/** Mọi thứ tự chữ đúng của câu (theo cụm). Tối đa 6 cụm đổi chỗ để giới hạn số hoán vị. */
export function acceptableOrders(pieces: readonly GrammarPiece[]): Set<string> {
  const chunks = chunksOf(pieces)
  const last = chunks[chunks.length - 1]
  const movable = chunks.slice(0, -1)
  const perms = movable.length <= 6 ? permutations(movable) : [movable]
  return new Set(perms.map((p) => [...p.flat(), ...last].join(SEP)))
}

function readingOf(p: GrammarPiece): string {
  return p.r ?? p.t
}

export const speakText = (pieces: readonly GrammarPiece[]) => pieces.map(readingOf).join('')

const slotsOf = (s: GrammarSentenceData, kinds: GrammarSlot['kind'][]) => (s.slots ?? []).filter((x) => kinds.includes(x.kind))

function withPiece(pieces: readonly GrammarPiece[], index: number, text: string): GrammarPiece[] {
  return pieces.map((p, i) => (i === index ? { t: text } : p))
}

const INSTRUCTION: Record<GrammarExercise, string> = {
  particle_choice: 'Choose the word that fills the blank',
  word_choice: 'Choose the word that fits the meaning',
  order: 'Put the parts in the right order',
  form_choice: 'Choose the correct form',
  meaning_choice: 'What does this sentence mean?',
  translate_build: 'Build the Japanese sentence',
  star: 'Which part goes in ★?',
  find_error: 'Find the part that is wrong',
  clause_match: 'Match the two halves',
  listening: 'Listen and choose the meaning',
  form_typing: 'Type the correct form',
  reply_choice: 'Choose the right reply',
  true_false: 'Is this sentence correct?',
}

/** Tìm cửa sổ 4 mảnh liền nhau và vị trí ★ mà mọi cách điền đúng đều cho cùng một mảnh ở ★. */
function starWindow(s: GrammarSentenceData, rng: Rng): { hidden: number[]; star: number } | null {
  const idx = content(s).map(({ i }) => i)
  if (idx.length < 4) return null
  const accepted = acceptableOrders(s.pieces)
  const words = s.pieces.map((p) => p.t)
  const starts = shuffle(Array.from({ length: idx.length - 3 }, (_, k) => k), rng)
  for (const start of starts) {
    const win = idx.slice(start, start + 4)
    const texts = win.map((i) => words[i])
    if (new Set(texts).size < 4) continue
    const fillings = permutations(texts).filter((perm) => {
      const seq = idx.map((i) => (win.includes(i) ? perm[win.indexOf(i)] : words[i]))
      return accepted.has(seq.join(SEP))
    })
    for (const pos of shuffle([0, 1, 2, 3], rng)) {
      const atStar = new Set(fillings.map((f) => f[pos]))
      if (atStar.size === 1) return { hidden: win, star: win[pos] }
    }
  }
  return null
}

/**
 * Dựng câu hỏi. `pool`: các câu khác cùng mẫu (lấy nghĩa nhiễu cho dạng chọn nghĩa / nghe).
 * null khi câu không làm được dạng này.
 */
export function buildQuestion(s: SentenceRow, exercise: GrammarExercise, pool: readonly SentenceRow[], seed: number): GrammarQuestion | null {
  const rng = seededRng(seed)
  const base = { exercise, sentenceId: s.id, seed, instruction: INSTRUCTION[exercise], context: s.prompt ? { pieces: s.prompt.pieces, meaning: s.prompt.meaning } : undefined }
  const choiceFromSlot = (kinds: GrammarSlot['kind'][]): GrammarQuestion | null => {
    const slots = slotsOf(s, kinds)
    if (slots.length === 0) return null
    const slot = pickOne(slots, rng)
    const answer = s.pieces[slot.piece].t
    const options = shuffle([answer, ...slot.distractors.slice(0, 3)], rng).map((label) => ({ id: label, label }))
    return {
      ...base,
      meaning: s.meaning,
      hint: slot.kind === 'form' ? `${slot.dict} → ${slot.form}` : undefined,
      sentence: { pieces: s.pieces, blank: slot.piece },
      answer: 'option',
      options,
    }
  }
  const meaningOptions = (): QuestionOption[] | null => {
    const others = shuffle(pool.filter((o) => o.id !== s.id && o.meaning !== s.meaning), rng).slice(0, 3)
    if (others.length < 3) return null
    return shuffle([s, ...others], rng).map((o, i) => ({ id: String(i), label: o.meaning }))
  }

  switch (exercise) {
    case 'particle_choice':
      return choiceFromSlot(['particle'])
    case 'word_choice':
      return choiceFromSlot(['word'])
    case 'form_choice':
      return choiceFromSlot(['form'])
    case 'meaning_choice': {
      const options = meaningOptions()
      return options && { ...base, sentence: { pieces: s.pieces }, answer: 'option', options }
    }
    case 'listening': {
      const options = meaningOptions()
      return options && { ...base, speak: speakText(s.pieces), answer: 'option', options }
    }
    case 'true_false': {
      const slots = slotsOf(s, ['particle', 'form'])
      if (slots.length === 0) return null
      const wrong = rng() < 0.5
      const slot = pickOne(slots, rng)
      const pieces = wrong ? withPiece(s.pieces, slot.piece, pickOne(slot.distractors, rng)) : s.pieces
      return { ...base, meaning: s.meaning, sentence: { pieces }, answer: 'truefalse' }
    }
    case 'find_error': {
      const slots = slotsOf(s, ['particle', 'form'])
      const others = content(s).map(({ i }) => i)
      if (slots.length === 0 || others.length < 4) return null
      const slot = pickOne(slots, rng)
      const rest = shuffle(others.filter((i) => i !== slot.piece), rng).slice(0, 3)
      const underline = [slot.piece, ...rest].sort((a, b) => a - b)
      return {
        ...base,
        meaning: s.meaning,
        sentence: { pieces: withPiece(s.pieces, slot.piece, pickOne(slot.distractors, rng)), underline },
        answer: 'option',
        options: underline.map((i) => ({ id: String(i), label: '' })),
      }
    }
    case 'order': {
      if (!canReorder(s) || content(s).length < 4) return null
      const tiles = content(s).map(({ p }) => ({ t: p.t, r: p.r }))
      return { ...base, meaning: s.meaning, answer: 'tiles', tiles: shuffle(tiles, rng) }
    }
    case 'translate_build': {
      if (!canReorder(s) || content(s).length < 3) return null
      const real = content(s).map(({ p }) => ({ t: p.t, r: p.r }))
      const extra = shuffle((s.slots ?? []).flatMap((x) => x.distractors).filter((d) => !real.some((p) => p.t === d)), rng).slice(0, 2)
      return { ...base, meaning: s.meaning, answer: 'tiles', tiles: shuffle([...real, ...extra.map((t) => ({ t }))], rng) }
    }
    case 'star': {
      if (!canReorder(s)) return null
      const w = starWindow(s, rng)
      if (!w) return null
      const options = shuffle(w.hidden, rng).map((i) => ({ id: s.pieces[i].t, label: s.pieces[i].t }))
      return { ...base, meaning: s.meaning, sentence: { pieces: s.pieces, hidden: w.hidden, star: w.star }, answer: 'option', options }
    }
    case 'form_typing': {
      const slots = slotsOf(s, ['form'])
      if (slots.length === 0) return null
      const slot = pickOne(slots, rng)
      return { ...base, meaning: s.meaning, hint: `${slot.dict} → ${slot.form}`, sentence: { pieces: s.pieces, blank: slot.piece }, answer: 'typing' }
    }
    case 'reply_choice': {
      if (!s.prompt) return null
      const reply = sentenceText(s.pieces)
      const options = shuffle([reply, ...s.prompt.distractors.slice(0, 3)], rng).map((label) => ({ id: label, label }))
      return { ...base, meaning: undefined, answer: 'option', options }
    }
    case 'clause_match':
      // Chưa có câu gốc nào đánh dấu hai vế ở bài 1–5; dạng này dựng theo nhóm câu, làm khi nội dung có.
      return null
  }
}

const normalize = (text: string) => text.replace(/[\s　。、]/g, '')

/**
 * Chấm theo câu gốc, không theo dữ liệu trình duyệt gửi lên.
 * answer: id lựa chọn (option), 'true'/'false', chuỗi gõ (typing), hoặc mảng chữ của các mảnh đã xếp (tiles).
 */
export function gradeQuestion(s: SentenceRow, q: GrammarQuestion, answer: string | readonly string[]): GradeResult {
  const text = sentenceText(s.pieces)
  switch (q.exercise) {
    case 'particle_choice':
    case 'word_choice':
    case 'form_choice': {
      const expected = s.pieces[q.sentence!.blank!].t
      const slot = (s.slots ?? []).find((x) => x.piece === q.sentence!.blank)
      const ok = typeof answer === 'string' && (answer === expected || (slot?.accepted ?? []).includes(answer))
      return { correct: ok, expected, answerId: expected }
    }
    case 'meaning_choice':
    case 'listening':
      return { correct: q.options!.find((o) => o.id === answer)?.label === s.meaning, expected: s.meaning, answerId: q.options!.find((o) => o.label === s.meaning)?.id }
    case 'true_false': {
      const isCorrect = sentenceText(q.sentence!.pieces) === text
      return { correct: answer === String(isCorrect), expected: isCorrect ? 'true' : 'false', answerId: String(isCorrect) }
    }
    case 'find_error': {
      const wrong = q.sentence!.underline!.find((i) => q.sentence!.pieces[i].t !== s.pieces[i].t)!
      return { correct: answer === String(wrong), expected: s.pieces[wrong].t, answerId: String(wrong) }
    }
    case 'order':
    case 'translate_build': {
      const ok = Array.isArray(answer) && acceptableOrders(s.pieces).has(answer.join(SEP))
      return { correct: ok, expected: text }
    }
    case 'star': {
      const expected = s.pieces[q.sentence!.star!].t
      return { correct: answer === expected, expected, answerId: expected }
    }
    case 'form_typing': {
      const blank = q.sentence!.blank!
      const piece = s.pieces[blank]
      const slot = (s.slots ?? []).find((x) => x.piece === blank)
      const ok = typeof answer === 'string' && [piece.t, piece.r, ...(slot?.accepted ?? [])].filter(Boolean).map((x) => normalize(x!)).includes(normalize(answer))
      return { correct: ok, expected: piece.t }
    }
    case 'reply_choice':
      return { correct: answer === text, expected: text, answerId: text }
    case 'clause_match':
      return { correct: false, expected: text }
  }
}

/** Bản gửi xuống trình duyệt: bỏ chữ của ô trống và các ô ★ (đáp án). Server chấm bằng câu dựng lại từ seed. */
export function publicQuestion(q: GrammarQuestion): GrammarQuestion {
  if (!q.sentence) return q
  const hide = new Set([...(q.sentence.blank !== undefined ? [q.sentence.blank] : []), ...(q.sentence.hidden ?? [])])
  if (hide.size === 0) return q
  return { ...q, sentence: { ...q.sentence, pieces: q.sentence.pieces.map((p, i) => (hide.has(i) ? { t: '' } : p)) } }
}
