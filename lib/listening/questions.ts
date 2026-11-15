// LISTENING_V2 (docs/listening-rules.md): dựng câu luyện nghe theo câu (Grammar), chép chính tả, đề thi thử phần nghe JLPT,
// và danh sách câu nghe sai. Pure. Nghe số / giờ / ngày / giá: ./numbers.ts.
import { toKatakana } from 'wanakana'
import { isKanaAnswerCorrect, kanaComparisonForm } from '../exercise/answer-normalize'
import type { GrammarPiece } from '../grammar/types'
import type { JlptLevel } from '../jlpt/catalog'
import { contentQuestions, type ListeningItem, type VerbalItem } from '../jlpt/content'
import { buildQuickResponse, type JlptGrammarSentence, type JlptQuestion, type StemPiece } from '../jlpt/questions'
import { shuffle } from '../jlpt/reading'

type Rng = () => number

export const LISTENING_V1 = {
  sessionSizes: [10, 20] as const,
  /** Grammar · Mix 10 câu: 4 chọn câu đã nghe, 3 nghe câu → nghĩa, 3 hỏi–đáp (20 câu: gấp đôi). Chép chính tả là chế độ riêng (Practice). */
  mixPer10: { heard_sentence: 4, sentence_meaning: 3, reply: 3, dictation: 0 },
  /** Danh sách câu nghe sai: ra khỏi danh sách khi đúng liên tiếp chừng này lần. */
  mistakeClearStreak: 2,
  /** Độ dài câu nghe → chọn nghĩa (số chữ, không tính dấu câu) theo bài. */
  sentenceMaxChars: (lesson: number) => (lesson <= 10 ? 12 : lesson <= 25 ? 20 : Number.POSITIVE_INFINITY),
  /** Chép chính tả: chỉ câu (chủ dự án chốt 2026-11-15); độ dài tối đa (số chữ, không tính dấu câu) theo bài. */
  dictationMaxChars: (lesson: number) => (lesson <= 10 ? 10 : lesson <= 25 ? 14 : 18),
  /** Nghe câu → chọn nghĩa: độ giống = phần chữ tiếng Việt chung của nghĩa và phần mảnh tiếng Nhật chung. */
  similarity: { meaning: 0.6, japanese: 0.4 },
  rate: { normal: 0.9, slow: 0.7 },
  /** Thi thử: số câu mỗi 問題 và thời gian tham khảo (phút). */
  mock: {
    N5: { sections: [7, 6, 5, 6], minutes: 30 },
    N4: { sections: [8, 7, 5, 8], minutes: 35 },
  } satisfies Record<JlptLevel, { sections: [number, number, number, number]; minutes: number }>,
  goodPercent: 60,
  statsDays: 30,
} as const

export const LESSON_TYPES = ['heard_sentence', 'sentence_meaning', 'reply', 'dictation'] as const
export type LessonType = (typeof LESSON_TYPES)[number]
/** Dạng nghe theo câu của Grammar (Mix gồm các dạng này). */
export const GRAMMAR_LISTENING_TYPES = ['heard_sentence', 'sentence_meaning', 'reply'] as const satisfies readonly LessonType[]
/** Chép chính tả theo đoạn (hội thoại ngắn / dài của bài, đợt B). */
export const PASSAGE_MODES = ['passage_short', 'passage_long'] as const
export type PassageMode = (typeof PASSAGE_MODES)[number]
export type LessonMode = 'mix' | LessonType | PassageMode
export const isLessonMode = (v: unknown): v is LessonMode => v === 'mix' || LESSON_TYPES.includes(v as LessonType) || PASSAGE_MODES.includes(v as PassageMode)
export type MockType = 'listening_task' | 'verbal_expressions' | 'quick_response'
/** Kiểu phiên (listening_sessions.kind). */
export type ListeningKind = 'lesson' | 'point' | 'jlpt_mock' | 'numbers' | 'mistakes' | 'conversation'

export type ScriptLine = { sp: 'M' | 'F' | 'N'; text: string }

