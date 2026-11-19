
import type { ExerciseCode, Outcome } from '../learning/types'
import { KANA_DISTRACTORS_MAX, mixKanaPieces, pickKanaDistractors, splitKana } from './kana-pieces'
import { sameMeaning, type Rng } from './questions'
import { kanaSimilarity, kanjiSimilarity, lookalikeKanji } from './similarity'
import { rankByTier, TIER_LEARNED } from '../kanji/distractor-tier'
import { expressionTemplate, hanVietPieces, kanjiPieces, meaningPieces, type ExpressionPart } from './word-parts'

export interface StageWord {
  id: string
  expression: string
  reading_kana: string
  meaning_vi: string
  han_viet: string | null
  is_kana_only: boolean
  emoji?: string | null
  romaji?: string | null
}

/** Toàn bộ thông tin của từ, hiện khi trả lời sai. Câu ghép và câu gõ chỉ nhận sau khi đã nộp. */
export interface WordReveal {
  /** null khi từ chỉ có Kana. */
  expression: string | null
  kana: string
  romaji: string | null
  hanViet: string | null
  meaning: string
}

export interface KanjiRow {
  character: string
  han_viet: string
  meaning_vi: string
}

export interface QuestionPools {
  /** Mọi từ, làm kho đáp án nhiễu. */
  words: readonly StageWord[]
  /** Kho chữ Kanji và âm Hán Việt cho mảnh nhiễu. */
  kanji: readonly KanjiRow[]
  /** Các từ người học đã gặp: được ưu tiên làm đáp án nhiễu. */
  learnedWordIds?: ReadonlySet<string>
  /**
   * Bậc ưu tiên của một chữ Kanji khi làm đáp án nhiễu (lib/kanji/distractor-tier.ts): chữ đã học trước, rồi chữ sắp học
   * cùng cấp. Có thì câu dính tới Kanji chỉ lấy nhiễu theo bậc này, để chữ quen không tự lộ đáp án. Không có thì như cũ.
   */
  kanjiTier?: (character: string) => number
}

export interface PromptData {
  display: string
  kind: 'kana' | 'vocab' | 'meaning'
  hint?: string
}

interface QuestionBase {
  exercise: ExerciseCode
  question: string
  prompt: PromptData
}

export interface ChoiceQuestionData extends QuestionBase {
  kind: 'choice'
  options: string[]
  answer: string
  optionKind: 'kana' | 'vocab' | 'meaning'
  /** Đọc Kana này sau khi trả lời. Câu chọn đã có đáp án ở trình duyệt nên không lộ thêm gì. */
  speak: string
  /** DAL gắn vào, vì cần biết từ đã xem thẻ Stage 4 chưa. */
  reveal?: WordReveal
  /** Câu nghe: đọc chuỗi này. Thiết bị không có giọng Nhật thì hiện prompt và đổi sang dạng thay thế. */
  listenTo?: string
  /** Dạng thay thế có cùng đáp án khi không có giọng Nhật. */
  noVoice?: { exercise: ExerciseCode; question: string }
}

export interface AssemblyQuestionData extends QuestionBase {
  kind: 'assembly'
  slots: number
  pool: string[]
  pieceKind: 'kana' | 'kanji' | 'word'
  joiner?: string
  /** Kana giữ cố định xen giữa các ô (okurigana). */
  template?: ExpressionPart[]
  /** Không cho biết trước có bao nhiêu ô: người học tự nhớ, cần thì bấm gợi ý. */
  blind?: boolean
}

export interface TypingQuestionData extends QuestionBase {
  kind: 'typing'
  placeholder: string
  /** Cách đổi chữ khi gõ. */
  input: 'hiragana' | 'katakana' | 'text'
}

export type QuestionData = ChoiceQuestionData | AssemblyQuestionData | TypingQuestionData

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]
}

// ---------------------------------------------------------------------------
// Đáp án nhiễu
// ---------------------------------------------------------------------------

/** Điểm của một ứng viên đáp án nhiễu: càng cao càng được ưu tiên. */
type DistractorScore = (candidate: StageWord) => number

/** Đủ lớn để luôn ưu tiên hơn mọi tiêu chí khác cộng lại. */
const SAME_SCRIPT_BONUS = 100
const LEARNED_BONUS = 3
/** Độ ngẫu nhiên, để cùng một từ không lúc nào cũng ra đúng các đáp án nhiễu giống nhau. */
const JITTER = 2

