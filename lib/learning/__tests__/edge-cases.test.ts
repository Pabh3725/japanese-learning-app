// Trường hợp biên ngoài 10 ví dụ ENG-01.
import { describe, expect, it } from 'vitest'
import {
  applyPracticeToCard,
  applyReviewToCard,
  applyStageAttempt,
  cardsToCreate,
  completeIntro,
  hasPassedStage,
  newCardState,
  nextStage,
  nextStudyDayStart,
  scoreReview,
  shouldRetire,
  studyDate,
} from '../index'
import { vn, word } from './helpers'

describe('Ngày học theo giờ Việt Nam', () => {
  it('16:59 UTC vẫn là ngày cũ, 17:00 UTC sang ngày mới', () => {
    expect(studyDate(new Date('2026-11-01T16:59:59Z'))).toBe('2026-11-01')
    expect(studyDate(new Date('2026-11-01T17:00:00Z'))).toBe('2026-11-02')
  })

  it('00:00 ngày kế tiếp, kể cả qua cuối tháng', () => {
    expect(nextStudyDayStart(vn('2026-11-30 23:59')).toISOString()).toBe('2026-11-30T17:00:00.000Z')
  })

  it('trần +3 và giãn cách reset lúc 00:00 giờ VN', () => {
    const s = word({ stage: 2, points: 3, plusToday: 3, plusDate: '2026-11-01', lastSeq: 40, lastSeqDate: '2026-11-01' })
    const late = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 45, now: vn('2026-11-01 23:59') })
    expect(late.delta).toBe(0)
    const early = applyStageAttempt(late.state, {
      exercise: 'kana_to_meaning',
      outcome: 'correct',
      seq: 1,
      now: vn('2026-11-02 00:01'),
    })
    expect(early.delta).toBe(1)
  })
})