export interface ListeningQuestion {
  type: LessonType | MockType | 'numbers' | 'conversation_blank'
  /** Thi thử: 問題 1–4. */
  section?: 1 | 2 | 3 | 4
  ref: string
  instruction: string
  /** Lời máy đọc (kana), theo thứ tự. */
  script: ScriptLine[]
  /** Chép chính tả theo đoạn: lời từ đầu đoạn tới trước câu này (nút "nghe từ đầu"). */
  before?: ScriptLine[]
  /** 課題理解・ポイント理解: câu hỏi in ra. */
  stem?: StemPiece[] | null
  /** 発話表現: tình huống. */
  situation?: string
  /** Câu chọn; rỗng với câu gõ. */
  options: string[]
  /** Lựa chọn chỉ được đọc, không in (như đề thật): hiện 1, 2, 3 tới khi trả lời. */
  hideOptions?: boolean
  /** Câu gõ: ô gõ đổi romaji sang bảng chữ này, hoặc chỉ nhận chữ số. */
  input?: 'hiragana' | 'katakana' | 'digits'
  // --- Chỉ ở server tới khi trả lời ---
  answer: number | string
  explanation: string
  /** Lời có furigana, hiện sau khi trả lời. */
  transcript: { sp: ScriptLine['sp']; pieces: StemPiece[] }[]
}

export type PublicListeningQuestion = Omit<ListeningQuestion, 'answer' | 'explanation' | 'transcript'>
export const publicListeningQuestion = ({ answer: _a, explanation: _e, transcript: _t, ...rest }: ListeningQuestion): PublicListeningQuestion => rest

export const PUNCT = /[\s　。、？！?!「」『』・…〜～]/g
export const textOf = (pieces: readonly GrammarPiece[]) => pieces.map((p) => p.t).join('')
const kanaOf = (pieces: readonly GrammarPiece[]) => pieces.map((p) => p.r ?? p.t).join('')
export const charCount = (pieces: readonly GrammarPiece[]) => textOf(pieces).replace(PUNCT, '').length
export const toStem = (pieces: readonly GrammarPiece[]): StemPiece[] => pieces.map((p) => (p.r ? { t: p.t, r: p.r } : { t: p.t }))

export function withAnswer<T>(answer: T, distractors: readonly T[], rng: Rng): { options: T[]; answer: number } {
  const options = shuffle([answer, ...distractors], rng)
  return { options, answer: options.indexOf(answer) }
}

// ---------------------------------------------------------------------------
// Theo bài
// ---------------------------------------------------------------------------

export interface LessonSentence extends JlptGrammarSentence {
  pointCode: string
  /** Độ khó 1–3 của câu ngữ pháp. */
  level?: number
  /** Mẫu khác dùng trong câu (câu kết hợp mẫu đã học). */
  uses?: string[]
}

const wordsCache = new WeakMap<LessonSentence, { vi: Set<string>; ja: Set<string> }>()
function wordsOf(s: LessonSentence) {
  let w = wordsCache.get(s)
  if (!w) {
    w = {
      vi: new Set(s.meaning.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)),
      ja: new Set(s.pieces.map((p) => p.t).filter((t) => !PUNCT_ONLY.test(t))),
    }
    wordsCache.set(s, w)
  }
  return w
}
const PUNCT_ONLY = /^[\s　。、？！?!「」『』・…〜～]+$/
const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>) => {
  let common = 0
  for (const x of a) if (b.has(x)) common++
  const union = a.size + b.size - common
  return union === 0 ? 0 : common / union
}

/** Độ giống của hai câu (0–1): chữ tiếng Việt chung của nghĩa và mảnh tiếng Nhật chung. */
export function sentenceSimilarity(a: LessonSentence, b: LessonSentence): number {
  const wa = wordsOf(a)
  const wb = wordsOf(b)
  return LISTENING_V1.similarity.meaning * jaccard(wa.vi, wb.vi) + LISTENING_V1.similarity.japanese * jaccard(wa.ja, wb.ja)
}

