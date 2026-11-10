// Câu hỏi khi ôn Card: chỉ có gõ và viết rồi tự chấm.
import { describe, expect, it } from 'vitest'
import { buildReviewQuestion, chooseReviewExercise, gradeReviewAnswer, reviewExercises } from '../review-questions'
import type { StageWord } from '../stage-questions'

const GAKKOU: StageWord = { id: 'w', expression: '学校', reading_kana: 'がっこう', meaning_vi: 'trường học', han_viet: 'HỌC HIỆU', is_kana_only: false, emoji: null, romaji: 'gakkou' }
const seeded = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296

describe('Card trong Review', () => {
  it('không có trắc nghiệm, ghép hay nghe', () => {
    for (const type of ['vocab.kana', 'vocab.kanji', 'vocab.star_recall'] as const) {
      for (const exercise of reviewExercises(type)) {
        expect(['typing', 'kanji_read', 'self']).toContain(buildReviewQuestion(GAKKOU, exercise).kind)
      }
    }
  })

  it('Card Kanji luân phiên hai dạng, không lặp dạng lần trước', () => {
    for (let s = 1; s < 30; s++) {
      expect(chooseReviewExercise('vocab.kanji', 'kanji_read_typing', seeded(s))).toBe('kanji_write_self')
      expect(chooseReviewExercise('vocab.kanji', 'kanji_write_self', seeded(s))).toBe('kanji_read_typing')
    }
    expect(chooseReviewExercise('vocab.kana', 'kana_free_recall', seeded(1))).toBe('kana_free_recall')
  })

  it('Card Kana có chú thích Hán Việt, câu nhìn Kanji không lộ đáp án', () => {
    const kana = buildReviewQuestion(GAKKOU, 'kana_free_recall')
    expect(kana.prompt).toMatchObject({ display: 'trường học', hint: 'Hán Việt: HỌC HIỆU' })
    const read = buildReviewQuestion(GAKKOU, 'kanji_read_typing')
    expect(read.prompt.display).toBe('学校')
    expect(JSON.stringify(read)).not.toContain('がっこう')
    expect(JSON.stringify(read)).not.toContain('HỌC HIỆU')
  })

  it('câu tự chấm hiện đáp án sau khi lật, đề không có Kanji', () => {
    const self = buildReviewQuestion(GAKKOU, 'kanji_write_self')
    if (self.kind !== 'self') throw new Error('sai dạng')
    expect(self.prompt.display).toBe('trường học')
    expect(self.answer).toBe('学校')
  })
})

describe('Chấm', () => {
  it('gõ Kana', () => {
    expect(gradeReviewAnswer(GAKKOU, 'kana_free_recall', { answer: 'がっこう' }).outcome).toBe('correct')
    expect(gradeReviewAnswer(GAKKOU, 'kana_free_recall', { answer: 'がこう' }).outcome).toBe('wrong')
  })

  it('nhìn Kanji: sai một ô là sai cả câu; Hán Việt không cần dấu', () => {
    expect(gradeReviewAnswer(GAKKOU, 'kanji_read_typing', { reading: 'がっこう', hanViet: 'hoc hieu' }).outcome).toBe('correct')
    expect(gradeReviewAnswer(GAKKOU, 'kanji_read_typing', { reading: 'がっこう', hanViet: 'hoc' }).outcome).toBe('wrong')
    expect(gradeReviewAnswer(GAKKOU, 'kanji_read_typing', { reading: 'がこう', hanViet: 'học hiệu' }).outcome).toBe('wrong')
  })

  it('tự chấm theo người học', () => {
    expect(gradeReviewAnswer(GAKKOU, 'kanji_write_self', { remembered: true }).outcome).toBe('correct')
    expect(gradeReviewAnswer(GAKKOU, 'kanji_write_self', { remembered: false }).outcome).toBe('wrong')
    expect(gradeReviewAnswer(GAKKOU, 'kanji_write_self', {}).outcome).toBe('wrong')
  })
})
