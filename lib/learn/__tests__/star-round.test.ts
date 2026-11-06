import { describe, expect, it } from 'vitest'
import { planStarQuestions, starRoundExercises } from '../star-round'

const known = (currentStage: number, kanjiIntroSeen = false) => ({ currentStage, kanjiIntroSeen })

describe('Vòng học thêm của từ có sao', () => {
  it('không lộ Hán Việt và Kanji trước khi giới thiệu', () => {
    const word = { is_kana_only: false, han_viet: 'HỌC' }
    expect(starRoundExercises(word, known(2))).toEqual(['meaning_to_kana', 'kana_assembly', 'kana_free_recall'])
    expect(starRoundExercises(word, known(4))).toContain('hanviet_from_kana')
    expect(starRoundExercises(word, known(4))).not.toContain('kanji_assembly')
    expect(starRoundExercises(word, known(4, true))).toContain('kanji_assembly')
  })

  it('từ chỉ có Kana không hỏi Hán Việt, Kanji; tối đa 4 câu', () => {
    expect(starRoundExercises({ is_kana_only: true, han_viet: 'X' }, known(5, true))).toEqual(['meaning_to_kana', 'kana_assembly', 'kana_free_recall'])
    expect(starRoundExercises({ is_kana_only: false, han_viet: 'X' }, known(5, true))).toHaveLength(4)
  })

  it('mỗi phiên tối đa 3 câu, lần lượt từng từ, tiếp tục từ chỗ đã làm', () => {
    const a = { word: 'a', exercises: ['meaning_to_kana', 'kana_assembly', 'kana_free_recall'] as const, answered: 1 }
    const b = { word: 'b', exercises: ['meaning_to_kana', 'kana_assembly'] as const, answered: 0 }
    expect(planStarQuestions([a, b])).toEqual([
      { word: 'a', exercise: 'kana_assembly' },
      { word: 'b', exercise: 'meaning_to_kana' },
      { word: 'a', exercise: 'kana_free_recall' },
    ])
  })

  it('xong vòng thì không còn câu', () => {
    expect(planStarQuestions([{ word: 'a', exercises: ['kana_assembly'], answered: 1 }])).toEqual([])
    expect(planStarQuestions([])).toEqual([])
  })
})
