// REV-02 — Câu hỏi khi ôn Card: chỉ có gõ và viết rồi tự chấm, không trắc nghiệm, không ghép. Pure.
import type { CardType, ExerciseCode, Outcome } from '../learning/types'
import type { Rng } from './questions'
import { plainHanViet } from '../kanji/questions'
import type { StageWord, WordKnowledge } from './stage-questions'

export type ReviewQuestionData =
  /** Nghĩa → gõ Kana. */
  | { kind: 'typing'; exercise: 'kana_free_recall'; question: string; prompt: { display: string; kind: 'meaning'; hint?: string }; placeholder: string; input: 'hiragana' }
  /** Nhìn Kanji → gõ Kana và Hán Việt trong cùng một câu. Sai một ô là sai cả câu. */
  | { kind: 'kanji_read'; exercise: 'kanji_read_typing'; question: string; prompt: { display: string; kind: 'vocab' } }
  /** Nhìn nghĩa → viết ra giấy hoặc nhớ trong đầu → lật thẻ → tự chấm. */
  | { kind: 'self'; exercise: 'kanji_write_self'; question: string; prompt: { display: string; kind: 'meaning'; hint?: string }; reading: string; answer: string }

const CARD_EXERCISES: Record<CardType, readonly ExerciseCode[]> = {
  'vocab.kana': ['kana_free_recall'],
  'vocab.kanji': ['kanji_read_typing', 'kanji_write_self'],
  'vocab.star_recall': ['kana_free_recall'],
}

export function reviewExercises(type: CardType): readonly ExerciseCode[] {
  return CARD_EXERCISES[type]
}

/** Xoay vòng: không lặp dạng của lần ôn trước nếu còn dạng khác. */
export function chooseReviewExercise(type: CardType, last: string | null, rng: Rng = Math.random): ExerciseCode {
  const all = reviewExercises(type)
  const others = all.filter((code) => code !== last)
  const pool = others.length > 0 ? others : all
  return pool[Math.floor(rng() * pool.length)]
}

const meaningPrompt = (word: StageWord) => ({
  display: word.meaning_vi,
  kind: 'meaning' as const,
  hint: word.han_viet ? `Hán Việt: ${word.han_viet}` : undefined,
})

export function buildReviewQuestion(word: StageWord, exercise: ExerciseCode): ReviewQuestionData {
  switch (exercise) {
    case 'kanji_read_typing':
      return { kind: 'kanji_read', exercise, question: 'Type its reading and Sino-Vietnamese', prompt: { display: word.expression, kind: 'vocab' } }
    case 'kanji_write_self':
      return { kind: 'self', exercise, question: 'Write this word in Kanji, then check', prompt: meaningPrompt(word), reading: word.reading_kana, answer: word.expression }
    default:
      return { kind: 'typing', exercise: 'kana_free_recall', question: 'Type this word in Kana', prompt: meaningPrompt(word), placeholder: 'Type in romaji', input: 'hiragana' }
  }
}

export interface ReviewAnswerInput {
  /** Câu gõ Kana. */
  answer?: string
  /** Câu nhìn Kanji. */
  reading?: string
  hanViet?: string
  /** Câu tự chấm. */
  remembered?: boolean
}

/** Chấm theo dữ liệu thật. Câu tự chấm dựa vào người học. */
export function gradeReviewAnswer(word: StageWord, exercise: ExerciseCode, input: ReviewAnswerInput): { outcome: Outcome; answer: string } {
  const reading = word.reading_kana
  if (exercise === 'kanji_write_self') return { outcome: input.remembered === true ? 'correct' : 'wrong', answer: word.expression }
  if (exercise === 'kanji_read_typing') {
    const ok = (input.reading ?? '').trim() === reading && plainHanViet(input.hanViet ?? '') === plainHanViet(word.han_viet ?? '')
    return { outcome: ok ? 'correct' : 'wrong', answer: `${reading} · ${word.han_viet ?? ''}` }
  }
  return { outcome: (input.answer ?? '').trim() === reading ? 'correct' : 'wrong', answer: reading }
}

export type { WordKnowledge }
