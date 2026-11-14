import { describe, expect, it } from 'vitest'
import { newStageSchedule, reviewStageSchedule } from '../../srs/stage-scheduler'
import { isWeak, stagePerDayFor } from '../stage-per-day'

describe('stagePerDayFor (V11)', () => {
  it('yếu 3 câu, vừa 2 câu, chắc 1 câu', () => {
    expect(stagePerDayFor(0)).toBe(3)
    expect(stagePerDayFor(1.9)).toBe(3)
    expect(stagePerDayFor(2)).toBe(2)
    expect(stagePerDayFor(5.9)).toBe(2)
    expect(stagePerDayFor(6)).toBe(1)
    expect(isWeak(1)).toBe(true)
    expect(isWeak(3)).toBe(false)
  })

  it('theo lịch Stage thật: sai thì thành từ yếu, đúng liên tục thì thành từ chắc', () => {
    const t0 = new Date('2026-11-01T01:00:00Z')
    const wrong = reviewStageSchedule(newStageSchedule(t0), 'wrong', t0)
    expect(stagePerDayFor(wrong.stability)).toBe(3)
    let s = newStageSchedule(t0)
    let now = t0
    for (let i = 0; i < 4; i++) {
      s = reviewStageSchedule(s, 'correct', now)
      now = new Date(s.due.getTime() + 3_600_000)
    }
    expect(stagePerDayFor(s.stability)).toBe(1)
  })
})
