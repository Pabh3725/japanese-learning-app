// JLPT_V1 (docs/jlpt-rules.md §3): dựng câu hỏi đợt 1 từ dữ liệu sẵn có. Pure: nhận dữ liệu và rng, không đọc database.
import type { GrammarPiece, GrammarSentenceData } from '../grammar/types'
import type { JlptType } from './catalog'
import { kanjiSpan, readingDistractors, shuffle } from './reading'

type Rng = () => number

/** Một đoạn của câu hiển thị. `mark`: gạch chân (từ được hỏi), ô trống, ô che, ô ★. */
export interface StemPiece {
  t: string
  r?: string
  mark?: 'underline' | 'blank' | 'hidden' | 'star'
}

export interface JlptQuestion {
  type: JlptType
  /** Tham chiếu mục gốc (mã từ, mã câu ngữ pháp) để thống kê và tránh trùng trong một phiên. */
  ref: string
  instruction: string
  stem: StemPiece[] | null
  options: string[]
  /** Chỉ ở server cho tới khi đã trả lời. */
  answer: number
  explanation: string
  /** 即時応答: câu máy đọc (kana khi có). */
  audio?: string
  /** 即時応答: chữ của câu được đọc, hiện khi người học bấm "Show text". */
  audioText?: string
}

export interface JlptWord {
  id: string
  code: string
  expression: string
  reading: string
  meaning: string
  hanViet: string | null
}

const isKanji = (c: string) => /[㐀-鿿]/.test(c)
export const hasKanji = (s: string) => [...s].some(isKanji)

/** Đặt đáp án vào giữa các nhiễu, vị trí ngẫu nhiên. */
function withAnswer(answer: string, distractors: readonly string[], rng: Rng): { options: string[]; answer: number } {
  const options = shuffle([answer, ...distractors], rng)
  return { options, answer: options.indexOf(answer) }
}

/** Ngữ cảnh của từ: câu ngữ pháp có mảnh trùng đúng cách viết; không có thì từ đứng riêng. */
function contextStem(word: JlptWord, sentence: Pick<GrammarSentenceData, 'pieces'> | null, show: 'kanji' | 'kana'): StemPiece[] {
  const target: StemPiece = { t: show === 'kanji' ? word.expression : word.reading, mark: 'underline' }
  if (!sentence) return [target]
  const i = sentence.pieces.findIndex((p) => p.t === word.expression)
  if (i === -1) return [target]
  return sentence.pieces.map((p, j) => (j === i ? target : { t: p.t, r: p.r }))
}

const wordNote = (w: JlptWord) => `${w.expression}（${w.reading}）${w.hanViet ? ` ${w.hanViet}` : ''}: ${w.meaning}`

/** Loại từ đoán theo cách đọc: động từ thể ます, tính từ い, còn lại là danh từ. */
export function wordKind(reading: string): 'verb' | 'adj' | 'noun' {
  if (reading.endsWith('ます')) return 'verb'
  if (reading.endsWith('い') && !reading.endsWith('せい') && !reading.endsWith('けい')) return 'adj'
  return 'noun'
}

/**
 * 漢字読み: chọn cách đọc của từ Kanji gạch chân. Như đề thật, trộn hai kiểu nhiễu: cách đọc của từ có thật cùng nhóm
 * nghĩa (`siblings`: cách đọc của từ cùng bài, tối đa 2) và cách đọc bị đổi một chỗ. null khi không đủ 3 nhiễu.
 */
export function buildKanjiReading(word: JlptWord, sentence: Pick<GrammarSentenceData, 'pieces'> | null, otherReadings: ReadonlySet<string>, rng: Rng, siblings: readonly string[] = []): JlptQuestion | null {
  if (!hasKanji(word.expression) || word.reading === word.expression) return null
  const len = [...word.reading].length
  const kind = wordKind(word.reading)
  // Từ cùng loại (danh từ / động từ ます / tính từ い), độ dài gần bằng: như 4 từ thời tiết, 4 từ chỉ vị trí trong đề thật
  const near = shuffle(
    [...new Set(siblings)].filter((s) => s !== word.reading && !otherReadings.has(s) && !s.includes('です') && wordKind(s) === kind && Math.abs([...s].length - len) <= 1),
    rng,
  ).slice(0, rng() < 0.5 ? 1 : 2)
  const mutated = readingDistractors(word.reading, rng, new Set([...otherReadings, ...near]), 3 - near.length, kanjiSpan(word.expression, word.reading))
  const distractors = [...near, ...mutated]
  if (distractors.length < 3) return null
  return {
    type: 'kanji_reading',
    ref: word.code,
    instruction: 'How is the underlined word read?',
    stem: contextStem(word, sentence, 'kanji'),
    ...withAnswer(word.reading, distractors, rng),
    explanation: wordNote(word),
  }
}

