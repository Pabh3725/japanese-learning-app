// SRS-02 — Test bộ tính lịch. Số mong đợi lấy từ docs/fsrs-notes.md §6
// (chạy thật ts-fsrs 5.4.2 và 6.0.0, tắt fuzz — hai bản cho kết quả giống nhau).
import { describe, expect, it } from 'vitest'
import type { ReviewAnswer } from '../../learning/scoring'
import { createScheduler, type ReviewCard } from '../scheduler'

/** Thời điểm theo giờ Việt Nam: vn('2026-11-05 20:00'). */
const vn = (local: string) => new Date(local.replace(' ', 'T') + ':00+07:00')

const s = createScheduler({ enableFuzz: false })

const correct = (exercise: ReviewAnswer['exercise'], responseMs = 5000): ReviewAnswer => ({ outcome: 'correct', exercise, responseMs })
const hint = (exercise: ReviewAnswer['exercise']): ReviewAnswer => ({ outcome: 'hint', exercise, responseMs: 5000 })
const wrong = (exercise: ReviewAnswer['exercise']): ReviewAnswer => ({ outcome: 'wrong', exercise, responseMs: 5000 })

/** Làm tròn 2 chữ số để so với bảng trong tài liệu. */
const r2 = (n: number) => Math.round(n * 100) / 100

describe('createCardsForStage — tạo card khi qua stage (R5)', () => {
  it('学校 qua Stage 4 lúc 21:00 → 2 card, đến hạn 00:00 hôm sau, 0 điểm, state New', () => {
    const cards = s.createCardsForStage(4, false, vn('2026-11-04 21:00'))
    expect(cards.map((c) => c.points.type)).toEqual(['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet'])
    for (const c of cards) {
      expect(c.schedule.due.getTime()).toBe(vn('2026-11-05 00:00').getTime())
      expect(c.schedule.state).toBe(0)
      expect(c.schedule.lastReviewAt).toBe(null)
      expect(c.points.points).toBe(0)
      expect(c.points.status).toBe('active')
    }
  })

  it('学校 (có Kanji) đi hết Stage 2→5 → đủ 5 loại card', () => {
    const now = vn('2026-11-04 10:00')
    const types = [2, 3, 4, 5].flatMap((st) => s.createCardsForStage(st as 2 | 3 | 4 | 5, false, now).map((c) => c.points.type))
    expect(types).toEqual([
      'vocab.meaning_kana',
      'vocab.kana_hanviet',
      'vocab.meaning_kanji',
      'vocab.kanji_meaning_hanviet',
      'vocab.meaning_hanviet',
    ])
  })

  it('テレビ (chỉ Kana) đi 1→2→5 → chỉ 1 card nghĩa–Kana', () => {
    const now = vn('2026-11-04 10:00')
    const types = [1, 2, 5].flatMap((st) => s.createCardsForStage(st as 1 | 2 | 5, true, now).map((c) => c.points.type))
    expect(types).toEqual(['vocab.meaning_kana'])
  })

  it('qua Stage 23:59 → hạn là 00:00 ngay hôm sau (không phải 2 ngày sau)', () => {
    const [c] = s.createCardsForStage(2, false, vn('2026-11-04 23:59'))
    expect(c.schedule.due.getTime()).toBe(vn('2026-11-05 00:00').getTime())
  })
})

describe('reviewCard — vòng đời card 学校 nghĩa→Kanji (fsrs-notes §6)', () => {
  // [giờ ôn, câu trả lời, state sau, S, D, lần tới, điểm card]
  const steps: [string, ReviewAnswer, number, number, number, string, number][] = [
    ['2026-11-05 20:00', correct('kanji_recognition_6'), 1, 2.31, 2.12, '2026-11-05 20:10', 1],
    ['2026-11-05 20:10', correct('kanji_assembly', 2100), 2, 3.95, 1.0, '2026-11-09 20:10', 3],
    ['2026-11-09 20:00', wrong('kanji_recognition_6'), 3, 0.92, 7.03, '2026-11-09 20:10', 2],
    ['2026-11-09 20:10', hint('kanji_assembly'), 3, 0.92, 8.01, '2026-11-09 20:25', 2],
    ['2026-11-09 20:25', correct('kanji_recognition_6'), 2, 0.97, 8.0, '2026-11-10 20:25', 3],
    ['2026-11-10 20:00', correct('kanji_assembly', 4000), 2, 2.58, 7.99, '2026-11-13 20:00', 4],
    ['2026-11-13 20:00', correct('kanji_recognition_6'), 2, 6.55, 7.97, '2026-11-20 20:00', 5],
  ]

  it('7 lần ôn cho đúng state, S, D, lần tới và điểm card', () => {
    let [card] = s.createCardsForStage(4, false, vn('2026-11-04 21:00'))
    steps.forEach(([at, answer, state, S, D, nextDue, points], i) => {
      const { card: next } = s.reviewCard(card, answer, vn(at))
      const label = `lần ôn #${i + 1}`
      expect([label, next.schedule.state]).toEqual([label, state])
      expect([label, r2(next.schedule.stability)]).toEqual([label, S])
      expect([label, r2(next.schedule.difficulty)]).toEqual([label, D])
      expect([label, next.schedule.due.getTime()]).toEqual([label, vn(nextDue).getTime()])
      expect([label, next.points.points]).toEqual([label, points])
      card = next
    })
  })

  it('nhật ký ghi đúng rating, state trước/sau và điểm cộng', () => {
    const [card] = s.createCardsForStage(4, false, vn('2026-11-04 21:00'))
    const { log } = s.reviewCard(card, correct('kanji_assembly', 2100), vn('2026-11-05 20:00'))
    expect(log.rating).toBe('Easy')
    expect(log.ratingNumber).toBe(4)
    expect(log.cardPointsDelta).toBe(2)
    expect(log.stateBefore).toBe(0)
    expect(log.dueBefore.getTime()).toBe(vn('2026-11-05 00:00').getTime())
    expect(log.reviewedAt.getTime()).toBe(vn('2026-11-05 20:00').getTime())
  })

  it('không sửa card đầu vào (pure function)', () => {
    const [card] = s.createCardsForStage(4, false, vn('2026-11-04 21:00'))
    const before = JSON.stringify(card)
    s.reviewCard(card, correct('kanji_recognition_6'), vn('2026-11-05 20:00'))
    expect(JSON.stringify(card)).toBe(before)
  })
})

