// SRS-03 — Test phần chuyển đổi database ↔ bộ tính lịch.
import { describe, expect, it } from 'vitest'
import { parseSubmitReviewResult, rowToReviewCard, toSubmitReviewParams, type ReviewCardRow } from '../mappers'
import { createScheduler } from '../scheduler'

const vn = (local: string) => new Date(local.replace(' ', 'T') + ':00+07:00')
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
const ctx = { paused: false }

describe('rowToReviewCard — dòng database → card', () => {
  it('đọc đúng loại card và ngày đến hạn', () => {
    const card = rowToReviewCard({ ...newRow, card_type: 'vocab.kanji' }, ctx)!
    expect(card.type).toBe('vocab.kanji')
    expect(card.status).toBe('active')
    expect(card.schedule.due.getTime()).toBe(vn('2026-11-05 00:00').getTime())
    expect(card.schedule.lastReviewAt).toBe(null)
  })

  it('từ đã biết hoặc đã bỏ sao → tạm dừng', () => {
    expect(rowToReviewCard({ ...newRow, card_type: 'vocab.kana' }, { paused: true })!.status).toBe('suspended')
  })

  it('dòng cũ chưa có card_type hoặc loại đã bỏ → null (không đoán)', () => {
    expect(rowToReviewCard({ ...newRow, card_type: null }, ctx)).toBeNull()
    expect(rowToReviewCard({ ...newRow, card_type: 'vocab.meaning_kanji' }, ctx)).toBeNull()
  })
})

describe('toSubmitReviewParams — kết quả bộ tính lịch → tham số submit_review', () => {
  it('đúng là Good, không còn điểm và không bỏ Card', () => {
    const s = createScheduler({ enableFuzz: false })
    const card = rowToReviewCard({ ...newRow, card_type: 'vocab.kana' }, ctx)!
    const answer = { outcome: 'correct' as const, exercise: 'kana_free_recall', responseMs: 500 }
    const result = s.reviewCard(card, answer, vn('2026-11-05 20:00'))
    const params = toSubmitReviewParams({ cardId: 'c', clientEventId: 'e', expectedVersion: 0, answer, result, studyDate: '2026-11-05' })
    expect(params).toMatchObject({ p_rating: 3, p_card_points: 0, p_card_points_delta: 0, p_retire: false, p_exercise_type: 'kana_free_recall', p_study_date: '2026-11-05' })
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