/**
 * Dạng A: nghe câu → chọn nghĩa. Nhiễu là nghĩa của 3 câu **giống nhất** (từ bài này và các bài trước), để phải nghe
 * đúng chi tiết (thứ sáu / thứ bảy, sách / giấy…). Bỏ câu cùng nghĩa (cùng tập chữ) và nhiễu trùng nhau.
 */
export function buildSentenceMeaning(s: LessonSentence, pool: readonly LessonSentence[], rng: Rng): ListeningQuestion | null {
  const own = wordsOf(s).vi
  const ranked = shuffle(pool, rng)
    .filter((x) => x.code !== s.code && x.meaning !== s.meaning && jaccard(wordsOf(x).vi, own) < 1)
    .map((x) => ({ x, score: sentenceSimilarity(s, x) }))
    .sort((a, b) => b.score - a.score)
  const picked: LessonSentence[] = []
  for (const { x } of ranked) {
    if (picked.length === 3) break
    if (picked.some((p) => p.meaning === x.meaning || jaccard(wordsOf(p).vi, wordsOf(x).vi) === 1)) continue
    picked.push(x)
  }
  if (picked.length < 3) return null
  const distractors = picked.map((x) => x.meaning)
  return {
    type: 'sentence_meaning',
    ref: s.code,
    instruction: 'Listen and choose the meaning.',
    script: [{ sp: 'N', text: kanaOf(s.pieces) }],
    ...withAnswer(s.meaning, distractors, rng),
    explanation: `${textOf(s.pieces)} — ${s.meaning}\n${s.pattern}: ${s.patternMeaning}`,
    transcript: [{ sp: 'N', pieces: toStem(s.pieces) }],
  }
}

/**
 * Nghe → chọn câu đã nghe (V2): 4 câu chỉ khác một chỗ — câu đúng và 3 câu thay một chỗ hỏi (trợ từ / từ / thể)
 * bằng nhiễu soạn sẵn của chỗ đó (京都へ行きます / 京都で行きます / 京都へ行きました …). Không đủ 3 câu khác thì bỏ.
 */
export function buildHeardSentence(s: LessonSentence, rng: Rng): ListeningQuestion | null {
  const correct = textOf(s.pieces)
  for (const slot of shuffle(s.slots ?? [], rng)) {
    const accepted = new Set([s.pieces[slot.piece].t, ...(slot.accepted ?? [])])
    const variants = [...new Set(slot.distractors.filter((d) => !accepted.has(d)).map((d) => textOf(s.pieces.map((p, i) => (i === slot.piece ? { t: d } : p)))))].filter((v) => v !== correct)
    if (variants.length < 3) continue
    return {
      type: 'heard_sentence',
      ref: s.code,
      instruction: 'Which sentence did you hear?',
      script: [{ sp: 'N', text: kanaOf(s.pieces) }],
      ...withAnswer(correct, shuffle(variants, rng).slice(0, 3), rng),
      explanation: `${correct} — ${s.meaning}\n${s.pattern}: ${s.patternMeaning}`,
      transcript: [{ sp: 'N', pieces: toStem(s.pieces) }],
    }
  }
  return null
}

/** Dạng B: nghe câu hỏi → chọn câu đáp (3 lựa chọn, như 即時応答). */
export function buildReply(s: LessonSentence, rng: Rng): ListeningQuestion | null {
  const q = buildQuickResponse(s, rng)
  if (!q || !s.prompt) return null
  return {
    type: 'reply',
    ref: s.code,
    instruction: 'Listen to the question and choose the best reply.',
    script: [{ sp: 'N', text: q.audio! }],
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    transcript: [
      { sp: 'M', pieces: toStem(s.prompt.pieces) },
      { sp: 'F', pieces: toStem(s.pieces) },
    ],
  }
}

/** Dạng C: chép chính tả một câu ngắn của bài (chỉ câu, chủ dự án chốt 2026-11-15). */
export function buildSentenceDictation(s: LessonSentence): ListeningQuestion {
  return {
    type: 'dictation',
    ref: s.code,
    instruction: 'Listen and type the sentence you hear.',
    script: [{ sp: 'N', text: kanaOf(s.pieces) }],
    options: [],
    input: 'hiragana',
    answer: kanaOf(s.pieces),
    explanation: `${textOf(s.pieces)} — ${s.meaning}`,
    transcript: [{ sp: 'N', pieces: toStem(s.pieces) }],
  }
}

