// Trường hợp biên ngoài 10 ví dụ ENG-01.
import { relearnStagePoints } from '../stage'
import { describe, expect, it } from 'vitest'
import {
  applyStageAttempt,
  canComplete,
  canUnlockNext,
  completeAt,
  shouldRelearn,
  stageStep,
  trailingCount,
  nextStudyDayStart,
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


  it('mốc riêng từng stage: Stage 2 mở ở 6, Stage 5 mở ở 10 và cần đủ 6 dạng', () => {
    const all2 = ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'] as const
    expect(canUnlockNext(word({ stage: 2, points: 5, earned: all2 }))).toBe(false)
    expect(canUnlockNext(word({ stage: 2, points: 6, earned: all2 }))).toBe(true)
    const all5 = ['hanviet_from_kana', 'kanji_char_meaning', 'kanji_recognition', 'kanji_assembly', 'hanviet_recognition', 'hanviet_assembly'] as const
    expect(canUnlockNext(word({ stage: 5, points: 9, earned: all5 }))).toBe(false)
    expect(canUnlockNext(word({ stage: 5, points: 10, earned: all5 }))).toBe(true)
    expect(canUnlockNext(word({ stage: 5, points: 10, earned: all5.slice(1) }))).toBe(false)
    expect(canUnlockNext(word({ stage: 3, points: 99 }))).toBe(false)
    expect(canUnlockNext(word({ stage: 6, points: 99 }))).toBe(false)
  })

  it('mốc hoàn tất: Stage 5 là 15, các stage khác là 10, kể cả từ chỉ Kana', () => {
    expect(completeAt(2)).toBe(10)
    expect(completeAt(3)).toBe(10)
    expect(completeAt(5)).toBe(15)
    expect(completeAt(6)).toBe(10)
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


  it('đếm chuỗi từ câu mới nhất; sai 3 lần liên tiếp thì xem lại từ', () => {
    expect(trailingCount(['wrong', 'wrong', 'correct', 'wrong'], 'wrong')).toBe(2)
    expect(trailingCount(['correct', 'correct'], 'correct')).toBe(2)
    expect(trailingCount([], 'wrong')).toBe(0)
    expect([shouldRelearn(2), shouldRelearn(3), shouldRelearn(4)]).toEqual([false, true, true])
  })


  it('sai sau khi đã mở stage sau: trừ điểm, nhưng không đóng stage đã mở', () => {
    const s = word({ stage: 2, points: 5, unlockedNext: true, earned: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'] })
    const r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 1, now: vn('2026-11-01 20:00') })
    expect(r.state.points).toBe(3)
    expect(r.state.unlockedNext).toBe(true)
    expect(r.unlockedStage).toBe(null)
  })


  it('đủ yêu cầu bắt buộc nhưng chưa đủ điểm thì chưa mở', () => {
    const s = word({ stage: 2, points: 3, earned: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'] })
    expect(canUnlockNext(s)).toBe(false)
  })
})




describe('Học lại', () => {
  it('Học lại Stage: còn thiếu 3 điểm so với mốc hoàn tất', () => {
    expect(relearnStagePoints(2)).toBe(7)
    expect(relearnStagePoints(3)).toBe(7)
    expect(relearnStagePoints(5)).toBe(12)
    expect(relearnStagePoints(6)).toBe(7)
  })
})

describe('Hai lộ trình', () => {
  it('Từ vựng Kana 1 → 2 → 3, Từ vựng Kanji 4 → 5 → 6; Stage 3, 6 cần đủ Skill riêng', () => {
    const now = new Date('2026-11-01T13:00:00Z')
    const s5 = word({ stage: 3, points: 9, correctStreak: 2, earned: ['meaning_assembly'] })
    expect(applyStageAttempt(s5, { exercise: 'meaning_assembly', outcome: 'correct', seq: 1, now }).completed).toBe(false)
    const kana = applyStageAttempt(s5, { exercise: 'kana_free_recall', outcome: 'correct', seq: 1, now })
    expect(kana.completed).toBe(true)
    expect(kana.cardsCreated).toEqual(['vocab.kana'])
    const s6 = word({ stage: 6, points: 9, correctStreak: 2, earned: ['kanji_assembly_nohint'] })
    expect(applyStageAttempt(s6, { exercise: 'kanji_recognition_6', outcome: 'correct', seq: 1, now }).completed).toBe(false)
    const done = applyStageAttempt(s6, { exercise: 'hanviet_free_recall', outcome: 'correct', seq: 1, now })
    expect(done.completed).toBe(true)
    expect(done.cardsCreated).toEqual(['vocab.kanji'])
  })

  it('Stage 3 không có câu Kanji và Hán Việt', () => {
    const now = new Date('2026-11-01T13:00:00Z')
    expect(() => applyStageAttempt(word({ stage: 3 }), { exercise: 'kanji_assembly_nohint', outcome: 'correct', seq: 1, now })).toThrow()
    expect(() => applyStageAttempt(word({ stage: 3 }), { exercise: 'hanviet_free_recall', outcome: 'correct', seq: 1, now })).toThrow()
  })
})