describe('Điểm stage', () => {
  it('spam 5 câu đúng liền nhau chỉ được +1', () => {
    let s = word({ stage: 2 })
    let total = 0
    for (let seq = 1; seq <= 5; seq++) {
      const r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq, now: vn('2026-11-01 20:00') })
      total += r.delta
      s = r.state
    }
    expect(total).toBe(1)
  })

  it('đúng nhờ gợi ý: 0 điểm, vẫn tính là câu hợp lệ, không thỏa yêu cầu bắt buộc', () => {
    const r = applyStageAttempt(word({ stage: 2 }), {
      exercise: 'kana_assembly',
      outcome: 'hint',
      seq: 1,
      now: vn('2026-11-01 20:00'),
    })
    expect(r.delta).toBe(0)
    expect(r.counted).toBe(true)
    expect(r.state.earned).toEqual([])
  })

  it('sai sau khi chạm trần vẫn bị trừ', () => {
    const s = word({ stage: 2, points: 3, plusToday: 3, plusDate: '2026-11-01' })
    const r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 1, now: vn('2026-11-01 20:00') })
    expect(r.delta).toBe(-1)
  })

  it('Stage 1 và 3 không nhận câu tính điểm', () => {
    expect(() =>
      applyStageAttempt(word({ stage: 1 }), { exercise: 'kana_to_meaning', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') }),
    ).toThrow()
    expect(() =>
      applyStageAttempt(word({ stage: 3 }), { exercise: 'kanji_recognition', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') }),
    ).toThrow()
  })

  it('dạng bài không thuộc Stage bị từ chối', () => {
    expect(() =>
      applyStageAttempt(word({ stage: 2 }), { exercise: 'kanji_assembly', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') }),
    ).toThrow()
  })

  it('Stage 4 nhận câu củng cố Kana/nghĩa nhưng câu đó không thay yêu cầu bắt buộc', () => {
    const s = word({ stage: 4, points: 4, earned: ['kanji_recognition', 'kanji_assembly', 'hanviet_recognition'] })
    const r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') })
    expect(r.state.points).toBe(5)
    expect(r.passedStage).toBe(null)
  })

  it('Stage 5 từ có Kanji cần đủ S1–S4', () => {
    const base = { stage: 5 as const, points: 5 }
    expect(hasPassedStage(word({ ...base, earned: ['meaning_assembly', 'kana_free_recall', 'kanji_recognition_6'] }))).toBe(false)
    expect(
      hasPassedStage(word({ ...base, earned: ['meaning_assembly', 'kana_free_recall', 'kanji_recognition_6', 'hanviet_free_recall'] })),
    ).toBe(true)
  })

  it('đủ yêu cầu bắt buộc nhưng chưa đủ 5 điểm thì chưa qua', () => {
    const s = word({ stage: 2, points: 3, earned: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'] })
    expect(hasPassedStage(s)).toBe(false)
  })
})

describe('Luồng Stage và tạo card', () => {
  it('nextStage', () => {
    expect(nextStage(1, false)).toBe(2)
    expect(nextStage(2, false)).toBe(3)
    expect(nextStage(2, true)).toBe(5)
    expect(nextStage(4, false)).toBe(5)
    expect(nextStage(5, true)).toBe('complete')
  })

  it('cardsToCreate', () => {
    expect(cardsToCreate(1, false)).toEqual([])
    expect(cardsToCreate(2, true)).toEqual(['vocab.meaning_kana'])
    expect(cardsToCreate(4, false)).toEqual(['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet'])
    expect(cardsToCreate(5, false)).toEqual(['vocab.meaning_hanviet'])
    expect(cardsToCreate(5, true)).toEqual([])
  })

  it('completeIntro chỉ cho Stage 1 và 3', () => {
    expect(() => completeIntro(word({ stage: 2 }))).toThrow()
  })
})

describe('Rating review', () => {
  it('Easy chỉ cho bài gõ/ghép và dưới 3 giây', () => {
    expect(scoreReview({ exercise: 'kana_free_recall', outcome: 'correct', responseMs: 2000 }).rating).toBe('Easy')
    expect(scoreReview({ exercise: 'listening', outcome: 'correct', responseMs: 500 }).rating).toBe('Good')
    expect(scoreReview({ exercise: 'kana_free_recall', outcome: 'correct', responseMs: 3000 }).rating).toBe('Good')
  })
})

describe('Điểm card', () => {
  it('practice: trần chỉ áp cho điểm cộng', () => {
    const card = { ...newCardState('vocab.meaning_kana', false), practicePlusToday: 3, practiceDate: '2026-11-01' }
    expect(applyPracticeToCard(card, 'wrong', vn('2026-11-01 20:00')).delta).toBe(-1)
  })

  it('điểm card có thể âm', () => {
    const r = applyReviewToCard(newCardState('vocab.meaning_kanji', false), {
      exercise: 'kanji_assembly',
      outcome: 'wrong',
      responseMs: 4000,
    })
    expect(r.card.points).toBe(-1)
  })

  it('card đã bỏ hoặc tạm ngưng không đổi điểm', () => {
    for (const status of ['retired', 'suspended'] as const) {
      const card = { ...newCardState('vocab.meaning_kana', false), status, points: 10 }
      const r = applyReviewToCard(card, { exercise: 'kana_to_meaning', outcome: 'correct', responseMs: 1000 })
      expect(r.card.points).toBe(10)
      expect(r.delta).toBe(0)
    }
  })

  it('hira–Hán Việt bỏ ở 40; các card khác không bao giờ bỏ', () => {
    expect(shouldRetire({ type: 'vocab.kana_hanviet', points: 39, wordIsKanaOnly: false })).toBe(false)
    expect(shouldRetire({ type: 'vocab.kana_hanviet', points: 40, wordIsKanaOnly: false })).toBe(true)
    expect(shouldRetire({ type: 'vocab.meaning_kanji', points: 999, wordIsKanaOnly: false })).toBe(false)
  })
})
