import { describe, expect, it } from 'vitest'
import { computeRetention, type RetentionEntry } from '../retention'

const e = (area: RetentionEntry['area'], cardId: string, date: string, at: string, recalled: boolean): RetentionEntry => ({ area, cardId, date, at, recalled })

describe('computeRetention (V11)', () => {
  it('mỗi Card mỗi ngày chỉ tính lần ôn đầu; tách theo khu', () => {
    const s = computeRetention([
      e('vocabulary', 'a', '2026-11-14', '2026-11-14T01:00:00Z', false),
      // Hỏi lại trong cùng lượt sau khi sai: không tính
      e('vocabulary', 'a', '2026-11-14', '2026-11-14T01:05:00Z', true),
      e('vocabulary', 'b', '2026-11-14', '2026-11-14T01:02:00Z', true),
      e('kanji_words', 'c', '2026-11-14', '2026-11-14T02:00:00Z', true),
      e('kanji', 'd', '2026-11-13', '2026-11-13T02:00:00Z', true),
      e('kanji', 'd', '2026-11-14', '2026-11-14T02:00:00Z', false),
    ])
    expect(s.overall).toEqual({ rate: 3 / 5, count: 5 })
    expect(s.byArea.vocabulary).toEqual({ rate: 0.5, count: 2 })
    expect(s.byArea.kanji_words).toEqual({ rate: 1, count: 1 })
    expect(s.byArea.kanji).toEqual({ rate: 0.5, count: 2 })
  })
  it('chưa ôn lần nào thì null', () => {
    expect(computeRetention([]).overall).toEqual({ rate: null, count: 0 })
  })
})