/** Số câu từng dạng của một phiên. */
export function planLesson(mode: LessonMode, count: number): Record<LessonType, number> {
  if (mode !== 'mix') return { heard_sentence: 0, sentence_meaning: 0, reply: 0, dictation: 0, [mode]: count }
  const k = count / 10
  const { mixPer10 } = LISTENING_V1
  return { heard_sentence: mixPer10.heard_sentence * k, sentence_meaning: mixPer10.sentence_meaning * k, reply: mixPer10.reply * k, dictation: mixPer10.dictation * k }
}

/** Câu chép được: chỉ kana khi đọc (không số, không chữ Latin), để chữ gõ khớp lời máy đọc. */
export const dictable = (s: LessonSentence) => /^[ぁ-ゖァ-ヺー]+$/.test(kanaOf(s.pieces).replace(PUNCT, ''))

/**
 * Dựng phiên theo bài. Mix: dạng thiếu câu thì dạng khác bù cho đủ. Câu được xen kẽ các dạng.
 * `pool`: câu của bài này và các bài trước (nhiễu nghe câu → chọn nghĩa). `recent`: mã câu đã làm gần đây
 * (ưu tiên câu chưa gặp, rồi câu cũ nhất).
 */
export function buildLessonSession(
  lesson: number,
  mode: LessonMode,
  count: number,
  sentences: readonly LessonSentence[],
  pool: readonly LessonSentence[],
  rng: Rng,
  recent: ReadonlyMap<string, number> = new Map(),
): ListeningQuestion[] {
  const fresh = <T extends { code: string }>(list: readonly T[]) => shuffle(list, rng).sort((a, b) => (recent.get(a.code) ?? 0) - (recent.get(b.code) ?? 0))
  const maxChars = LISTENING_V1.sentenceMaxChars(lesson)
  // Nguồn của từng dạng: danh sách câu (rẻ) và cách dựng câu hỏi (có thể tốn: so độ giống với cả kho). Chỉ dựng khi cần.
  const limit = LISTENING_V1.dictationMaxChars(lesson)
  const dictableList = sentences.filter(dictable)
  const sources: Record<LessonType, { items: LessonSentence[]; build: (s: LessonSentence) => ListeningQuestion | null }> = {
    sentence_meaning: { items: fresh(sentences.filter((s) => charCount(s.pieces) <= maxChars)), build: (s) => buildSentenceMeaning(s, pool, rng) },
    heard_sentence: { items: fresh(sentences.filter((s) => charCount(s.pieces) <= maxChars && (s.slots ?? []).length > 0)), build: (s) => buildHeardSentence(s, rng) },
    reply: { items: fresh(sentences.filter((s) => s.prompt)), build: (s) => buildReply(s, rng) },
    // Câu ngắn trong giới hạn của bài; thiếu thì lấy thêm câu ngắn nhất
    dictation: {
      items: [...fresh(dictableList.filter((s) => charCount(s.pieces) <= limit)), ...dictableList.filter((s) => charCount(s.pieces) > limit).sort((a, b) => charCount(a.pieces) - charCount(b.pieces))],
      build: buildSentenceDictation,
    },
  }
  const take = (type: LessonType, n: number): ListeningQuestion[] => {
    const out: ListeningQuestion[] = []
    const src = sources[type]
    while (out.length < n && src.items.length > 0) {
      const q = src.build(src.items.shift()!)
      if (q) out.push(q)
    }
    return out
  }
  const plan = planLesson(mode, count)
  const taken = Object.fromEntries(LESSON_TYPES.map((t) => [t, take(t, plan[t])])) as Record<LessonType, ListeningQuestion[]>
  // Mix: bù chỗ thiếu bằng dạng nghe theo câu khác còn câu
  let missing = count - LESSON_TYPES.reduce((n, t) => n + taken[t].length, 0)
  for (const t of GRAMMAR_LISTENING_TYPES) {
    if (mode !== 'mix' || missing <= 0) break
    const extra = take(t, missing)
    taken[t].push(...extra)
    missing -= extra.length
  }
  // Xen kẽ: lần lượt mỗi dạng một câu
  const out: ListeningQuestion[] = []
  while (LESSON_TYPES.some((t) => taken[t].length > 0)) for (const t of LESSON_TYPES) if (taken[t].length > 0) out.push(taken[t].shift()!)
  return out
}

