// Câu hỏi và cách chấm của khu Kanji. Pure. Đáp án nhiễu không được tạo thêm một đáp án đúng.
import { toHiragana } from 'wanakana'
import type { Outcome } from '../learning/types'
import type { KanjiExercise } from './rules'

export interface KanjiRow {
  id: string
  character: string
  han_viet: string
  meaning_vi: string
  onyomi: string[]
  kunyomi: string[]
}

export interface KanjiReveal {
  character: string
  hanViet: string
  meaning: string
  onyomi: string[]
  kunyomi: string[]
}

export interface KanjiPrompt {
  display: string
  kind: 'vocab' | 'meaning'
}

interface QuestionBase {
  exercise: KanjiExercise
  question: string
  prompt: KanjiPrompt
  speak: string
  reveal: KanjiReveal
}

export type KanjiQuestionData =
  | (QuestionBase & { kind: 'choice'; options: string[]; answer: string; optionKind: 'kana' | 'vocab' | 'meaning'; wordId?: string })
  | (QuestionBase & { kind: 'typing'; placeholder: string; input: 'text' | 'hiragana' | 'katakana' })

/** Từ đã gặp chứa chữ này, cùng các nghĩa khác để làm đáp án nhiễu. */
export interface KanjiWordOption {
  id: string
  expression: string
  reading: string
  meaning: string
  distractors: string[]
}

type Rng = () => number

const OPTIONS = 4

/** Bỏ dấu, không phân biệt hoa thường. */
export function plainHanViet(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toLowerCase()
}

