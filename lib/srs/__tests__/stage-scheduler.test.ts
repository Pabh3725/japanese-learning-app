// SCH-01 — Lịch của Stage: tối đa 2 ngày, không có Easy. Số mong đợi từ chạy thật ts-fsrs, tắt fuzz.
import { describe, expect, it } from 'vitest'
import { newStageSchedule, reviewStageSchedule } from '../stage-scheduler'
import type { Schedule } from '../scheduler'
import { stageRating } from '../../learning/scoring'
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

  it('đúng mọi câu: câu thứ 5 ở ngày 6, thứ 8 ở ngày 12, thứ 10 ở ngày 16 (R9)', () => {
    const seen = simulate(() => 'correct', 10)
    expect(seen[4].day).toBe(6)
    expect(seen[7].day).toBe(12)
    expect(seen[9].day).toBe(16)
  })

  it('trả lời muộn đúng lúc chuyển sang Review: vẫn tối đa 2 ngày, hạn tính từ lúc trả lời', () => {
    // ts-fsrs 6.0.0 trả về 7 ngày ở bước này nếu không có lớp chặn
    const first = reviewStageSchedule(newStageSchedule(start), 'correct', start)
    const nextDay = new Date(start.getTime() + 864e5)
    const graduated = reviewStageSchedule(first, 'correct', nextDay)
    expect(graduated.state).toBe(2)
    expect(graduated.scheduledDays).toBe(2)
    expect(graduated.due.getTime()).toBe(nextDay.getTime() + 2 * 864e5)
  })

  it('sai thì hỏi lại trong ngày', () => {
    const after = reviewStageSchedule(reviewStageSchedule(newStageSchedule(start), 'correct', start), 'wrong', start)
    expect(after.scheduledDays).toBe(0)
  })
})

describe('stageRating — không có Easy', () => {
  it('sai = Again, gợi ý = Hard, đúng = Good', () => {
    expect(stageRating('wrong')).toBe('Again')
    expect(stageRating('hint')).toBe('Hard')
    expect(stageRating('correct')).toBe('Good')
  })
})