/**
 * Chọn đáp án nhiễu từ các từ khác. Luôn loại: chính nó, cùng nghĩa, cùng cách đọc, cùng cách viết, cùng Hán Việt,
 * để câu hỏi không bao giờ có hai đáp án đúng (data-spec §5). Trong số còn lại, ưu tiên ứng viên có điểm cao.
 */
function pickWordDistractors(
  target: StageWord,
  pools: QuestionPools,
  textOf: (word: StageWord) => string | null,
  count: number,
  rng: Rng,
  score: DistractorScore,
): string[] {
  const learned = pools.learnedWordIds
  // Lựa chọn hiện chữ Kanji hoặc Hán Việt: từ mà mọi chữ đều đã học được lấy trước (bậc của từ = bậc của chữ khó nhất)
  const tier = pools.kanjiTier
  const kanjiText = textOf === KANJI_WORD_TEXT || textOf === HANVIET_TEXT
  const wordTier = (w: StageWord) => (tier && kanjiText ? Math.max(0, ...kanjiPieces(w.expression).map(tier)) : 0)
  const ordered = pools.words
    .filter(
      (w) =>
        w.id !== target.id &&
        !sameMeaning(w.meaning_vi, target.meaning_vi) &&
        w.reading_kana !== target.reading_kana &&
        w.expression !== target.expression &&
        (w.han_viet === null || w.han_viet !== target.han_viet),
    )
    .map((word) => ({ word, tier: wordTier(word), value: score(word) + (learned?.has(word.id) ? LEARNED_BONUS : 0) + rng() * JITTER }))
    .sort((a, b) => a.tier - b.tier || b.value - a.value)

  const answer = textOf(target)
  const picked: string[] = []
  for (const { word } of ordered) {
    const text = textOf(word)
    if (!text || text === answer || picked.includes(text)) continue
    picked.push(text)
    if (picked.length === count) return picked
  }
  throw new Error(`Không đủ đáp án nhiễu cho từ ${target.id}`)
}

/**
 * Câu chọn nghĩa của một chữ Kanji trong từ. Đáp án nhiễu không lấy nghĩa của chữ khác trong cùng từ,
 * vì server chấm đúng khi đáp án là nghĩa của bất kỳ chữ nào trong từ. Chữ dễ nhầm được ưu tiên.
 */
function kanjiCharMeaning(word: StageWord, pools: QuestionPools, rng: Rng): ChoiceQuestionData {
  const byChar = new Map(pools.kanji.map((k) => [k.character, k]))
  const chars = [...new Set(kanjiPieces(word.expression))].filter((c) => byChar.has(c))
  const char = pickOne(chars, rng)
  const answer = byChar.get(char)!.meaning_vi
  const ownMeanings = new Set(chars.map((c) => byChar.get(c)!.meaning_vi))
  const lookalike = new Set(lookalikeKanji(char))
  const options = pools.kanji
    .filter((k) => !ownMeanings.has(k.meaning_vi) && !chars.includes(k.character))
    .map((k) => ({ meaning: k.meaning_vi, tier: pools.kanjiTier?.(k.character) ?? 0, value: (lookalike.has(k.character) ? 3 : 0) + rng() * JITTER }))
    .sort((a, b) => a.tier - b.tier || b.value - a.value)
    .map((o) => o.meaning)
  return {
    kind: 'choice',
    exercise: 'kanji_char_meaning',
    question: 'What does this Kanji mean?',
    prompt: { display: char, kind: 'vocab' },
    optionKind: 'meaning',
    answer,
    speak: word.reading_kana,
    options: shuffle([answer, ...[...new Set(options)].slice(0, 3)], rng),
  }
}

export function isKatakanaWord(word: StageWord): boolean {
  return /^[ァ-ヺー]+$/.test(word.reading_kana)
}

function pickPieceDistractors(answer: readonly string[], candidates: readonly string[], count: number, rng: Rng): string[] {
  return shuffle([...new Set(candidates)].filter((c) => !answer.includes(c)), rng).slice(0, count)
}