/**
 * 表記: chọn cách viết Kanji của từ Hiragana gạch chân. Nhiễu: thay một chữ bằng chữ gần giống hoặc cùng âm On;
 * bỏ cách viết của từ có thật cùng cách đọc (sẽ thành hai đáp án đúng).
 */
export function buildOrthography(
  word: JlptWord,
  sentence: Pick<GrammarSentenceData, 'pieces'> | null,
  swaps: (kanji: string) => readonly string[],
  sameReading: ReadonlySet<string>,
  fallback: readonly string[],
  rng: Rng,
): JlptQuestion | null {
  if (!hasKanji(word.expression) || word.reading === word.expression) return null
  const chars = [...word.expression]
  const ok = (v: string) => v !== word.expression && !sameReading.has(v)
  // Như đề thật: từ có hai chữ Hán thì 4 lựa chọn là lưới 2×2 (đúng/sai ở từng chữ): 学校 · 学枚 · 宇校 · 宇枚
  const kanjiAt = chars.flatMap((c, i) => (isKanji(c) ? [i] : []))
  if (kanjiAt.length === 2) {
    const [i, j] = kanjiAt
    const alt = (k: number) => shuffle(swaps(chars[k]), rng)[0]
    const a = alt(i)
    const b = alt(j)
    if (a && b) {
      const at = (x: string, y: string) => chars.map((c, k) => (k === i ? x : k === j ? y : c)).join('')
      const grid = [at(a, chars[j]), at(chars[i], b), at(a, b)]
      if (grid.every(ok) && new Set(grid).size === 3) {
        return {
          type: 'orthography',
          ref: word.code,
          instruction: 'How is the underlined word written?',
          stem: contextStem(word, sentence, 'kana'),
          ...withAnswer(word.expression, grid, rng),
          explanation: wordNote(word),
        }
      }
    }
  }
  const variants: string[] = []
  for (const [i, c] of chars.entries()) {
    if (!isKanji(c)) continue
    for (const alt of swaps(c)) {
      const v = [...chars.slice(0, i), alt, ...chars.slice(i + 1)].join('')
      if (ok(v) && !variants.includes(v)) variants.push(v)
    }
  }
  const picked = shuffle(variants, rng).slice(0, 3)
  for (const f of shuffle(fallback, rng)) {
    if (picked.length >= 3) break
    if (f !== word.expression && !sameReading.has(f) && !picked.includes(f) && [...f].length === chars.length) picked.push(f)
  }
  if (picked.length < 3) return null
  return {
    type: 'orthography',
    ref: word.code,
    instruction: 'How is the underlined word written?',
    stem: contextStem(word, sentence, 'kana'),
    ...withAnswer(word.expression, picked, rng),
    explanation: wordNote(word),
  }
}

// Chữ Katakana dễ nhầm (đề thật N5: ツ/ソ, シ/ン, ウ/ワ…)
const KATAKANA_LOOKALIKE: Record<string, string[]> = {
  ツ: ['ソ', 'シ'], ソ: ['ン', 'ツ'], シ: ['ツ', 'ン'], ン: ['ソ', 'シ'], ウ: ['ワ', 'フ'], ワ: ['ウ', 'フ'], ク: ['タ', 'ケ'], タ: ['ク'],
  ル: ['レ'], レ: ['ル'], ヌ: ['メ', 'ス'], メ: ['ヌ', 'ノ'], ス: ['ヌ'], チ: ['テ'], テ: ['チ'], コ: ['ユ', 'ロ'], ユ: ['コ'], ロ: ['コ'],
  ア: ['マ', 'ヤ'], マ: ['ア', 'ム'], ム: ['マ'], ノ: ['ソ', 'メ'], ラ: ['ウ'], ヤ: ['セ'], セ: ['ヤ'],
}
const toHiragana = (s: string) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
export const isKatakanaWord = (s: string) => /^[\u30a1-\u30f6]+$/.test(s)

/**
 * 表記 Katakana (chỉ N5): từ ngoại lai viết Hiragana gạch chân, chọn cách viết Katakana. Lưới 2×2 ở hai chữ dễ nhầm
 * (ウイシャツ · ワイシャソ…). Từ không có đủ hai chữ dễ nhầm, hay có ー / ・, thì bỏ qua.
 */
export function buildKatakana(word: JlptWord, sentence: Pick<GrammarSentenceData, 'pieces'> | null, rng: Rng): JlptQuestion | null {
  if (!isKatakanaWord(word.expression)) return null
  const chars = [...word.expression]
  const spots = shuffle(chars.flatMap((c, i) => (KATAKANA_LOOKALIKE[c] ? [i] : [])), rng)
  if (spots.length < 2) return null
  const [i, j] = spots
  const altOf = (k: number) => shuffle(KATAKANA_LOOKALIKE[chars[k]], rng)[0]
  const a = altOf(i)
  const b = altOf(j)
  const at = (x: boolean, y: boolean) => chars.map((c, k) => (k === i && x ? a : k === j && y ? b : c)).join('')
  const options = [at(true, false), at(false, true), at(true, true)]
  if (new Set(options).size !== 3 || options.includes(word.expression)) return null
  const shown = { ...word, reading: toHiragana(word.expression) }
  return {
    type: 'orthography',
    ref: word.code,
    instruction: 'How is the underlined word written?',
    stem: contextStem(shown, sentence, 'kana'),
    ...withAnswer(word.expression, options, rng),
    explanation: `${word.expression}: ${word.meaning}`,
  }
}

