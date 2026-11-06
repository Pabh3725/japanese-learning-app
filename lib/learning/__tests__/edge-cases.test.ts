// Trường hợp biên ngoài 10 ví dụ ENG-01.
import { relearnStagePoints } from '../stage'
import { describe, expect, it } from 'vitest'
import {
  applyPracticeToCard,
  applyReviewToCard,
  applyStageAttempt,
  cardsToCreate,
  completeIntro,
  canComplete,
  canUnlockNext,
  completeAt,
  reachedKanjiIntro,
  requiredScoredStages,
  shouldRelearn,
  stageStep,
  trailingCount,
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
    expect(r.delta).toBe(-2)
  })

  it('dạng bài không thuộc Stage bị từ chối', () => {
    expect(() =>
      applyStageAttempt(word({ stage: 2 }), { exercise: 'kanji_assembly', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') }),
    ).toThrow()
  })

  it('Stage 4 nhận câu củng cố Kana/nghĩa nhưng câu đó không thay yêu cầu bắt buộc', () => {
    const s = word({ stage: 4, points: 5, earned: ['kanji_recognition', 'kanji_assembly', 'hanviet_recognition'] })
    const r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') })
    expect(r.state.points).toBe(6)
    expect(r.unlockedStage).toBe(null)
  })

  it('mốc riêng từng stage: Stage 2 mở ở 6, Stage 4 mở ở 10 và cần đủ 6 dạng', () => {
    const all2 = ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'] as const
    expect(canUnlockNext(word({ stage: 2, points: 5, earned: all2 }))).toBe(false)
    expect(canUnlockNext(word({ stage: 2, points: 6, earned: all2 }))).toBe(true)
    const all4 = ['hanviet_from_kana', 'kanji_char_meaning', 'kanji_recognition', 'kanji_assembly', 'hanviet_recognition', 'hanviet_assembly'] as const
    expect(canUnlockNext(word({ stage: 4, points: 9, earned: all4 }))).toBe(false)
    expect(canUnlockNext(word({ stage: 4, points: 10, earned: all4 }))).toBe(true)
    expect(canUnlockNext(word({ stage: 4, points: 10, earned: all4.slice(1) }))).toBe(false)
    expect(canUnlockNext(word({ stage: 5, points: 99 }))).toBe(false)
  })

  it('mốc hoàn tất: Stage 4 là 15, các stage khác là 10, kể cả từ chỉ Kana', () => {
    expect(completeAt(2, false)).toBe(10)
    expect(completeAt(4, false)).toBe(15)
    expect(completeAt(5, false)).toBe(10)
    expect(completeAt(5, true)).toBe(10)
  })

  it('đủ điểm hoàn tất nhưng chưa mở stage sau thì chưa hoàn tất', () => {
    expect(canComplete(word({ stage: 2, points: 10, unlockedNext: false, correctStreak: 3 }))).toBe(false)
    expect(canComplete(word({ stage: 2, points: 10, unlockedNext: true, correctStreak: 3 }))).toBe(true)
  })

  it('đủ điểm nhưng chưa đúng 3 câu liên tiếp thì chưa hoàn tất', () => {
    expect(canComplete(word({ stage: 2, points: 12, unlockedNext: true, correctStreak: 2 }))).toBe(false)
  })

  it('câu sai làm mất chuỗi đúng; câu đúng được 0 điểm vẫn nối chuỗi', () => {
    const now = vn('2026-11-01 20:00')
    const wrong = applyStageAttempt(word({ stage: 2, correctStreak: 2 }), { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 1, now })
    expect(wrong.state.correctStreak).toBe(0)
    const tooSoon = applyStageAttempt(word({ stage: 2, correctStreak: 1, lastSeq: 1, lastSeqDate: '2026-11-01' }), { exercise: 'kana_to_meaning', outcome: 'correct', seq: 2, now })
    expect(tooSoon.delta).toBe(0)
    expect(tooSoon.state.correctStreak).toBe(2)
  })

  it('bước trong stage đi theo điểm và quay lại khi tụt', () => {
    expect([3, 4, 9, -2].map((p) => stageStep(2, p))).toEqual(['choice', 'assembly', 'assembly', 'choice'])
    expect([0, 2, 3, 6, 7, 14].map((p) => stageStep(4, p))).toEqual(['choice', 'choice', 'mixed', 'mixed', 'assembly', 'assembly'])
    expect(stageStep(5, 0)).toBe('assembly')
    expect([2, 3].map(reachedKanjiIntro)).toEqual([false, true])
  })

  it('đếm chuỗi từ câu mới nhất; sai 3 lần liên tiếp thì xem lại từ', () => {
    expect(trailingCount(['wrong', 'wrong', 'correct', 'wrong'], 'wrong')).toBe(2)
    expect(trailingCount(['correct', 'correct'], 'correct')).toBe(2)
    expect(trailingCount([], 'wrong')).toBe(0)
    expect([shouldRelearn(2), shouldRelearn(3), shouldRelearn(4)]).toEqual([false, true, true])
  })

  it('đạt mốc mở và mốc hoàn tất trong cùng một câu', () => {
    const s = word({ stage: 2, points: 9, correctStreak: 2, earned: ['kana_to_meaning', 'meaning_to_kana'] })
    const r = applyStageAttempt(s, { exercise: 'kana_assembly', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') })
    expect(r.unlockedStage).toBe(3)
    expect(r.completed).toBe(true)
    expect(r.cardsCreated).toEqual(['vocab.meaning_kana'])
  })

  it('sai sau khi đã mở stage sau: trừ điểm, nhưng không đóng stage đã mở', () => {
    const s = word({ stage: 2, points: 5, unlockedNext: true, earned: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'] })
    const r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 1, now: vn('2026-11-01 20:00') })
    expect(r.state.points).toBe(3)
    expect(r.state.unlockedNext).toBe(true)
    expect(r.unlockedStage).toBe(null)
  })

  it('Stage 5 từ có Kanji cần đủ S1–S4 và 10 điểm', () => {
    const three = ['meaning_assembly', 'kana_free_recall', 'kanji_recognition_6'] as const
    expect(canComplete(word({ stage: 5, points: 10, correctStreak: 3, earned: three }))).toBe(false)
    expect(canComplete(word({ stage: 5, points: 9, correctStreak: 3, earned: [...three, 'hanviet_free_recall'] }))).toBe(false)
    expect(canComplete(word({ stage: 5, points: 10, correctStreak: 3, earned: [...three, 'hanviet_free_recall'] }))).toBe(true)
  })

  it('đủ yêu cầu bắt buộc nhưng chưa đủ điểm thì chưa mở', () => {
    const s = word({ stage: 2, points: 3, earned: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'] })
    expect(canUnlockNext(s)).toBe(false)
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

  it('completeIntro: Stage 1 mở Stage 2, Stage 3 mở Stage 4 và tạo card', () => {
    expect(completeIntro(1, false)).toEqual({ openedStage: 2, cardsCreated: [] })
    expect(completeIntro(3, false)).toEqual({ openedStage: 4, cardsCreated: ['vocab.kana_hanviet'] })
  })

  it('các stage phải hoàn tất của từ', () => {
    expect(requiredScoredStages(false)).toEqual([2, 4, 5])
    expect(requiredScoredStages(true)).toEqual([2, 5])
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

describe('Học lại', () => {
  it('Học lại Stage: còn thiếu 3 điểm so với mốc hoàn tất', () => {
    expect(relearnStagePoints(2, false)).toBe(7)
    expect(relearnStagePoints(4, false)).toBe(12)
    expect(relearnStagePoints(5, true)).toBe(7)
  })
})