/** Mảnh Kanji nhiễu: chữ dễ nhầm trước, rồi chữ trong các từ đã học, cuối cùng là bảng Kanji. */
function kanjiPieceDistractors(pieces: readonly string[], pools: QuestionPools, count: number, rng: Rng): string[] {
  const lookalike = pieces.flatMap((p) => lookalikeKanji(p)).filter((c) => !pieces.includes(c))
  const tier = pools.kanjiTier
  const picked: string[] = []
  if (tier) {
    // Chữ dễ nhầm đã học trước, rồi chữ đã học, rồi chữ sắp học cùng cấp
    const learnedLookalike = shuffle(lookalike.filter((c) => tier(c) === TIER_LEARNED), rng)
    const ranked = rankByTier(pools.kanji.map((k) => k.character), tier, rng)
    for (const char of [...learnedLookalike, ...ranked]) {
      if (picked.length < count && !pieces.includes(char) && !picked.includes(char) && char !== '々') picked.push(char)
    }
    return picked
  }
  const learned = pools.learnedWordIds
  const fromLearned = learned ? pools.words.filter((w) => learned.has(w.id)).flatMap((w) => kanjiPieces(w.expression)) : []
  for (const source of [lookalike, fromLearned, pools.kanji.map((k) => k.character)]) {
    for (const char of pickPieceDistractors(pieces, source, count, rng)) {
      if (picked.length < count && !picked.includes(char) && char !== '々') picked.push(char)
    }
  }
  return picked
}

// ---------------------------------------------------------------------------
// Dựng câu hỏi
// ---------------------------------------------------------------------------

const PROMPT_KANA = (w: StageWord): PromptData => ({ display: w.reading_kana, kind: 'kana' })
const PROMPT_WORD = (w: StageWord): PromptData => ({ display: w.expression, kind: 'vocab' })
/** Emoji chỉ hiện khi đề là nghĩa: ở đề kana, emoji sẽ làm lộ đáp án nghĩa. */
const PROMPT_MEANING = (w: StageWord): PromptData => ({
  display: w.meaning_vi,
  kind: 'meaning',
  // Có hiện nghĩa thì có chú thích Hán Việt, để làm quen trước khi học Kanji
  hint: [w.emoji, w.han_viet ? `Hán Việt: ${w.han_viet}` : null].filter(Boolean).join(' · ') || undefined,
})

function choice(
  word: StageWord,
  pools: QuestionPools,
  exercise: ExerciseCode,
  question: string,
  prompt: PromptData,
  optionKind: ChoiceQuestionData['optionKind'],
  textOf: (w: StageWord) => string | null,
  count: number,
  rng: Rng,
  score: DistractorScore,
  extra: Partial<ChoiceQuestionData> = {},
): ChoiceQuestionData {
  const answer = textOf(word)
  if (!answer) throw new Error(`Từ ${word.id} không có dữ liệu cho dạng ${exercise}`)
  return {
    kind: 'choice',
    exercise,
    question,
    prompt,
    optionKind,
    answer,
    speak: word.reading_kana,
    options: shuffle([answer, ...pickWordDistractors(word, pools, textOf, count - 1, rng, score)], rng),
    ...extra,
  }
}

/** Chọn Kana: cùng kiểu chữ để không đoán được nhờ nhìn kiểu chữ; cách đọc gần nhau trước. */
function kanaScore(word: StageWord): DistractorScore {
  const katakana = isKatakanaWord(word)
  return (w) => (isKatakanaWord(w) === katakana ? SAME_SCRIPT_BONUS : 0) + kanaSimilarity(word.reading_kana, w.reading_kana)
}

/** Chọn cách viết: chung chữ hoặc có chữ dễ nhầm trước. */
function kanjiScore(word: StageWord): DistractorScore {
  return (w) => (w.is_kana_only ? 0 : kanjiSimilarity(word.expression, w.expression))
}

/** Chọn Hán Việt: chung âm và cùng số âm trước. */
function hanVietScore(word: StageWord): DistractorScore {
  const target = hanVietPieces(word.han_viet ?? '')
  return (w) => {
    const other = hanVietPieces(w.han_viet ?? '')
    return (other.length === target.length ? 1 : 0) + other.filter((p) => target.includes(p)).length * 2
  }
}

/** Chọn nghĩa: từ đã học được cộng điểm chung; ở đây chỉ ưu tiên nghĩa dài tương đương, để độ dài không lộ đáp án. */
function meaningScore(word: StageWord): DistractorScore {
  const length = word.meaning_vi.length
  return (w) => (Math.abs(w.meaning_vi.length - length) <= 6 ? 1 : 0)
}

