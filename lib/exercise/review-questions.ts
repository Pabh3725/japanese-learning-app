// REV-02 — Dạng bài của từng loại Card và câu hỏi khi ôn. Pure. Bảng dạng bài: docs/learning-rules.md §7.
// Dùng lại câu hỏi và cách chấm của Stage, chỉ đổi đề. Card kana–Hán Việt có từ trước thẻ Hán tự nên đề không được có Kanji.

import type { CardType, ExerciseCode } from '../learning/types'
import type { Rng } from './questions'
import { buildStageQuestion, type PromptData, type QuestionData, type QuestionPools, type StageWord } from './stage-questions'
import { meaningPieces } from './word-parts'

const CARD_EXERCISES: Record<CardType, readonly ExerciseCode[]> = {
  'vocab.meaning_kana': ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly', 'listening', 'kana_free_recall'],
  'vocab.kana_hanviet': ['hanviet_from_kana', 'hanviet_assembly', 'hanviet_free_recall'],
  'vocab.meaning_kanji': ['kanji_recognition_6', 'kanji_assembly_nohint'],
  'vocab.kanji_meaning_hanviet': ['meaning_recognition_6', 'meaning_assembly', 'hanviet_recognition', 'hanviet_free_recall'],
  'vocab.meaning_hanviet': ['hanviet_free_recall', 'hanviet_assembly', 'meaning_recognition_6'],
}

/** Dạng bài dùng được cho card của từ này. Nghĩa không ghép được thì bỏ dạng ghép nghĩa. */
export function reviewExercises(type: CardType, word: StageWord): readonly ExerciseCode[] {
  return CARD_EXERCISES[type].filter((code) => code !== 'meaning_assembly' || meaningPieces(word.meaning_vi) !== null)
}

/** Xoay vòng: không lặp dạng của lần ôn trước nếu còn dạng khác. */
export function chooseReviewExercise(type: CardType, word: StageWord, last: string | null, rng: Rng = Math.random): ExerciseCode {
  const all = reviewExercises(type, word)
  const others = all.filter((code) => code !== last)
  const pool = others.length > 0 ? others : all
  return pool[Math.floor(rng() * pool.length)]
}

/** Đề theo loại card. Không có trong bảng thì giữ đề mặc định của dạng bài. */
function reviewPrompt(type: CardType, exercise: ExerciseCode, word: StageWord): PromptData | null {
  const kanaMeaning: PromptData = { display: word.reading_kana, kind: 'kana', hint: word.meaning_vi }
  const meaning: PromptData = { display: word.meaning_vi, kind: 'meaning', hint: word.emoji ?? undefined }
  const written: PromptData = { display: word.expression, kind: 'vocab' }
  const hanViet: PromptData = { display: word.han_viet ?? '', kind: 'meaning' }

  if (type === 'vocab.kana_hanviet') return kanaMeaning
  if (type === 'vocab.kanji_meaning_hanviet') return written
  if (type === 'vocab.meaning_hanviet') return exercise === 'meaning_recognition_6' ? hanViet : meaning
  return null
}

export function buildReviewQuestion(type: CardType, word: StageWord, exercise: ExerciseCode, pools: QuestionPools, rng: Rng = Math.random): QuestionData {
  const question = buildStageQuestion(word, exercise, pools, rng, { blind: true })
  const prompt = reviewPrompt(type, exercise, word)
  return prompt ? { ...question, prompt } : question
}
