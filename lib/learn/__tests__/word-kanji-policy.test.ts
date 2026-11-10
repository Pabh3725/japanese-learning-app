import { describe, expect, it } from 'vitest'
import { kanjiAllowed, kanjiTargetLevel, kanjiWait, type WordPolicy } from '../word-kanji-policy'

const word = (over: Partial<WordPolicy>): WordPolicy => ({ policy: 'KANJI_CORE', targetLevel: 5, wordLevel: 5, isKanaOnly: false, ...over })

describe('Điều kiện mở Stage 4 theo chính sách Kanji', () => {
  it('KANJI_CORE N5: mở ngay ở cấp N5', () => {
    expect(kanjiAllowed(word({}), 5, false)).toBe(true)
  })

  it('KANJI_DEFERRED N4: chờ người học mở cấp N4 cho Từ vựng Kanji, rồi mở mà không mất gì', () => {
    const deferred = word({ policy: 'KANJI_DEFERRED', targetLevel: 4 })
    expect(kanjiAllowed(deferred, 5, false)).toBe(false)
    expect(kanjiWait(deferred, 5, false)).toBe('next_level')
    expect(kanjiAllowed(deferred, 4, false)).toBe(true)
  })

  it('KANJI_OPTIONAL: chỉ mở khi đã bấm "Học dạng Kanji", ở cấp nào cũng vậy', () => {
    const optional = word({ policy: 'KANJI_OPTIONAL', targetLevel: null })
    expect(kanjiAllowed(optional, 5, false)).toBe(false)
    expect(kanjiWait(optional, 5, false)).toBe('optional')
    expect(kanjiAllowed(optional, 5, true)).toBe(true)
    expect(kanjiTargetLevel(optional)).toBeNull()
  })

  it('KANA_ONLY và từ chỉ có Kana: không bao giờ mở', () => {
    expect(kanjiAllowed(word({ policy: 'KANA_ONLY', targetLevel: null, isKanaOnly: true }), 1, true)).toBe(false)
    expect(kanjiWait(word({ policy: 'KANA_ONLY', targetLevel: null, isKanaOnly: true }), 5, false)).toBe('kana_only')
  })

  it('chưa seed chính sách: dùng cấp JLPT của từ như gói 2', () => {
    expect(kanjiAllowed(word({ policy: null, targetLevel: null, wordLevel: 4 }), 5, false)).toBe(false)
    expect(kanjiAllowed(word({ policy: null, targetLevel: null, wordLevel: 4 }), 4, false)).toBe(true)
  })
})
