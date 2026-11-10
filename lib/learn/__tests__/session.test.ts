import { describe, expect, it } from 'vitest'
import { seededRng } from '../../exercise/questions'
import { inLevel, nextLevel } from '../levels'
import { mixQuestions, newWordsBlockedBy, pathLevels, sessionsFor, shouldAddBossRound } from '../session'

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

describe('shouldAddBossRound', () => {
  it('có vòng boss khi phiên đi qua mốc 25, cần đủ 6 từ', () => {
    expect(shouldAddBossRound(10, 20, 10)).toBe(true) // 10 → 30
    expect(shouldAddBossRound(30, 19, 10)).toBe(false) // 30 → 49
    expect(shouldAddBossRound(30, 20, 10)).toBe(true) // 30 → 50
    expect(shouldAddBossRound(10, 20, 5)).toBe(false)
  })
})

describe('pathLevels', () => {
  const rows = [
    { id: 'a', lesson: 1, jlpt_level: 5 },
    { id: 'b', lesson: 25, jlpt_level: 5 },
    { id: 'c', lesson: 26, jlpt_level: 4 },
    { id: 'd', lesson: 48, jlpt_level: 4 },
    { id: 'e', lesson: 30, jlpt_level: 4 },
  ]
  it('tách N5, N4, N5 đứng trước; từ đã biết không tính', () => {
    expect(pathLevels(rows, new Set(['a', 'c']), new Set(['e']))).toEqual([
      { level: 'N5', completed: 1, total: 2, firstLesson: 1, lastLesson: 25 },
      { level: 'N4', completed: 1, total: 2, firstLesson: 26, lastLesson: 48 },
    ])
  })
  it('cấp không có từ thì bỏ qua', () => {
    expect(pathLevels(rows.slice(0, 2), new Set(), new Set()).map((l) => l.level)).toEqual(['N5'])
  })
})

describe('Cấp theo từng kỹ năng', () => {
  it('chỉ lấy mục trong cấp đang học; chưa có cấp coi là khó nhất', () => {
    expect(inLevel(5, 5)).toBe(true)
    expect(inLevel(4, 5)).toBe(false)
    expect(inLevel(5, 4)).toBe(true)
    expect(inLevel(null, 5)).toBe(false)
    expect(inLevel(null, 1)).toBe(true)
  })
  it('cấp kế tiếp là cấp gần nhất còn có mục', () => {
    expect(nextLevel(5, [5, 4, 3, 1, null])).toBe(4)
    expect(nextLevel(3, [5, 4, 3, 1])).toBe(1)
    expect(nextLevel(4, [5, 4])).toBeNull()
  })
})
