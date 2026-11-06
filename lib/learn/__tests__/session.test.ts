import { describe, expect, it } from 'vitest'
import { seededRng } from '../../exercise/questions'
import { mixQuestions, newWordsBlockedBy, sessionsFor } from '../session'

describe('sessionsFor', () => {
  it.each([[0, 0], [1, 1], [20, 1], [21, 2], [45, 3], [200, 10]])('%i câu cần %i phiên', (questions, sessions) => {
    expect(sessionsFor(questions)).toBe(sessions)
  })
})

describe('newWordsBlockedBy', () => {
  const base = { cardsDue: 0, unlockThreshold: 80, stageDue: 0, stageCap: 200 }
  it('dừng từ mới khi chạm ngưỡng, chưa chạm thì không', () => {
    expect(newWordsBlockedBy(base)).toBe(null)
    expect(newWordsBlockedBy({ ...base, cardsDue: 79, stageDue: 199 })).toBe(null)
    expect(newWordsBlockedBy({ ...base, cardsDue: 80 })).toBe('cards')
    expect(newWordsBlockedBy({ ...base, stageDue: 200 })).toBe('stage')
  })
})

describe('mixQuestions', () => {
  const items = (n: number, types: string[]) =>
    Array.from({ length: n }, (_, i) => ({ wordId: `w${i % Math.ceil(n / 2)}`, exercise: types[i % types.length], id: i }))
  const sameWordGaps = (list: { wordId: string }[]) => {
    const last = new Map<string, number>()
    let min = Infinity
    list.forEach((item, i) => {
      if (last.has(item.wordId)) min = Math.min(min, i - last.get(item.wordId)! - 1)
      last.set(item.wordId, i)
    })
    return min
  }

  it('giữ đủ câu', () => {
    const input = items(20, ['a', 'b', 'c'])
    expect(mixQuestions(input, seededRng(1)).map((q) => q.id).sort((x, y) => x - y)).toEqual(input.map((q) => q.id))
  })

  it('không có 2 câu cùng dạng liền nhau khi xếp được', () => {
    for (let seed = 1; seed < 50; seed++) {
      const out = mixQuestions(items(20, ['a', 'b', 'c', 'd']), seededRng(seed))
      out.slice(1).forEach((q, i) => expect(q.exercise).not.toBe(out[i].exercise))
    }
  })

  it('cùng một từ cách ít nhất 4 câu khi xếp được', () => {
    for (let seed = 1; seed < 50; seed++) {
      expect(sameWordGaps(mixQuestions(items(20, ['a', 'b', 'c']), seededRng(seed)))).toBeGreaterThanOrEqual(4)
    }
  })

  it('không xếp được thì vẫn trả đủ, không treo', () => {
    const one = [{ wordId: 'w', exercise: 'a' }, { wordId: 'w', exercise: 'a' }]
    expect(mixQuestions(one, seededRng(1))).toHaveLength(2)
    expect(mixQuestions([], seededRng(1))).toEqual([])
  })
})
