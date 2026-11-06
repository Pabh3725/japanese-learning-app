// VOC-02, VOC-03, VOC-07, VOC-08, AUD-02 — Chọn dạng bài, dựng câu hỏi và chấm cho Stage 2, 4, 5. Pure.
// Luật đáp án nhiễu: docs/data-spec.md §5. Câu chọn có đáp án ở trình duyệt để phản hồi ngay;
// câu ghép và câu gõ thì không, server chấm sau khi nộp. Điểm luôn theo kết quả của server.

import { EXERCISES, REQUIRED_EXERCISES, REQUIRED_SKILLS_STAGE5 } from '../learning/rules'
import { allowedExercises } from '../learning/stage'
import type { ExerciseCode, Outcome, ScoredStage, Skill } from '../learning/types'
import { isHanVietAnswerCorrect, isKanaAnswerCorrect } from './answer-normalize'
import { mixKanaPieces, pickKanaDistractors, splitKana } from './kana-pieces'
import { sameMeaning, type Rng } from './questions'
import { kanaSimilarity, kanjiSimilarity, lookalikeKanji } from './similarity'
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

/** Từ đã xem thẻ Stage 3 chưa. Chưa thì không lộ Kanji và Hán Việt. */
export function kanjiRevealed(currentStage: number): boolean {
  return currentStage >= 4
}

export function wordReveal(word: StageWord, currentStage: number): WordReveal {
  const known = kanjiRevealed(currentStage)
  return {
    expression: known && !word.is_kana_only ? word.expression : null,
    kana: word.reading_kana,
    romaji: word.romaji ?? null,
    hanViet: known ? word.han_viet : null,
    meaning: word.meaning_vi,
  }
}

export interface QuestionPools {
  /** Mọi từ, làm kho đáp án nhiễu. */
  words: readonly StageWord[]
  /** Kho chữ Kanji và âm Hán Việt cho mảnh nhiễu. */
  kanji: readonly { character: string; han_viet: string }[]
  /** Các từ người học đã gặp: được ưu tiên làm đáp án nhiễu. */
  learnedWordIds?: ReadonlySet<string>
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
  /** DAL gắn vào, vì cần biết từ đã qua Stage 3 chưa. */
  reveal?: WordReveal
  /** Câu nghe: đọc chuỗi này. Thiết bị không có giọng Nhật thì hiện prompt và đổi sang meaning_to_kana. */
  listenTo?: string
}

