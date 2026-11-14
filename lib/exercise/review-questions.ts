// REV-02 — Câu hỏi khi ôn Card: gõ, và (V10) chọn Kanji trong 6 thay cho viết rồi tự chấm. Không ghép. Pure.
import type { CardType, ExerciseCode, Outcome } from '../learning/types'
import type { Rng } from './questions'
import { plainHanViet } from '../kanji/questions'
import { buildStageQuestion, type PromptData, type QuestionPools, type StageWord, type WordKnowledge } from './stage-questions'

export type ReviewQuestionData =
  /** Nghĩa → gõ Kana. */
  | { kind: 'typing'; exercise: 'kana_free_recall'; question: string; prompt: { display: string; kind: 'meaning'; hint?: string }; placeholder: string; input: 'hiragana' }
  /** Nhìn Kanji → gõ Kana và Hán Việt trong cùng một câu. Sai một ô là sai cả câu. */
  | { kind: 'kanji_read'; exercise: 'kanji_read_typing'; question: string; prompt: { display: string; kind: 'vocab' } }
  /** V10: nhìn nghĩa → chọn cách viết Kanji trong 6. Câu chọn nên đáp án có sẵn ở trình duyệt, server vẫn chấm lại. */
  | {
      kind: 'choice'
      exercise: 'kanji_recognition_6'
      question: string
      prompt: PromptData
      options: string[]
      answer: string
      optionKind: 'kana' | 'vocab' | 'meaning'
      speak: string
    }

const CARD_EXERCISES: Record<CardType, readonly ExerciseCode[]> = {
  'vocab.kana': ['kana_free_recall'],
  // V10: bỏ viết rồi tự chấm (kanji_write_self)
  'vocab.kanji': ['kanji_read_typing', 'kanji_recognition_6'],
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

/** `pools`: kho đáp án nhiễu, chỉ cần cho câu chọn Kanji trong 6. */
export function buildReviewQuestion(word: StageWord, exercise: ExerciseCode, pools?: QuestionPools, rng: Rng = Math.random): ReviewQuestionData {
  switch (exercise) {
    case 'kanji_read_typing':
      return { kind: 'kanji_read', exercise, question: 'Type its reading and Sino-Vietnamese', prompt: { display: word.expression, kind: 'vocab' } }
    case 'kanji_recognition_6': {
      if (!pools) throw new Error('kanji_recognition_6 cần kho đáp án nhiễu')
      const q = buildStageQuestion(word, exercise, pools, rng)
      if (q.kind !== 'choice') throw new Error('kanji_recognition_6 phải là câu chọn')
      return { kind: 'choice', exercise, question: q.question, prompt: q.prompt, options: q.options, answer: q.answer, optionKind: q.optionKind, speak: q.speak }
    }
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
  /** Câu tự chấm (đã bỏ ở V10; giữ trường để đọc dữ liệu cũ). */
  remembered?: boolean
}

/** Chấm theo dữ liệu thật. */
export function gradeReviewAnswer(word: StageWord, exercise: ExerciseCode, input: ReviewAnswerInput): { outcome: Outcome; answer: string } {
  const reading = word.reading_kana
  if (exercise === 'kanji_recognition_6') return { outcome: (input.answer ?? '') === word.expression ? 'correct' : 'wrong', answer: word.expression }
  if (exercise === 'kanji_read_typing') {
    const ok = (input.reading ?? '').trim() === reading && plainHanViet(input.hanViet ?? '') === plainHanViet(word.han_viet ?? '')
    return { outcome: ok ? 'correct' : 'wrong', answer: `${reading} · ${word.han_viet ?? ''}` }
  }
  return { outcome: (input.answer ?? '').trim() === reading ? 'correct' : 'wrong', answer: reading }
}

export type { WordKnowledge }
