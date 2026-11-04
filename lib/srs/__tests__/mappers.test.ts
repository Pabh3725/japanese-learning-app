// SRS-03 — Test phần chuyển đổi database ↔ bộ tính lịch.
import { describe, expect, it } from 'vitest'
import { parseSubmitReviewResult, rowToReviewCard, toSubmitReviewParams, type ReviewCardRow } from '../mappers'
import { createScheduler } from '../scheduler'

const vn = (local: string) => new Date(local.replace(' ', 'T') + ':00+07:00')
const s = createScheduler({ enableFuzz: false })

/** Dòng review_cards của card 学校 nghĩa→Kanji vừa tạo (chưa ôn lần nào). */
const newRow: ReviewCardRow = {
  id: 'card-1',
  card_type: 'vocab.meaning_kanji',
  state: 0,
  due_at: '2026-11-04T17:00:00+00:00', // = 05/11 00:00 giờ VN
  stability: 0,
  difficulty: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  last_review_at: null,
  card_points: 0,
  retired_at: null,
  practice_points_today: 0,
  practice_points_date: null,
  version: 0,
}
const ctx = { isKanaOnly: false, excluded: false }

describe('rowToReviewCard — dòng database → card', () => {
  it('đọc đúng loại card, ngày đến hạn và điểm', () => {
    const card = rowToReviewCard(newRow, ctx)!
    expect(card.points.type).toBe('vocab.meaning_kanji')
    expect(card.points.status).toBe('active')
    expect(card.schedule.due.getTime()).toBe(vn('2026-11-05 00:00').getTime())
    expect(card.schedule.lastReviewAt).toBe(null)
  })

  it('retired_at có giá trị → status retired', () => {
    expect(rowToReviewCard({ ...newRow, retired_at: '2026-11-10T13:00:00Z' }, ctx)!.points.status).toBe('retired')
  })

  it('từ bị loại khỏi lộ trình → status suspended', () => {
    expect(rowToReviewCard(newRow, { ...ctx, excluded: true })!.points.status).toBe('suspended')
  })

  it('dòng cũ chưa có card_type → null (không đoán)', () => {
    expect(rowToReviewCard({ ...newRow, card_type: null }, ctx)).toBe(null)
  })
})

describe('toSubmitReviewParams — kết quả bộ tính lịch → tham số submit_review', () => {
  it('ghép 学+校 đúng trong 2,1 giây → Easy: rating 4, +2, đến hạn sau 10 phút', () => {
    const card = rowToReviewCard(newRow, ctx)!
    const answer = { outcome: 'correct' as const, exercise: 'kanji_assembly' as const, responseMs: 2100 }
    const now = vn('2026-11-05 20:00')
    const result = s.reviewCard(card, answer, now)
    const p = toSubmitReviewParams({ cardId: 'card-1', clientEventId: 'ev-1', expectedVersion: 0, answer, result })

    expect(p.p_review_card_id).toBe('card-1')
    expect(p.p_client_event_id).toBe('ev-1')
    expect(p.p_expected_version).toBe(0)
    expect(p.p_rating).toBe(4)
    expect(p.p_card_points).toBe(2)
    expect(p.p_card_points_delta).toBe(2)
    expect(p.p_retire).toBe(false)
    expect(p.p_state_before).toBe(0)
    expect(p.p_reviewed_at).toBe(now.toISOString())
    expect(p.p_due_before).toBe(vn('2026-11-05 00:00').toISOString())
    expect(p.p_exercise_type).toBe('kanji_assembly')
    expect(p.p_response_time_ms).toBe(2100)
    expect(p.p_study_date).toBe(null)
  })

  it('card đủ mốc → p_retire = true', () => {
    const card = rowToReviewCard({ ...newRow, card_type: 'vocab.meaning_kana', card_points: 29 }, ctx)!
    const answer = { outcome: 'correct' as const, exercise: 'kana_to_meaning' as const, responseMs: 4000 }
    const result = s.reviewCard(card, answer, vn('2026-11-05 20:00'))
    const p = toSubmitReviewParams({ cardId: 'c', clientEventId: 'e', expectedVersion: 7, answer, result })
    expect(p.p_retire).toBe(true)
    expect(p.p_card_points).toBe(30)
  })
})

describe('parseSubmitReviewResult — đọc kết quả hàm Postgres', () => {
  it('đọc được 5 trạng thái hợp lệ', () => {
    expect(parseSubmitReviewResult({ status: 'saved', version: 1 })).toBe('saved')
    expect(parseSubmitReviewResult({ status: 'duplicate' })).toBe('duplicate')
    expect(parseSubmitReviewResult({ status: 'conflict' })).toBe('conflict')
  })

  it('kết quả lạ → báo lỗi', () => {
    expect(() => parseSubmitReviewResult({ status: 'ok' })).toThrow()
    expect(() => parseSubmitReviewResult(null)).toThrow()
  })
})
