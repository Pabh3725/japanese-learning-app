import { describe, expect, it } from 'vitest'
import { forgetRisk, orderReviewCards, spreadSameWord, type OrderableCard } from '../order'

const now = new Date('2026-11-20T00:00:00Z')
const card = (id: string, vocabularyId: string, daysAgo: number | null, stability: number, isStar = false): OrderableCard => ({
  id,
  vocabularyId,
  isStar,
  stability,
  lastReviewAt: daysAgo === null ? null : new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
})

describe('Thứ tự Review (V11)', () => {
  it('dễ quên nhất trước (ngày đã qua ÷ stability), Card chưa ôn xếp sau, Card sao xếp cuối', () => {
    const order = orderReviewCards([card('fresh', 'w1', null, 0), card('safe', 'w2', 2, 10), card('risky', 'w3', 10, 2), card('star', 'w4', 30, 1, true), card('mid', 'w5', 5, 5)], now)
    expect(order.map((c) => c.id)).toEqual(['risky', 'mid', 'safe', 'fresh', 'star'])
  })

  it('forgetRisk', () => {
    expect(forgetRisk(card('a', 'w', 6, 3), now)).toBeCloseTo(2)
    expect(forgetRisk(card('a', 'w', null, 0), now)).toBe(-1)
  })

  it('hai Card cùng từ cách nhau ít nhất 3 Card khi còn cách khác', () => {
    const out = spreadSameWord([{ vocabularyId: 'a' }, { vocabularyId: 'a' }, { vocabularyId: 'b' }, { vocabularyId: 'c' }, { vocabularyId: 'd' }])
    expect(out.map((c) => c.vocabularyId)).toEqual(['a', 'b', 'c', 'd', 'a'])
    // Không còn cách khác thì vẫn giữ đủ Card
    expect(spreadSameWord([{ vocabularyId: 'a' }, { vocabularyId: 'a' }])).toHaveLength(2)
  })
})