export interface JlptGrammarSentence extends Pick<GrammarSentenceData, 'code' | 'pieces' | 'meaning' | 'slots' | 'prompt'> {
  pattern: string
  patternMeaning: string
}

const sentenceText = (pieces: readonly GrammarPiece[]) => pieces.map((p) => p.t).join('')
const sentenceKana = (pieces: readonly GrammarPiece[]) => pieces.map((p) => p.r ?? p.t).join('')
const isPunct = (t: string) => /^[。、？！?!「」　 ]+$/.test(t)
const grammarNote = (s: JlptGrammarSentence) => `${s.pattern} — ${s.patternMeaning}\n${sentenceText(s.pieces)}\n${s.meaning}`

/** 文法形式の判断: một chỗ hỏi của câu, 3 nhiễu soạn sẵn. */
export function buildGrammarForm(s: JlptGrammarSentence, rng: Rng): JlptQuestion | null {
  const slots = shuffle((s.slots ?? []).filter((x) => x.distractors.length >= 3), rng)
  const slot = slots[0]
  if (!slot) return null
  const answer = s.pieces[slot.piece].t
  const distractors = slot.distractors.filter((d) => d !== answer && !(slot.accepted ?? []).includes(d)).slice(0, 3)
  if (new Set(distractors).size < 3) return null
  return {
    type: 'grammar_form',
    ref: s.code,
    instruction: 'Choose what fits in the blank.',
    stem: s.pieces.map((p, i) => (i === slot.piece ? { t: answer, mark: 'blank' as const } : { t: p.t, r: p.r })),
    ...withAnswer(answer, distractors, rng),
    explanation: grammarNote(s),
  }
}

/** 文の組み立て: che 4 mảnh liền nhau (không có dấu câu, chữ khác nhau); ★ ở một ô bất kỳ như đề thật. */
export function buildSentenceOrder(s: JlptGrammarSentence, rng: Rng): JlptQuestion | null {
  const ends = s.pieces.filter((p) => /[。？！?!]/.test(p.t)).length
  if (ends > 1 || s.pieces.some((p) => p.t.includes('、'))) return null
  const starts: number[] = []
  for (let i = 0; i + 4 <= s.pieces.length; i++) {
    const win = s.pieces.slice(i, i + 4)
    if (win.every((p) => !isPunct(p.t)) && new Set(win.map((p) => p.t)).size === 4) starts.push(i)
  }
  if (starts.length === 0) return null
  const start = starts[Math.floor(rng() * starts.length)]
  const star = start + Math.floor(rng() * 4)
  const hidden = s.pieces.slice(start, start + 4).map((p) => p.t)
  return {
    type: 'sentence_order',
    ref: s.code,
    instruction: 'Put the pieces in order. Which one goes in ★?',
    stem: s.pieces.map((p, i) => (i < start || i >= start + 4 ? { t: p.t, r: p.r } : { t: '', mark: i === star ? ('star' as const) : ('hidden' as const) })),
    ...withAnswer(s.pieces[star].t, hidden.filter((h) => h !== s.pieces[star].t), rng),
    explanation: grammarNote(s),
  }
}

/** 即時応答: nghe câu nói, chọn câu đáp (3 lựa chọn). */
export function buildQuickResponse(s: JlptGrammarSentence, rng: Rng): JlptQuestion | null {
  if (!s.prompt) return null
  const answer = sentenceText(s.pieces)
  const distractors = s.prompt.distractors.filter((d) => d !== answer)
  if (distractors.length < 2) return null
  const picked = shuffle(distractors, rng).slice(0, 2)
  return {
    type: 'quick_response',
    ref: s.code,
    instruction: 'Listen and choose the best reply.',
    stem: null,
    ...withAnswer(answer, picked, rng),
    explanation: `${sentenceText(s.prompt.pieces)} — ${s.prompt.meaning}\n${answer} — ${s.meaning}`,
    audio: sentenceKana(s.prompt.pieces),
    audioText: sentenceText(s.prompt.pieces),
  }
}

/** Câu gửi cho trình duyệt: chưa có đáp án và giải thích. */
export type PublicJlptQuestion = Omit<JlptQuestion, 'answer' | 'explanation'>
export const publicQuestion = ({ answer: _a, explanation: _e, ...rest }: JlptQuestion): PublicJlptQuestion => rest
