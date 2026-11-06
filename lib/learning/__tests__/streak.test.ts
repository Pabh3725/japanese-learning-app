import { describe, expect, it } from 'vitest'
import { currentStreak, lastSevenDays, weekdayLabel } from '../streak'

describe('currentStreak', () => {
  it('đếm các ngày liên tiếp tới hôm nay', () => {
    expect(currentStreak(new Set(['2026-11-04', '2026-11-05', '2026-11-06']), '2026-11-06')).toBe(3)
  })
  it('hôm nay chưa học thì vẫn giữ chuỗi tới hôm qua', () => {
    expect(currentStreak(new Set(['2026-11-04', '2026-11-05']), '2026-11-06')).toBe(2)
  })
  it('nghỉ quá một ngày thì về 0, và dừng ở chỗ đứt', () => {
    expect(currentStreak(new Set(['2026-11-04']), '2026-11-06')).toBe(0)
    expect(currentStreak(new Set(['2026-11-01', '2026-11-05', '2026-11-06']), '2026-11-06')).toBe(2)
    expect(currentStreak(new Set(), '2026-11-06')).toBe(0)
  })
  it('qua được đầu tháng', () => {
    expect(currentStreak(new Set(['2026-10-31', '2026-11-01']), '2026-11-01')).toBe(2)
  })
})

describe('tuần', () => {
  it('bảy ngày, kết thúc ở hôm nay, có tên thứ đúng', () => {
    const week = lastSevenDays('2026-11-06')
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-10-31')
    expect(week[6]).toBe('2026-11-06')
    expect(weekdayLabel('2026-11-06')).toBe('Fri')
  })
})