export interface AssemblyQuestionData extends QuestionBase {
  kind: 'assembly'
  slots: number
  pool: string[]
  pieceKind: 'kana' | 'kanji' | 'word'
  joiner?: string
  /** Kana giữ cố định xen giữa các ô (okurigana). */
  template?: ExpressionPart[]
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
// Chọn dạng bài (R9)
// ---------------------------------------------------------------------------

const SKILL_ORDER: readonly Skill[] = ['S1', 'S2', 'S3', 'S4']

/**
 * Dạng bài dùng được cho từ này. Stage 5 đã thay chọn 1/6 bằng vòng ghép ô:
 * nghĩa đơn giản thì ghép nghĩa; nghĩa không ghép được thì vẫn chọn 1/6 để còn đạt kỹ năng Nghĩa;
 * Kanji đạt kỹ năng qua ghép không gợi ý.
 */
export function usableExercises(word: StageWord, stage: ScoredStage): ExerciseCode[] {
  const canAssembleMeaning = meaningPieces(word.meaning_vi) !== null
  return allowedExercises(stage, word.is_kana_only).filter((code) => {
    if (code === 'meaning_assembly') return canAssembleMeaning
    if (code === 'meaning_recognition_6') return !canAssembleMeaning
    return code !== 'kanji_recognition_6'
  })
}

/** Ưu tiên dạng bắt buộc chưa có điểm; đủ cả rồi thì xoay vòng trong mọi dạng của stage. */
export function chooseStageExercise(
  word: StageWord,
  stage: ScoredStage,
  earned: readonly ExerciseCode[],
  rng: Rng = Math.random,
): ExerciseCode {
  const usable = usableExercises(word, stage)
  if (stage === 5) {
    const required = word.is_kana_only ? REQUIRED_SKILLS_STAGE5.kanaOnly : REQUIRED_SKILLS_STAGE5.withKanji
    const earnedSkills = new Set(earned.map((code) => EXERCISES[code].skill))
    const missingSkill = SKILL_ORDER.find((skill) => required.includes(skill) && !earnedSkills.has(skill))
    if (missingSkill) return pickOne(usable.filter((code) => EXERCISES[code].skill === missingSkill), rng)
    return pickOne(usable, rng)
  }
  const missing = REQUIRED_EXERCISES[stage].filter((code) => !earned.includes(code))
  return pickOne(missing.length > 0 ? missing : usable, rng)
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
  const ordered = pools.words
    .filter(
      (w) =>
        w.id !== target.id &&
        !sameMeaning(w.meaning_vi, target.meaning_vi) &&
        w.reading_kana !== target.reading_kana &&
        w.expression !== target.expression &&
        (w.han_viet === null || w.han_viet !== target.han_viet),
    )
    .map((word) => ({ word, value: score(word) + (learned?.has(word.id) ? LEARNED_BONUS : 0) + rng() * JITTER }))
    .sort((a, b) => b.value - a.value)

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

function isKatakanaWord(word: StageWord): boolean {
  return /^[ァ-ヺー]+$/.test(word.reading_kana)
}

function pickPieceDistractors(answer: readonly string[], candidates: readonly string[], count: number, rng: Rng): string[] {
  return shuffle([...new Set(candidates)].filter((c) => !answer.includes(c)), rng).slice(0, count)
}

/** Mảnh Kanji nhiễu: chữ dễ nhầm trước, rồi chữ trong các từ đã học, cuối cùng là bảng Kanji. */
function kanjiPieceDistractors(pieces: readonly string[], pools: QuestionPools, count: number, rng: Rng): string[] {
  const lookalike = pieces.flatMap((p) => lookalikeKanji(p)).filter((c) => !pieces.includes(c))
  const learned = pools.learnedWordIds
  const fromLearned = learned ? pools.words.filter((w) => learned.has(w.id)).flatMap((w) => kanjiPieces(w.expression)) : []
  const picked: string[] = []
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
const PROMPT_MEANING = (w: StageWord): PromptData => ({ display: w.meaning_vi, kind: 'meaning', hint: w.emoji ?? undefined })

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

const KANJI_WORD_TEXT = (w: StageWord) => (w.is_kana_only ? null : w.expression)
const HANVIET_TEXT = (w: StageWord) => w.han_viet
const MEANING_TEXT = (w: StageWord) => w.meaning_vi
const KANA_TEXT = (w: StageWord) => w.reading_kana

function kanjiAssembly(word: StageWord, pools: QuestionPools, exercise: ExerciseCode, distractors: number, prompt: PromptData, rng: Rng): AssemblyQuestionData {
  const pieces = kanjiPieces(word.expression)
  const others = kanjiPieceDistractors(pieces, pools, Math.max(distractors, pieces.length), rng)
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

function hanVietAssembly(word: StageWord, pools: QuestionPools, rng: Rng): AssemblyQuestionData {
  const pieces = hanVietPieces(word.han_viet ?? '')
  const others = pickPieceDistractors(pieces, pools.kanji.map((k) => k.han_viet), Math.max(3, pieces.length), rng)
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

export function buildStageQuestion(word: StageWord, exercise: ExerciseCode, pools: QuestionPools, rng: Rng = Math.random): QuestionData {
  switch (exercise) {
    case 'kana_to_meaning':
      return choice(word, pools, exercise, 'What does this word mean?', PROMPT_KANA(word), 'meaning', MEANING_TEXT, 4, rng, meaningScore(word))
    case 'meaning_to_kana':
      return choice(word, pools, exercise, 'Which word means this?', PROMPT_MEANING(word), 'kana', KANA_TEXT, 4, rng, kanaScore(word))
    case 'listening':
      return choice(word, pools, exercise, 'Which word did you hear?', PROMPT_MEANING(word), 'kana', KANA_TEXT, 4, rng, kanaScore(word), { listenTo: word.reading_kana })
    case 'kana_assembly': {
      const pieces = splitKana(word.reading_kana)
      return {
        kind: 'assembly',
        exercise,
        question: 'Build the reading from the pieces',
        prompt: PROMPT_MEANING(word),
        slots: pieces.length,
        pool: mixKanaPieces(pieces, pickKanaDistractors(pieces, rng), rng),
        pieceKind: 'kana',
      }
    }
    case 'kanji_recognition':
      return choice(word, pools, exercise, 'Which spelling is correct?', { ...PROMPT_KANA(word), hint: word.meaning_vi }, 'vocab', KANJI_WORD_TEXT, 4, rng, kanjiScore(word))
    case 'kanji_recognition_6':
      return choice(word, pools, exercise, 'Which spelling means this?', PROMPT_MEANING(word), 'vocab', KANJI_WORD_TEXT, 6, rng, kanjiScore(word))
    case 'kanji_assembly':
      return kanjiAssembly(word, pools, exercise, 3, { ...PROMPT_KANA(word), hint: word.meaning_vi }, rng)
    case 'kanji_assembly_nohint':
      return kanjiAssembly(word, pools, exercise, 5, PROMPT_MEANING(word), rng)
    case 'hanviet_recognition':
      return choice(word, pools, exercise, 'Which Sino-Vietnamese reading is correct?', PROMPT_WORD(word), 'meaning', HANVIET_TEXT, 4, rng, hanVietScore(word))
    case 'hanviet_assembly':
      return hanVietAssembly(word, pools, rng)
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
      const others = pickPieceDistractors(pieces, candidates, Math.max(3, pieces.length), rng)
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

export function gradeStageAnswer(word: StageWord, exercise: ExerciseCode, given: string | readonly string[]): GradeResult {
  const text = typeof given === 'string' ? given : ''
  const pieces = typeof given === 'string' ? [] : given
  const verdict = (ok: boolean, answer: string): GradeResult => ({ outcome: ok ? 'correct' : 'wrong', answer })

  switch (exercise) {
    case 'kana_to_meaning':
    case 'meaning_recognition_6':
      return verdict(text.trim() === word.meaning_vi.trim(), word.meaning_vi)
    case 'meaning_to_kana':
    case 'listening':
      return verdict(text === word.reading_kana, word.reading_kana)
    case 'kana_assembly':
      return verdict(pieces.join('') === word.reading_kana, word.reading_kana)
    case 'kana_free_recall':
      return verdict(isKanaAnswerCorrect(text, word.reading_kana), word.reading_kana)
    case 'kanji_recognition':
    case 'kanji_recognition_6':
      return verdict(text === word.expression, word.expression)
    case 'kanji_assembly':
    case 'kanji_assembly_nohint':
      return verdict(pieces.join('') === kanjiPieces(word.expression).join(''), word.expression)
    case 'hanviet_recognition':
      return verdict(text === word.han_viet, word.han_viet ?? '')
    case 'hanviet_assembly':
      return verdict(pieces.join(' ') === hanVietPieces(word.han_viet ?? '').join(' '), word.han_viet ?? '')
    case 'hanviet_free_recall':
      return verdict(isHanVietAnswerCorrect(text, word.han_viet ?? ''), word.han_viet ?? '')
    case 'meaning_assembly':
      return verdict(pieces.join(' ') === (meaningPieces(word.meaning_vi) ?? []).join(' '), word.meaning_vi)
  }
}

// ---------------------------------------------------------------------------
// Kiểm tra dữ liệu trình duyệt gửi lên
// ---------------------------------------------------------------------------

export interface StageAnswerRequest {
  learnerVocabularyId: string
  stage: ScoredStage
  exercise: ExerciseCode
  answer: string | string[]
  clientEventId: string
  responseMs?: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_TEXT = 300
const MAX_PIECES = 40

export function parseStageAnswerRequest(input: unknown): StageAnswerRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const v = input as Record<string, unknown>
  const answerOk =
    (typeof v.answer === 'string' && v.answer.length > 0 && v.answer.length <= MAX_TEXT) ||
    (Array.isArray(v.answer) &&
      v.answer.length >= 1 &&
      v.answer.length <= MAX_PIECES &&
      v.answer.every((p) => typeof p === 'string' && p.length >= 1 && p.length <= 40))
  const ok =
    typeof v.learnerVocabularyId === 'string' && UUID.test(v.learnerVocabularyId) &&
    typeof v.clientEventId === 'string' && UUID.test(v.clientEventId) &&
    (v.stage === 2 || v.stage === 4 || v.stage === 5) &&
    typeof v.exercise === 'string' && Object.hasOwn(EXERCISES, v.exercise) &&
    answerOk &&
    (v.responseMs === undefined || (typeof v.responseMs === 'number' && Number.isFinite(v.responseMs) && v.responseMs >= 0))
  if (!ok) return null
  return {
    learnerVocabularyId: v.learnerVocabularyId as string,
    stage: v.stage as ScoredStage,
    exercise: v.exercise as ExerciseCode,
    answer: v.answer as string | string[],
    clientEventId: v.clientEventId as string,
    responseMs: v.responseMs === undefined ? undefined : Math.round(v.responseMs as number),
  }
}