const KANJI_FROM_HANVIET = 'Which Kanji has this Sino-Vietnamese reading?'
const KANJI_WORD_TEXT = (w: StageWord) => (w.is_kana_only ? null : w.expression)
const HANVIET_TEXT = (w: StageWord) => w.han_viet
const MEANING_TEXT = (w: StageWord) => w.meaning_vi
const KANA_TEXT = (w: StageWord) => w.reading_kana

/** Mỗi phím chọn một mảnh, nên một câu có tối đa 18 mảnh. */
const MAX_POOL = 18
const MAX_EXTRA_DISTRACTORS = 3

/** Thêm ngẫu nhiên vài mảnh nhiễu, để tổng số mảnh không cho biết đáp án dài bao nhiêu. */
function extraDistractors(rng: Rng): number {
  return Math.floor(rng() * (MAX_EXTRA_DISTRACTORS + 1))
}

function kanjiAssembly(word: StageWord, pools: QuestionPools, exercise: ExerciseCode, distractors: number, prompt: PromptData, rng: Rng, extra: number): AssemblyQuestionData {
  const pieces = kanjiPieces(word.expression)
  const others = kanjiPieceDistractors(pieces, pools, Math.min(MAX_POOL - pieces.length, Math.max(distractors, pieces.length) + extra), rng)
  return {
    kind: 'assembly',
    exercise,
    question: 'Build the Kanji from the pieces',
    prompt,
    slots: pieces.length,
    pool: mixKanaPieces(pieces, others, rng),
    pieceKind: 'kanji',
    template: expressionTemplate(word.expression),
  }
}

function hanVietAssembly(word: StageWord, pools: QuestionPools, rng: Rng, extra: number): AssemblyQuestionData {
  const pieces = hanVietPieces(word.han_viet ?? '')
  const count = Math.min(MAX_POOL - pieces.length, Math.max(3, pieces.length) + extra)
  const tier = pools.kanjiTier
  const others = tier
    ? [...new Set(rankByTier(pools.kanji, (k) => tier(k.character), rng).map((k) => k.han_viet))].filter((h) => !pieces.includes(h)).slice(0, count)
    : pickPieceDistractors(pieces, pools.kanji.map((k) => k.han_viet), count, rng)
  return {
    kind: 'assembly',
    exercise: 'hanviet_assembly',
    question: 'Build the Sino-Vietnamese reading',
    prompt: PROMPT_WORD(word),
    slots: pieces.length,
    pool: mixKanaPieces(pieces, others, rng),
    pieceKind: 'word',
    joiner: ' ',
  }
}

export interface BuildOptions {
  /** Stage 3, 6 và Review: giấu số ô và thêm mảnh nhiễu ngẫu nhiên. */
  blind?: boolean
}

export function buildStageQuestion(word: StageWord, exercise: ExerciseCode, pools: QuestionPools, rng: Rng = Math.random, options: BuildOptions = {}): QuestionData {
  const blind = options.blind === true
  const extra = blind ? extraDistractors(rng) : 0
  if (exercise === 'kanji_read_typing' || exercise === 'kanji_write_self') throw new Error(`${exercise} chỉ dùng ở Review`)
  const question = buildQuestion(word, exercise, pools, rng, extra)
  return blind && question.kind === 'assembly' ? { ...question, blind: true } : question
}

