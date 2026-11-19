// Cân bằng mẫu ngữ pháp mới (docs/grammar-rules.md §3a).
import { describe, expect, it } from 'vitest'
import { addStudyDays } from '../../learning/time'
import { grammarBalance, grammarBalanceTarget, secondsPerPattern } from '../balance'

const D0 = '2026-11-20'

describe('Cân bằng Grammar', () => {
  it('thời gian một mẫu: 5 buổi × 8 câu + 10 câu ôn đầu, 15 giây mỗi câu', () => {
    expect(secondsPerPattern()).toBe(750)
  })

  it('mục tiêu số phút: trung bình đúng tốc độ, không làm tròn lên mỗi ngày', () => {
    // 15 phút = 900 giây → 1,2 mẫu/ngày
    let remaining = 117
    let date = D0
    const opened: number[] = []
    for (let d = 0; d < 300 && remaining > 0; d++) {
      const r = grammarBalance(remaining, { kind: 'minutes', minutes: 15 }, date)
      expect(r.perDay).toBeGreaterThanOrEqual(1)
      opened.push(r.perDay)
      remaining -= r.perDay
      date = addStudyDays(date, 1)
    }
    expect(remaining).toBe(0)
    expect(opened.length).toBeGreaterThanOrEqual(97)
    expect(opened.length).toBeLessThanOrEqual(99)
    expect(Math.max(...opened)).toBe(2)
  })

  it('mục tiêu ngày: xong đúng ngày đã chọn, chia đều', () => {
    let remaining = 87
    let date = D0
    const finish = addStudyDays(D0, 29)
    let last = ''
    while (remaining > 0) {
      const r = grammarBalance(remaining, { kind: 'date', date: finish }, date)
      remaining -= r.perDay
      last = date
      date = addStudyDays(date, 1)
    }
    expect(last).toBe(finish)
  })

  it('giới hạn 1–10 mẫu mỗi ngày; hết mẫu thì 0', () => {
    expect(grammarBalance(200, { kind: 'date', date: addStudyDays(D0, 2) }, D0).perDay).toBe(10)
    expect(grammarBalance(3, { kind: 'minutes', minutes: 5 }, D0).perDay).toBe(1)
    expect(grammarBalance(0, { kind: 'minutes', minutes: 15 }, D0).perDay).toBe(0)
  })

  it('ngày đã qua hoặc chưa chọn thì dùng số phút', () => {
    expect(grammarBalanceTarget('date', addStudyDays(D0, -1), 15, D0)).toEqual({ kind: 'minutes', minutes: 15 })
    expect(grammarBalanceTarget('date', null, 15, D0)).toEqual({ kind: 'minutes', minutes: 15 })
    expect(grammarBalanceTarget('date', D0, 15, D0)).toEqual({ kind: 'date', date: D0 })
  })
})
