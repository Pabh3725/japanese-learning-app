// Các ví dụ tính tay trong docs/learning-rules.md §11 — mỗi ví dụ một test.
import { describe, expect, it } from 'vitest'
import {
  allowedBorrow,
  applyStageAttempt,
  planDailyCounts,
  type StageState,
} from '../index'
import { vn, word } from './helpers'

const DAY1 = '2026-11-01'

describe('VD1 — giãn cách chặn spam (R3)', () => {
  it('chỉ câu cách ≥ 4 câu mới được +1', () => {
    const now = vn('2026-11-01 20:00')
    const s = word({ stage: 2, points: 2, plusDate: DAY1, lastSeq: 3, lastSeqDate: DAY1 })

    let r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 10, now })
    expect(r.delta).toBe(1)
    expect(r.state.points).toBe(3)

    r = applyStageAttempt(r.state, { exercise: 'meaning_to_kana', outcome: 'correct', seq: 12, now })
    expect(r.delta).toBe(0)
    expect(r.counted).toBe(false)
    expect(r.state.points).toBe(3)

    r = applyStageAttempt(r.state, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 17, now })
    expect(r.delta).toBe(1)
    expect(r.state.points).toBe(4)
  })
})

describe('VD2 — đủ điểm nhưng thiếu dạng bắt buộc; mở stage sau khác hoàn tất (R4)', () => {
  it('thiếu ghép Kana thì chưa mở; đủ rồi mở Stage 3, Stage 2 chạy tiếp tới 10 điểm, không tạo Card (V9: Card Kana ở Stage 3)', () => {
    const now = vn('2026-11-01 20:00')
    const s = word({ stage: 2, points: 5, earned: ['kana_to_meaning', 'meaning_to_kana'] })
    expect(s.unlockedNext).toBe(false)

    const r = applyStageAttempt(s, { exercise: 'kana_assembly', outcome: 'correct', seq: 1, now })
    expect(r.unlockedStage).toBe(3)
    expect(r.state.unlockedNext).toBe(true)
    expect(r.state.points).toBe(6) // điểm giữ nguyên, không về 0
    expect(r.completed).toBe(false)
    expect(r.cardsCreated).toEqual([])

    const done = applyStageAttempt({ ...r.state, points: 9, correctStreak: 2 }, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 6, now })
    expect(done.unlockedStage).toBe(null) // chỉ mở một lần
    expect(done.state.points).toBe(10)
    expect(done.completed).toBe(true)
    expect(done.cardsCreated).toEqual([])
  })
})

describe('VD3 — trần 3 điểm cộng mỗi ngày (R3)', () => {
  it('chạm trần thì đúng không cộng, sai vẫn trừ; sang ngày mới được cộng lại', () => {
    const s: StageState = word({
      stage: 5,
      points: 3,
      plusToday: 3,
      plusDate: DAY1,
      earned: ['kanji_recognition', 'kanji_assembly', 'hanviet_recognition'],
    })

    let r = applyStageAttempt(s, { exercise: 'hanviet_assembly', outcome: 'correct', seq: 10, now: vn('2026-11-01 20:00') })
    expect(r.delta).toBe(0)
    expect(r.state.points).toBe(3)
    expect(r.state.earned).not.toContain('hanviet_assembly')

    r = applyStageAttempt(r.state, { exercise: 'kanji_recognition', outcome: 'wrong', seq: 15, now: vn('2026-11-01 20:10') })
    expect(r.delta).toBe(-2)
    expect(r.state.points).toBe(1)

    r = applyStageAttempt(r.state, { exercise: 'hanviet_assembly', outcome: 'correct', seq: 1, now: vn('2026-11-02 08:00') })
    expect(r.delta).toBe(1)
    expect(r.state.points).toBe(2)
  })
})

describe('VD4 — điểm âm và sai liên tiếp (R3)', () => {
  it('trong vòng 4 câu chỉ bị trừ một lần; điểm xuống dưới 0', () => {
    const now = vn('2026-11-01 20:00')
    const s = word({ stage: 2, points: 0, lastSeq: 14, lastSeqDate: DAY1 })

    let r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 20, now })
    expect(r.state.points).toBe(-2)
    r = applyStageAttempt(r.state, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 22, now })
    expect(r.delta).toBe(0)
    expect(r.state.points).toBe(-2)
    r = applyStageAttempt(r.state, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 27, now })
    expect(r.state.points).toBe(-4)
  })
})


describe('VD9 — dựng bài học khi review dồn (R7)', () => {
  const cases = [
    { due: 150, review: 120, deferred: 30, newWords: 0 },
    { due: 80, review: 80, deferred: 0, newWords: 0 },
    { due: 79, review: 79, deferred: 0, newWords: 5 },
  ]
  for (const c of cases) {
    it(`D = ${c.due}`, () => {
      const plan = planDailyCounts({ dueSnapshot: c.due, borrowedForToday: 0 })
      expect(plan.reviewCount).toBe(c.review)
      expect(plan.reviewDeferred).toBe(c.deferred)
      expect(plan.newWords).toBe(c.newWords)
    })
  }
})

describe('VD10 — học thêm mượn quota (R7)', () => {
  const settings = { newPerDay: 20, reviewCap: 120, unlockThreshold: 80 }
  it('mượn 5 hôm nay thì mai còn 15; chỉ mượn tối đa 1 ngày; D ≥ 80 thì không mở', () => {
    // 01/11
    expect(planDailyCounts({ dueSnapshot: 50, borrowedForToday: 0, settings }).newWords).toBe(20)
    expect(allowedBorrow({ dueSnapshot: 50, alreadyBorrowedForTomorrow: 0, requested: 5, settings })).toBe(5)
    // 02/11
    expect(planDailyCounts({ dueSnapshot: 60, borrowedForToday: 5, settings }).newWords).toBe(15)
    expect(allowedBorrow({ dueSnapshot: 60, alreadyBorrowedForTomorrow: 0, requested: 25, settings })).toBe(20)
    expect(allowedBorrow({ dueSnapshot: 60, alreadyBorrowedForTomorrow: 20, requested: 1, settings })).toBe(0)
    // 03/11
    expect(planDailyCounts({ dueSnapshot: 85, borrowedForToday: 20, settings }).newWords).toBe(0)
    expect(allowedBorrow({ dueSnapshot: 85, alreadyBorrowedForTomorrow: 0, requested: 5, settings })).toBe(0)
  })
})