function buildQuestion(word: StageWord, exercise: Exclude<ExerciseCode, 'kanji_read_typing' | 'kanji_write_self'>, pools: QuestionPools, rng: Rng, extra: number): QuestionData {
  switch (exercise) {
    case 'kana_to_meaning':
      return choice(word, pools, exercise, 'What does this word mean?', PROMPT_KANA(word), 'meaning', MEANING_TEXT, 4, rng, meaningScore(word))
    case 'meaning_to_kana':
      return choice(word, pools, exercise, 'Which word means this?', PROMPT_MEANING(word), 'kana', KANA_TEXT, 4, rng, kanaScore(word))
    case 'listening':
      return choice(word, pools, exercise, 'Which word did you hear?', PROMPT_MEANING(word), 'kana', KANA_TEXT, 4, rng, kanaScore(word), {
        listenTo: word.reading_kana,
        noVoice: { exercise: 'meaning_to_kana', question: 'Which word means this?' },
      })
    case 'listening_kanji':
      return choice(word, pools, exercise, 'Which word did you hear?', { display: word.han_viet ?? '', kind: 'meaning' }, 'vocab', KANJI_WORD_TEXT, 4, rng, kanjiScore(word), {
        listenTo: word.reading_kana,
        noVoice: { exercise: 'kanji_recognition', question: KANJI_FROM_HANVIET },
      })
    case 'kana_assembly': {
      const pieces = splitKana(word.reading_kana)
      return {
        kind: 'assembly',
        exercise,
        question: 'Build the reading from the pieces',
        prompt: PROMPT_MEANING(word),
        slots: pieces.length,
        pool: mixKanaPieces(pieces, pickKanaDistractors(pieces, rng, Math.min(extra, Math.max(0, MAX_POOL - pieces.length - KANA_DISTRACTORS_MAX))), rng),
        pieceKind: 'kana',
      }
    }
    case 'hanviet_from_kana':
      // Đề không có Kanji: bước này người học mới biết Hán Việt
      return choice(word, pools, exercise, 'Which Sino-Vietnamese reading is correct?', { ...PROMPT_KANA(word), hint: word.meaning_vi }, 'meaning', HANVIET_TEXT, 4, rng, hanVietScore(word))
    case 'kanji_char_meaning':
      return kanjiCharMeaning(word, pools, rng)
    case 'kanji_recognition':
      return choice(word, pools, exercise, KANJI_FROM_HANVIET, { display: word.han_viet ?? '', kind: 'meaning' }, 'vocab', KANJI_WORD_TEXT, 4, rng, kanjiScore(word))
    case 'kanji_recognition_6':
      return choice(word, pools, exercise, 'Which spelling means this?', PROMPT_MEANING(word), 'vocab', KANJI_WORD_TEXT, 6, rng, kanjiScore(word))
    case 'kanji_assembly':
      return kanjiAssembly(word, pools, exercise, 3, { ...PROMPT_KANA(word), hint: word.meaning_vi }, rng, extra)
    case 'kanji_assembly_nohint':
      return kanjiAssembly(word, pools, exercise, 5, PROMPT_MEANING(word), rng, extra)
    case 'hanviet_recognition':
      return choice(word, pools, exercise, 'Which Sino-Vietnamese reading is correct?', PROMPT_WORD(word), 'meaning', HANVIET_TEXT, 4, rng, hanVietScore(word))
    case 'hanviet_assembly':
      return hanVietAssembly(word, pools, rng, extra)
    case 'hanviet_free_recall':
      return {
        kind: 'typing',
        exercise,
        question: 'Type the Sino-Vietnamese reading',
        prompt: PROMPT_WORD(word),
        placeholder: 'hoc hieu',
        input: 'text',
      }
    case 'kana_free_recall':
      return {
        kind: 'typing',
        exercise,
        question: 'Type the reading in romaji',
        prompt: PROMPT_MEANING(word),
        placeholder: 'romaji',
        input: isKatakanaWord(word) ? 'katakana' : 'hiragana',
      }
    case 'meaning_recognition_6':
      return choice(word, pools, exercise, 'What does this word mean?', PROMPT_KANA(word), 'meaning', MEANING_TEXT, 6, rng, meaningScore(word))
    case 'meaning_assembly': {
      const pieces = meaningPieces(word.meaning_vi)
      if (!pieces) throw new Error(`Nghĩa của từ ${word.id} không ghép được`)
      const candidates = pools.words.flatMap((w) => meaningPieces(w.meaning_vi) ?? [])
      const others = pickPieceDistractors(pieces, candidates, Math.max(3, pieces.length) + extra, rng)
      return {
        kind: 'assembly',
        exercise,
        question: 'Build the meaning from the pieces',
        prompt: PROMPT_KANA(word),
        slots: pieces.length,
        pool: mixKanaPieces(pieces, others, rng),
        pieceKind: 'word',
        joiner: ' ',
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Chấm — chỉ server dùng để tính điểm
// ---------------------------------------------------------------------------

export interface GradeResult {
  outcome: Outcome
  /** Đáp án để hiện sau khi nộp. */
  answer: string
}