describe('reviewCard — rating Easy chỉ cho bài gõ/ghép (R2)', () => {
  it('trắc nghiệm đúng trong 1 giây → Good (+1), không phải Easy', () => {
    const [card] = s.createCardsForStage(4, false, vn('2026-11-04 21:00'))
    const { log } = s.reviewCard(card, correct('kanji_recognition_6', 1000), vn('2026-11-05 20:00'))
    expect(log.rating).toBe('Good')
    expect(log.cardPointsDelta).toBe(1)
  })
})

describe('reviewCard — bỏ card giàn giáo (R6)', () => {
  function cardWith(type: 'vocab.meaning_kana' | 'vocab.kana_hanviet', isKanaOnly: boolean, points: number): ReviewCard {
    const stage = type === 'vocab.meaning_kana' ? 2 : 3
    const [c] = s.createCardsForStage(stage, isKanaOnly, vn('2026-11-04 21:00'))
    return { ...c, points: { ...c.points, points } }
  }

  it('nghĩa–Kana 29 điểm + Good → 30 → bị bỏ', () => {
    const { card, log } = s.reviewCard(cardWith('vocab.meaning_kana', false, 29), correct('kana_to_meaning'), vn('2026-11-05 20:00'))
    expect(card.points.points).toBe(30)
    expect(card.points.status).toBe('retired')
    expect(log.retiredNow).toBe(true)
  })

  it('Kana–Hán Việt 39 điểm + Good → 40 → bị bỏ', () => {
    const { card } = s.reviewCard(cardWith('vocab.kana_hanviet', false, 39), correct('hanviet_recognition'), vn('2026-11-05 20:00'))
    expect(card.points.status).toBe('retired')
  })

  it('từ chỉ Kana: nghĩa–Kana 29 + Good → 30 nhưng KHÔNG bị bỏ', () => {
    const { card, log } = s.reviewCard(cardWith('vocab.meaning_kana', true, 29), correct('kana_to_meaning'), vn('2026-11-05 20:00'))
    expect(card.points.points).toBe(30)
    expect(card.points.status).toBe('active')
    expect(log.retiredNow).toBe(false)
  })
})

describe('reviewCard — chặn trường hợp sai (quyết định a: báo lỗi)', () => {
  it('ôn card đã bỏ → báo lỗi', () => {
    const [c] = s.createCardsForStage(2, false, vn('2026-11-04 21:00'))
    const retired: ReviewCard = { ...c, points: { ...c.points, status: 'retired' } }
    expect(() => s.reviewCard(retired, correct('kana_to_meaning'), vn('2026-11-05 20:00'))).toThrow()
  })

  it('ôn card đang tạm dừng (từ bị loại) → báo lỗi', () => {
    const [c] = s.createCardsForStage(2, false, vn('2026-11-04 21:00'))
    const suspended: ReviewCard = { ...c, points: { ...c.points, status: 'suspended' } }
    expect(() => s.reviewCard(suspended, correct('kana_to_meaning'), vn('2026-11-05 20:00'))).toThrow()
  })

  it('giờ ôn sớm hơn lần ôn trước (đồng hồ sai) → báo lỗi', () => {
    const [c] = s.createCardsForStage(2, false, vn('2026-11-04 21:00'))
    const { card } = s.reviewCard(c, correct('kana_to_meaning'), vn('2026-11-05 20:00'))
    expect(() => s.reviewCard(card, correct('kana_to_meaning'), vn('2026-11-05 19:00'))).toThrow()
  })
})
