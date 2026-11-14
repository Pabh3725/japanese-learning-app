// SCH-01 — Lịch của Stage: tối đa 2 ngày, không có Easy, V10 không hẹn trong ngày. Số mong đợi từ chạy thật ts-fsrs, tắt fuzz.
import { describe, expect, it } from 'vitest'
import { newStageSchedule, reviewStageSchedule } from '../stage-scheduler'
import type { Schedule } from '../scheduler'
import { ratingOf } from '../../learning/scoring'
import type { Outcome } from '../../learning/types'

const start = new Date('2026-11-01T01:00:00Z')

/** Trả lời đúng lúc đến hẹn; trả về ngày (kể từ đầu) của câu thứ n, tính cả trần +3 điểm/ngày. */
function simulate(outcomeAt: (i: number) => Outcome, count: number) {
  let schedule: Schedule = newStageSchedule(start)
  let now = start
  const seen: { day: number; scheduledDays: number; due: Date }[] = []
  for (let i = 0; i < count; i++) {
    now = new Date(Math.max(schedule.due.getTime(), now.getTime()))
    schedule = reviewStageSchedule(schedule, outcomeAt(i), now)
    seen.push({ day: Math.round((now.getTime() - start.getTime()) / 864e5), scheduledDays: schedule.scheduledDays, due: schedule.due })
  }
  return seen
}

describe('newStageSchedule', () => {
  it('câu đầu đến hẹn ngay, trạng thái New', () => {
    const s = newStageSchedule(start)
    expect(s.state).toBe(0)
    expect(s.due.getTime()).toBe(start.getTime())
    expect(s.reps).toBe(0)
  })
})

describe('reviewStageSchedule', () => {
  it('khoảng cách không bao giờ vượt 2 ngày, kể cả đúng rất nhiều lần', () => {
    for (const { scheduledDays } of simulate(() => 'correct', 40)) expect(scheduledDays).toBeLessThanOrEqual(2)
  })

  it('xen kẽ đúng, gợi ý và sai vẫn không vượt 2 ngày', () => {
    const pattern: Outcome[] = ['correct', 'hint', 'correct', 'wrong']
    for (const { scheduledDays } of simulate((i) => pattern[i % 4], 40)) expect(scheduledDays).toBeLessThanOrEqual(2)
  })

  it('V10: không hẹn trong ngày; đúng → 2 ngày, sai và gợi ý → 1 ngày', () => {
    const first = reviewStageSchedule(newStageSchedule(start), 'correct', start)
    expect(first.scheduledDays).toBe(2)
    expect(reviewStageSchedule(newStageSchedule(start), 'wrong', start).scheduledDays).toBe(1)
    expect(reviewStageSchedule(newStageSchedule(start), 'hint', start).scheduledDays).toBe(1)
    for (const { scheduledDays } of simulate((i) => (['correct', 'wrong', 'hint'] as Outcome[])[i % 3], 30)) expect(scheduledDays).toBeGreaterThanOrEqual(1)
  })

  it('V10: hạn làm tròn về 00:00 giờ VN của ngày đến hạn', () => {
    // 2026-11-01 20:13 giờ VN, đúng → 2 ngày → 00:00 giờ VN ngày 03/11 (17:00 UTC ngày 02/11)
    const at = new Date('2026-11-01T13:13:00Z')
    const next = reviewStageSchedule(newStageSchedule(at), 'correct', at)
    expect(next.due.toISOString()).toBe('2026-11-02T17:00:00.000Z')
    // Sai lúc 23:30 giờ VN → 00:00 giờ VN hôm sau
    const late = new Date('2026-11-01T16:30:00Z')
    expect(reviewStageSchedule(newStageSchedule(late), 'wrong', late).due.toISOString()).toBe('2026-11-01T17:00:00.000Z')
  })

  it('trả lời muộn sau nhiều ngày vẫn tối đa 2 ngày', () => {
    const first = reviewStageSchedule(newStageSchedule(start), 'correct', start)
    const late = new Date(start.getTime() + 9 * 864e5)
    const next = reviewStageSchedule(first, 'correct', late)
    expect(next.scheduledDays).toBe(2)
    expect(next.due.getTime()).toBeLessThanOrEqual(late.getTime() + 2 * 864e5)
    expect(next.due.getTime()).toBeGreaterThan(late.getTime())
  })
})

describe('ratingOf — không có Easy', () => {
  it('sai = Again, gợi ý = Hard, đúng = Good', () => {
    expect(ratingOf('wrong')).toBe('Again')
    expect(ratingOf('hint')).toBe('Hard')
    expect(ratingOf('correct')).toBe('Good')
  })
})
