import { describe, expect, it } from 'vitest'
import { libraryStatus, unitLabel } from '../status'

describe('libraryStatus (V10)', () => {
  const cards = (active: number, archived: number) => ({ active, archived })
  it('chưa bắt đầu → đang học → đang ôn → đã học xong', () => {
    expect(libraryStatus({ started: false, doneLearning: false, cards: cards(0, 0) })).toBe('not_started')
    expect(libraryStatus({ started: true, doneLearning: false, cards: cards(0, 0) })).toBe('learning')
    expect(libraryStatus({ started: true, doneLearning: true, cards: cards(1, 0) })).toBe('reviewing')
    expect(libraryStatus({ started: true, doneLearning: true, cards: cards(1, 1) })).toBe('reviewing')
    expect(libraryStatus({ started: true, doneLearning: true, cards: cards(0, 2) })).toBe('learned')
  })
  it('học xong mà chưa có Card nào thì vẫn là đang ôn', () => {
    expect(libraryStatus({ started: true, doneLearning: true, cards: cards(0, 0) })).toBe('reviewing')
  })
  it('nhãn cấp và unit', () => {
    expect(unitLabel('N5', 1)).toBe('N5 · U1')
    expect(unitLabel('N4', null)).toBe('N4')
    expect(unitLabel(null, 3)).toBe('U3')
  })
})
