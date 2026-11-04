// 10 ví dụ tính tay trong docs/learning-rules.md §11 — mỗi ví dụ một test.
import { describe, expect, it } from 'vitest'
import {
  allowedBorrow,
  applyPracticeToCard,
  applyReviewToCard,
  applyStageAttempt,
  completeIntro,
  firstDueAt,
  newCardState,
  planDailyCounts,
  scoreReview,
  shouldRetire,
  type WordState,
} from '../index'
import { vn, word } from './helpers'

const DAY1 = '2026-11-01'

describe('VD1 — giãn cách chặn spam (R3)', () => {
  it('chỉ câu cách ≥ 4 câu mới được +1', () => {
    const now = vn('2026-11-01 20:00')
    let s = word({ stage: 2, points: 2, plusDate: DAY1, lastSeq: 3, lastSeqDate: DAY1 })

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

describe('VD2 — đủ điểm nhưng thiếu dạng bắt buộc (R4)', () => {
  it('chỉ qua Stage 2 khi có thêm điểm từ ghép Kana', () => {
    const s = word({ stage: 2, points: 6, earned: ['kana_to_meaning', 'meaning_to_kana'] })
    expect(s.stage).toBe(2)

    const r = applyStageAttempt(s, { exercise: 'kana_assembly', outcome: 'correct', seq: 1, now: vn('2026-11-01 20:00') })
    expect(r.passedStage).toBe(2)
    expect(r.state.stage).toBe(3)
    expect(r.state.points).toBe(0)
    expect(r.cardsCreated).toEqual(['vocab.meaning_kana'])
  })
})

describe('VD3 — trần 3 điểm cộng mỗi ngày (R3)', () => {
  it('chạm trần thì đúng không cộng, sai vẫn trừ; sang ngày mới được cộng lại', () => {
    let s: WordState = word({
      stage: 4,
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
    expect(r.delta).toBe(-1)
    expect(r.state.points).toBe(2)

    r = applyStageAttempt(r.state, { exercise: 'hanviet_assembly', outcome: 'correct', seq: 1, now: vn('2026-11-02 08:00') })
    expect(r.delta).toBe(1)
    expect(r.state.points).toBe(3)
  })
})

describe('VD4 — điểm âm và sai liên tiếp (R3)', () => {
  it('trong vòng 4 câu chỉ bị trừ một lần; điểm xuống dưới 0', () => {
    const now = vn('2026-11-01 20:00')
    let s = word({ isKanaOnly: true, stage: 2, points: 0, lastSeq: 14, lastSeqDate: DAY1 })

    let r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 20, now })
    expect(r.state.points).toBe(-1)
    r = applyStageAttempt(r.state, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 22, now })
    expect(r.delta).toBe(0)
    expect(r.state.points).toBe(-1)
    r = applyStageAttempt(r.state, { exercise: 'kana_to_meaning', outcome: 'wrong', seq: 27, now })
    expect(r.state.points).toBe(-2)
  })
})

describe('VD5 — qua Stage 3 bằng xem (R1, R5)', () => {
  it('tạo card hira–Hán Việt, đến hạn 00:00 hôm sau giờ VN', () => {
    const r = completeIntro(word({ stage: 3 }))
    expect(r.passedStage).toBe(3)
    expect(r.state.stage).toBe(4)
    expect(r.state.points).toBe(0)
    expect(r.cardsCreated).toEqual(['vocab.kana_hanviet'])

    const due = firstDueAt(vn('2026-11-01 21:00'))
    expect(due.toISOString()).toBe(vn('2026-11-02 00:00').toISOString())
  })
})

describe('VD6 — テレビ đi trọn đường 1 → 2 → 5 (R1, R4, R5, R6)', () => {
  it('bỏ qua Stage 3–4, chỉ có card nghĩa–hira và không bao giờ bỏ nó', () => {
    // Stage 1
    const intro = completeIntro(word({ isKanaOnly: true }))
    expect(intro.state.stage).toBe(2)
    expect(intro.cardsCreated).toEqual([])
    let s = intro.state

    // Stage 2: ngày 1 được 3 điểm, ngày 2 thêm 2 điểm
    const d1 = vn('2026-11-01 20:00')
    s = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 1, now: d1 }).state
    s = applyStageAttempt(s, { exercise: 'meaning_to_kana', outcome: 'correct', seq: 6, now: d1 }).state
    s = applyStageAttempt(s, { exercise: 'kana_assembly', outcome: 'correct', seq: 11, now: d1 }).state
    expect(s.points).toBe(3)
    const d2 = vn('2026-11-02 20:00')
    s = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 1, now: d2 }).state
    const pass2 = applyStageAttempt(s, { exercise: 'listening', outcome: 'correct', seq: 6, now: d2 })
    expect(pass2.passedStage).toBe(2)
    expect(pass2.state.stage).toBe(5)
    expect(pass2.cardsCreated).toEqual(['vocab.meaning_kana'])
    s = pass2.state

    // Stage 5 của từ chỉ Kana không có bài Kanji/Hán Việt
    expect(() =>
      applyStageAttempt(s, { exercise: 'kanji_recognition_6', outcome: 'correct', seq: 1, now: vn('2026-11-03 20:00') }),
    ).toThrow()

    const d3 = vn('2026-11-03 20:00')
    s = applyStageAttempt(s, { exercise: 'meaning_assembly', outcome: 'correct', seq: 1, now: d3 }).state
    s = applyStageAttempt(s, { exercise: 'kana_free_recall', outcome: 'correct', seq: 6, now: d3 }).state
    s = applyStageAttempt(s, { exercise: 'meaning_recognition_6', outcome: 'correct', seq: 11, now: d3 }).state
    const d4 = vn('2026-11-04 20:00')
    s = applyStageAttempt(s, { exercise: 'kana_free_recall', outcome: 'correct', seq: 1, now: d4 }).state
    const done = applyStageAttempt(s, { exercise: 'meaning_assembly', outcome: 'correct', seq: 6, now: d4 })
    expect(done.passedStage).toBe(5)
    expect(done.state.stage).toBe('complete')
    expect(done.cardsCreated).toEqual([])

    expect(shouldRetire({ type: 'vocab.meaning_kana', points: 100, wordIsKanaOnly: true })).toBe(false)
  })
})