/** ひと.つ → ひとつ: dấu chấm chỉ ngăn okurigana trong dữ liệu. */
export function showReading(reading: string): string {
  return reading.replace(/\./g, '')
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function meaningWords(meaning: string): Set<string> {
  return new Set(meaning.split(/[;,]/).map((part) => part.trim().toLowerCase()).filter(Boolean))
}

const sharesMeaning = (a: KanjiRow, b: KanjiRow) => {
  const words = meaningWords(b.meaning_vi)
  return [...meaningWords(a.meaning_vi)].some((word) => words.has(word))
}
const sharesHanViet = (a: KanjiRow, b: KanjiRow) => plainHanViet(a.han_viet) === plainHanViet(b.han_viet)

function distinct(values: readonly string[], exclude: ReadonlySet<string>, rng: Rng): string[] {
  return shuffled([...new Set(values)].filter((value) => !exclude.has(value)), rng).slice(0, OPTIONS - 1)
}

function readingsOf(kanji: KanjiRow): string[] {
  return [...kanji.onyomi, ...kanji.kunyomi].map(showReading)
}

export function revealOf(kanji: KanjiRow): KanjiReveal {
  return {
    character: kanji.character,
    hanViet: kanji.han_viet,
    meaning: kanji.meaning_vi,
    onyomi: kanji.onyomi.map(showReading),
    kunyomi: kanji.kunyomi.map(showReading),
  }
}

export function buildKanjiQuestion(kanji: KanjiRow, exercise: KanjiExercise, pool: readonly KanjiRow[], word: KanjiWordOption | null = null, rng: Rng = Math.random): KanjiQuestionData {
  const others = pool.filter((other) => other.id !== kanji.id)
  const speak = readingsOf(kanji)[0] ?? ''
  const base = { exercise, speak, reveal: revealOf(kanji) }
  const character: KanjiPrompt = { display: kanji.character, kind: 'vocab' }
  const choice = (question: string, prompt: KanjiPrompt, answer: string, wrong: readonly string[], optionKind: 'kana' | 'vocab' | 'meaning'): Extract<KanjiQuestionData, { kind: 'choice' }> => ({
    ...base,
    kind: 'choice',
    question,
    prompt,
    answer,
    optionKind,
    options: shuffled([answer, ...wrong], rng),
  })

  switch (exercise) {
    case 'kanji_to_meaning': {
      const wrong = distinct(others.filter((o) => !sharesMeaning(kanji, o)).map((o) => o.meaning_vi), new Set([kanji.meaning_vi]), rng)
      return choice('What does this Kanji mean?', character, kanji.meaning_vi, wrong, 'meaning')
    }
    case 'kanji_to_hanviet': {
      const wrong = distinct(others.filter((o) => !sharesHanViet(kanji, o)).map((o) => o.han_viet), new Set([kanji.han_viet]), rng)
      return choice('What is its Sino-Vietnamese reading?', character, kanji.han_viet, wrong, 'meaning')
    }
    case 'pick_kanji': {
      const fromMeaning = rng() < 0.5
      const wrong = distinct(others.filter((o) => !sharesMeaning(kanji, o) && !sharesHanViet(kanji, o)).map((o) => o.character), new Set([kanji.character]), rng)
      return choice('Which Kanji is this?', { display: fromMeaning ? kanji.meaning_vi : kanji.han_viet, kind: 'meaning' }, kanji.character, wrong, 'vocab')
    }
    case 'kanji_reading': {
      const useOn = kanji.onyomi.length > 0 && (kanji.kunyomi.length === 0 || rng() < 0.5)
      const own = (useOn ? kanji.onyomi : kanji.kunyomi).map(showReading)
      const answer = own[Math.floor(rng() * own.length)]
      // Đáp án nhiễu cùng loại âm, và không trùng bất kỳ âm nào của chữ này
      const wrongPool = others.flatMap((o) => (useOn ? o.onyomi : o.kunyomi).map(showReading))
      const wrong = distinct(wrongPool, new Set(readingsOf(kanji)), rng)
      return choice(useOn ? 'Which is its On reading?' : 'Which is its Kun reading?', character, answer, wrong, 'kana')
    }
    case 'hanviet_typing':
      return { ...base, kind: 'typing', question: 'Type its Sino-Vietnamese reading', prompt: character, placeholder: 'No accents needed', input: 'text' }
    case 'reading_typing': {
      const useOn = kanji.onyomi.length > 0 && (kanji.kunyomi.length === 0 || rng() < 0.5)
      return {
        ...base,
        kind: 'typing',
        question: useOn ? 'Type one of its On readings' : 'Type one of its Kun readings',
        prompt: character,
        placeholder: 'Type in romaji',
        input: useOn ? 'katakana' : 'hiragana',
      }
    }
    case 'word_meaning': {
      if (!word) throw new Error('word_meaning cần một từ đã gặp')
      const wrong = distinct(word.distractors, new Set([word.meaning]), rng)
      return { ...choice(`What does this word with ${kanji.character} mean?`, { display: word.expression, kind: 'vocab' }, word.meaning, wrong, 'meaning'), speak: word.reading, wordId: word.id }
    }
  }
}

export interface KanjiGrade {
  outcome: Outcome
  answer: string
}

/** Chấm theo dữ liệu thật, không tin trình duyệt. `wordMeaning`: nghĩa thật của từ trong câu word_meaning. */
export function gradeKanjiAnswer(kanji: KanjiRow, exercise: KanjiExercise, answer: string, wordMeaning: string | null = null): KanjiGrade {
  switch (exercise) {
    case 'kanji_to_meaning':
      return { outcome: answer === kanji.meaning_vi ? 'correct' : 'wrong', answer: kanji.meaning_vi }
    case 'kanji_to_hanviet':
      return { outcome: answer === kanji.han_viet ? 'correct' : 'wrong', answer: kanji.han_viet }
    case 'pick_kanji':
      return { outcome: answer === kanji.character ? 'correct' : 'wrong', answer: kanji.character }
    case 'kanji_reading': {
      const readings = readingsOf(kanji)
      return { outcome: readings.includes(answer) ? 'correct' : 'wrong', answer: readings.join('、') }
    }
    case 'hanviet_typing':
      return { outcome: plainHanViet(answer) === plainHanViet(kanji.han_viet) ? 'correct' : 'wrong', answer: kanji.han_viet }
    case 'reading_typing': {
      // Gõ Katakana hay Hiragana đều được; đủ một âm của chữ là đúng
      const readings = readingsOf(kanji)
      const typed = toHiragana(answer.trim())
      return { outcome: readings.some((reading) => toHiragana(reading) === typed) ? 'correct' : 'wrong', answer: readings.join('、') }
    }
    case 'word_meaning':
      return { outcome: wordMeaning !== null && answer === wordMeaning ? 'correct' : 'wrong', answer: wordMeaning ?? '' }
  }
}
