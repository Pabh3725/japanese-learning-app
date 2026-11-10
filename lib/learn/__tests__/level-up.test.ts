import { describe, expect, it } from 'vitest'
import { levelUpOf } from '../level-up'

const reveal = { expression: null, kana: 'いぬ', romaji: 'inu', hanViet: null, meaning: 'con chó' }

describe('levelUpOf', () => {
  it('không có mốc mới thì không có thẻ', () => {
    expect(levelUpOf(2, { completed: false, unlockedStage: null, cardsCreated: [] }, reveal)).toBeNull()
    expect(levelUpOf(2, undefined, reveal)).toBeNull()
    expect(levelUpOf(2, { completed: true, unlockedStage: null, cardsCreated: [] }, undefined)).toBeNull()
  })
  it('mở stage sau và hoàn tất stage', () => {
    expect(levelUpOf(2, { completed: false, unlockedStage: 3, cardsCreated: [] }, reveal)?.title).toBe('Stage 3 unlocked!')
    expect(levelUpOf(5, { completed: true, unlockedStage: null, cardsCreated: ['a', 'b'] }, reveal)).toMatchObject({
      title: 'Stage 5 complete!',
      body: expect.stringContaining('2 new review cards'),
    })
  })
  it('vừa hoàn tất vừa mở thì ưu tiên hoàn tất', () => {
    expect(levelUpOf(5, { completed: true, unlockedStage: 6, cardsCreated: [] }, reveal)?.title).toBe('Stage 5 complete!')
  })
})