// ---------------------------------------------------------------------------
// Chấm
// ---------------------------------------------------------------------------

const plainKana = (text: string) => text.replace(PUNCT, '')

export function gradeListening(q: ListeningQuestion, answer: unknown): { correct: boolean } | null {
  if (typeof q.answer === 'number') {
    if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) >= q.options.length) return null
    return { correct: answer === q.answer }
  }
  if (typeof answer !== 'string' || answer.length > 200) return null
  if (q.input === 'digits') return { correct: digitsOf(answer).length > 0 && digitsOf(answer) === digitsOf(q.answer) }
  return { correct: isKanaAnswerCorrect(plainKana(answer), plainKana(q.answer)) }
}

/** Chữ số trong chuỗi (đổi số toàn góc): 14:30 → 1430, 3,000円 → 3000. */
export const digitsOf = (text: string) => text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[^0-9]/g, '')

// ---------------------------------------------------------------------------
// Danh sách câu nghe sai (V2.6)
// ---------------------------------------------------------------------------

export interface ListeningLogRow {
  type: string
  ref: string
  correct: boolean
  at: number
}

/**
 * Câu đang nằm trong danh sách nghe sai: đã sai, và từ lần sai gần nhất chưa đúng liên tiếp đủ `mistakeClearStreak` lần.
 * Trả về khoá `type|ref`, câu sai lâu nhất trước.
 */
export function openMistakes(logs: readonly ListeningLogRow[]): { type: string; ref: string; since: number }[] {
  const state = new Map<string, { type: string; ref: string; since: number; streak: number; open: boolean }>()
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    const key = `${l.type}|${l.ref}`
    const cur = state.get(key) ?? { type: l.type, ref: l.ref, since: l.at, streak: 0, open: false }
    if (!l.correct) {
      if (!cur.open) cur.since = l.at
      cur.open = true
      cur.streak = 0
    } else if (cur.open && ++cur.streak >= LISTENING_V1.mistakeClearStreak) cur.open = false
    state.set(key, cur)
  }
  return [...state.values()].filter((s) => s.open).sort((a, b) => a.since - b.since).map(({ type, ref, since }) => ({ type, ref, since }))
}

/**
 * Chép chính tả: đánh dấu từng chữ của đáp án có trong câu gõ hay không (dãy con chung dài nhất),
 * để tô chỗ gõ sai. So ở dạng so sánh (Hiragana, ー thành nguyên âm).
 */
export function dictationDiff(typed: string, answer: string, input: 'hiragana' | 'katakana' = 'hiragana'): { ch: string; ok: boolean }[] {
  const a = [...kanaComparisonForm(plainKana(answer))]
  const b = [...kanaComparisonForm(plainKana(typed))]
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: { ch: string; ok: boolean }[] = []
  let i = 0
  let j = 0
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) {
      out.push({ ch: a[i], ok: true })
      i++
      j++
    } else if (j < b.length && dp[i][j + 1] >= dp[i + 1][j]) j++
    else out.push({ ch: a[i++], ok: false })
  }
  return input === 'katakana' ? out.map((c) => ({ ...c, ch: toKatakana(c.ch) })) : out
}

// ---------------------------------------------------------------------------
// Thi thử phần nghe JLPT
// ---------------------------------------------------------------------------

export const MOCK_SECTIONS = [
  { section: 1, nameJa: '課題理解', name: 'Task-based comprehension', instruction: 'Listen to the conversation and choose the answer.' },
  { section: 2, nameJa: 'ポイント理解', name: 'Key-point comprehension', instruction: 'Listen to the conversation and choose the answer.' },
  { section: 3, nameJa: '発話表現', name: 'Verbal expressions', instruction: 'Read the situation, listen, and choose what to say.' },
  { section: 4, nameJa: '即時応答', name: 'Quick response', instruction: 'Listen and choose the best reply.' },
] as const

