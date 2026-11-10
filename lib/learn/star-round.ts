// Dấu sao: chọn câu cho vòng học thêm. Pure.
import type { WordKnowledge } from '../exercise/stage-questions'
import type { ExerciseCode, Skill } from '../learning/types'

/** Mỗi phiên Learn chèn tối đa từng này câu của từ có sao. */
export const STAR_QUESTIONS_PER_SESSION = 3
const ROUND_SIZE = 4

type StarWord = { is_kana_only: boolean; han_viet: string | null }

/** Các câu của một vòng, từ dễ tới khó, chỉ dùng những gì từ này đã được giới thiệu. */
export function starRoundExercises(word: StarWord, known: WordKnowledge): ExerciseCode[] {
  const list: ExerciseCode[] = ['meaning_to_kana', 'kana_assembly']
  if (!word.is_kana_only && word.han_viet && known.currentStage >= 3) list.push('hanviet_from_kana')
  if (!word.is_kana_only && known.kanjiIntroSeen) list.push('kanji_assembly')
  list.push('kana_free_recall')
  return list.slice(0, ROUND_SIZE)
}

export interface StarRoundItem<T> {
  word: T
  exercises: readonly ExerciseCode[]
  answered: number
}

/** Lần lượt mỗi từ một câu, để phiên không dồn nhiều câu của cùng một từ khi còn từ khác. */
export function planStarQuestions<T>(items: readonly StarRoundItem<T>[], max: number = STAR_QUESTIONS_PER_SESSION): { word: T; exercise: ExerciseCode }[] {
  const plan: { word: T; exercise: ExerciseCode }[] = []
  for (let offset = 0; plan.length < max; offset++) {
    const open = items.filter((item) => item.answered + offset < item.exercises.length)
    if (open.length === 0) break
    for (const item of open) {
      if (plan.length >= max) break
      plan.push({ word: item.word, exercise: item.exercises[item.answered + offset] })
    }
  }
  return plan
}

const SKILL_CODES: Record<Skill, 'meaning' | 'kana' | 'kanji' | 'han_viet'> = { S1: 'meaning', S2: 'kana', S3: 'kanji', S4: 'han_viet' }

export function practiceSkillCode(skill: Skill) {
  return SKILL_CODES[skill]
}