describe('VD7 — rating khi review (R2)', () => {
  const cases = [
    { exercise: 'kanji_recognition_6', outcome: 'correct', ms: 1200, rating: 'Good', points: 1 },
    { exercise: 'kanji_assembly', outcome: 'correct', ms: 2100, rating: 'Easy', points: 2 },
    { exercise: 'kanji_assembly', outcome: 'correct', ms: 4000, rating: 'Good', points: 1 },
    { exercise: 'kanji_assembly', outcome: 'hint', ms: 2000, rating: 'Hard', points: 0 },
    { exercise: 'kanji_recognition_6', outcome: 'wrong', ms: 5000, rating: 'Again', points: -1 },
  ] as const

  for (const c of cases) {
    it(`${c.exercise} · ${c.outcome} · ${c.ms} ms → ${c.rating}`, () => {
      expect(scoreReview({ exercise: c.exercise, outcome: c.outcome, responseMs: c.ms })).toEqual({
        rating: c.rating,
        cardPoints: c.points,
      })
    })
  }
})

describe('VD8 — bỏ card giàn giáo và trần practice (R6)', () => {
  it('practice bị chặn ở +3/ngày; review đẩy lên 30 thì card bị bỏ', () => {
    let card = { ...newCardState('vocab.meaning_kana', false), points: 28, practicePlusToday: 2, practiceDate: DAY1 }

    let r = applyPracticeToCard(card, 'correct', vn('2026-11-01 20:00'))
    expect(r.card.points).toBe(29)
    r = applyPracticeToCard(r.card, 'correct', vn('2026-11-01 20:05'))
    expect(r.delta).toBe(0)
    expect(r.card.points).toBe(29)

    const rv = applyReviewToCard(r.card, { exercise: 'kana_to_meaning', outcome: 'correct', responseMs: 1500 })
    expect(rv.rating).toBe('Good')
    expect(rv.card.points).toBe(30)
    expect(rv.retiredNow).toBe(true)
    expect(rv.card.status).toBe('retired')
  })
})

describe('VD9 — dựng bài học khi review dồn (R7)', () => {
  const cases = [
    { due: 150, review: 120, deferred: 30, newWords: 0 },
    { due: 80, review: 80, deferred: 0, newWords: 0 },
    { due: 79, review: 79, deferred: 0, newWords: 20 },
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
  it('mượn 5 hôm nay thì mai còn 15; chỉ mượn tối đa 1 ngày; D ≥ 80 thì không mở', () => {
    // 01/11
    expect(planDailyCounts({ dueSnapshot: 50, borrowedForToday: 0 }).newWords).toBe(20)
    expect(allowedBorrow({ dueSnapshot: 50, alreadyBorrowedForTomorrow: 0, requested: 5 })).toBe(5)
    // 02/11
    expect(planDailyCounts({ dueSnapshot: 60, borrowedForToday: 5 }).newWords).toBe(15)
    expect(allowedBorrow({ dueSnapshot: 60, alreadyBorrowedForTomorrow: 0, requested: 25 })).toBe(20)
    expect(allowedBorrow({ dueSnapshot: 60, alreadyBorrowedForTomorrow: 20, requested: 1 })).toBe(0)
    // 03/11
    expect(planDailyCounts({ dueSnapshot: 85, borrowedForToday: 20 }).newWords).toBe(0)
    expect(allowedBorrow({ dueSnapshot: 85, alreadyBorrowedForTomorrow: 0, requested: 5 })).toBe(0)
  })
})