const fromJlpt = (q: JlptQuestion, type: MockType, section: 1 | 2 | 3 | 4, transcript: ListeningQuestion['transcript'], hideOptions: boolean): ListeningQuestion => ({
  type,
  section,
  ref: `${type}:${q.ref}`,
  instruction: MOCK_SECTIONS[section - 1].instruction,
  script: q.script ?? [{ sp: 'N', text: q.audio ?? '' }],
  stem: q.stem,
  situation: q.situation,
  options: q.options,
  hideOptions,
  answer: q.answer,
  explanation: q.explanation,
  transcript,
})

export interface MockPools {
  task: readonly ListeningItem[]
  point: readonly ListeningItem[]
  verbal: readonly VerbalItem[]
  quick: readonly JlptGrammarSentence[]
}

/**
 * Một đề thi thử: đủ 4 問題 theo thứ tự, số câu như §4.2. Ưu tiên câu chưa có trong đề trước
 * (`lastUsed`: mã câu → thời điểm dùng gần nhất), rồi câu dùng lâu nhất.
 */
export function buildMock(level: JlptLevel, pools: MockPools, lastUsed: ReadonlyMap<string, number>, rng: Rng): ListeningQuestion[] {
  const [n1, n2, n3, n4] = LISTENING_V1.mock[level].sections
  const pick = <T>(list: readonly T[], refOf: (x: T) => string, n: number) => shuffle(list, rng).sort((a, b) => (lastUsed.get(refOf(a)) ?? 0) - (lastUsed.get(refOf(b)) ?? 0)).slice(0, n)
  const listening = (items: readonly ListeningItem[], section: 1 | 2, n: number) =>
    pick(items, (i) => `listening_task:${i.code}`, n).map((item) => {
      const q = contentQuestions('listening_task', item, rng)[0]
      return fromJlpt(q, 'listening_task', section, item.script.map((l) => ({ sp: l.sp, pieces: l.text.map((p) => (p.r ? { t: p.t, r: p.r } : { t: p.t })) })), false)
    })
  const verbal = pick(pools.verbal, (i) => `verbal_expressions:${i.code}`, n3).map((item) => {
    const q = contentQuestions('verbal_expressions', item, rng)[0]
    return fromJlpt(q, 'verbal_expressions', 3, q.options.map((o, i) => ({ sp: 'N' as const, pieces: [{ t: `${i + 1}. ${o}` }] })), true)
  })
  const quick = pick(pools.quick, (s) => `quick_response:${s.code}`, n4 * 3)
    .flatMap((s) => {
      const q = buildQuickResponse(s, rng)
      if (!q || !s.prompt) return []
      // Đề thật: câu hỏi rồi 3 câu đáp đều chỉ được đọc
      const script: ScriptLine[] = [{ sp: 'M', text: q.audio! }, ...q.options.map((o, i) => ({ sp: 'F' as const, text: `${i + 1}。${o}` }))]
      return [{ ...fromJlpt({ ...q, script }, 'quick_response', 4, [{ sp: 'M' as const, pieces: toStem(s.prompt.pieces) }, ...q.options.map((o, i) => ({ sp: 'F' as const, pieces: [{ t: `${i + 1}. ${o}` }] }))], true) }]
    })
    .slice(0, n4)
  return [...listening(pools.task, 1, n1), ...listening(pools.point, 2, n2), ...verbal, ...quick]
}

export interface MockSectionScore {
  section: 1 | 2 | 3 | 4
  total: number
  correct: number
}

export function scoreMock(questions: readonly ListeningQuestion[], answers: Readonly<Record<string, unknown>>): MockSectionScore[] {
  return ([1, 2, 3, 4] as const).map((section) => {
    const list = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.section === section)
    return { section, total: list.length, correct: list.filter(({ q, i }) => gradeListening(q, answers[String(i)])?.correct === true).length }
  })
}
