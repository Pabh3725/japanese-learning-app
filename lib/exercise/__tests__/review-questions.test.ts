// Câu hỏi khi ôn Card: gõ, và (V10) chọn Kanji trong 6 thay cho viết rồi tự chấm.
import { describe, expect, it } from 'vitest'
import { buildReviewQuestion, chooseReviewExercise, gradeReviewAnswer, reviewExercises } from '../review-questions'
import type { QuestionPools, StageWord } from '../stage-questions'

const GAKKOU: StageWord = { id: 'w', expression: '学校', reading_kana: 'がっこう', meaning_vi: 'trường học', han_viet: 'HỌC HIỆU', is_kana_only: false, emoji: null, romaji: 'gakkou' }
const WORDS: StageWord[] = [
  GAKKOU,
  { id: 'w2', expression: '先生', reading_kana: 'せんせい', meaning_vi: 'giáo viên', han_viet: 'TIÊN SINH', is_kana_only: false, emoji: null, romaji: 'sensei' },
  { id: 'w3', expression: '学生', reading_kana: 'がくせい', meaning_vi: 'học sinh', han_viet: 'HỌC SINH', is_kana_only: false, emoji: null, romaji: 'gakusei' },
  { id: 'w4', expression: '大学', reading_kana: 'だいがく', meaning_vi: 'đại học', han_viet: 'ĐẠI HỌC', is_kana_only: false, emoji: null, romaji: 'daigaku' },
  { id: 'w6', expression: '会社', reading_kana: 'かいしゃ', meaning_vi: 'công ty', han_viet: 'HỘI XÃ', is_kana_only: false, emoji: null, romaji: 'kaisha' },
  { id: 'w7', expression: '電話', reading_kana: 'でんわ', meaning_vi: 'điện thoại', han_viet: 'ĐIỆN THOẠI', is_kana_only: false, emoji: null, romaji: 'denwa' },
  { id: 'w8', expression: '時計', reading_kana: 'とけい', meaning_vi: 'đồng hồ', han_viet: 'THỜI KẾ', is_kana_only: false, emoji: null, romaji: 'tokei' },
]
const POOLS: QuestionPools = { words: WORDS, kanji: [] }
const seeded = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296

describe('Card trong Review', () => {
  it('không có câu ghép, câu nghe hay câu tự chấm; trắc nghiệm duy nhất là chọn Kanji trong 6', () => {
    for (const type of ['vocab.kana', 'vocab.kanji', 'vocab.star_recall'] as const) {
      for (const exercise of reviewExercises(type)) {
        expect(['typing', 'kanji_read', 'choice']).toContain(buildReviewQuestion(GAKKOU, exercise, POOLS).kind)
      }
    }
    expect(reviewExercises('vocab.kanji')).not.toContain('kanji_write_self')
  })

  it('Card Kanji luân phiên hai dạng, không lặp dạng lần trước', () => {
    for (let s = 1; s < 30; s++) {
      expect(chooseReviewExercise('vocab.kanji', 'kanji_read_typing', seeded(s))).toBe('kanji_recognition_6')
      expect(chooseReviewExercise('vocab.kanji', 'kanji_recognition_6', seeded(s))).toBe('kanji_read_typing')
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

  it('chọn Kanji trong 6: đề là nghĩa, 6 lựa chọn có đáp án đúng', () => {
    const q = buildReviewQuestion(GAKKOU, 'kanji_recognition_6', POOLS, seeded(3))
    if (q.kind !== 'choice') throw new Error('sai dạng')
    expect(q.prompt.display).not.toContain('学校')
    expect(q.options).toContain('学校')
    expect(q.options.length).toBeLessThanOrEqual(6)
    expect(new Set(q.options).size).toBe(q.options.length)
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

  it('chọn Kanji trong 6: server chấm theo cách viết thật', () => {
    expect(gradeReviewAnswer(GAKKOU, 'kanji_recognition_6', { answer: '学校' }).outcome).toBe('correct')
    expect(gradeReviewAnswer(GAKKOU, 'kanji_recognition_6', { answer: '学生' }).outcome).toBe('wrong')
    expect(gradeReviewAnswer(GAKKOU, 'kanji_recognition_6', {}).outcome).toBe('wrong')
  })
})
