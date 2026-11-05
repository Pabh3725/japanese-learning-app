import { describe, expect, it } from 'vitest'
import { INTRO_WORDS_PER_SESSION, isVocabularyId, pickNewWords, stageAfterIntro, toIntroWord } from '../words'

const gakkou = {
  id: 'v1',
  expression: '学校',
  reading_kana: 'がっこう',
  romaji: 'gakkou',
  meaning_vi: 'trường học',
  han_viet: 'HỌC HIỆU',
  emoji: '🏫',
  jlpt_level: 5,
}

describe('toIntroWord', () => {
  it('giữ kana, romaji, nghĩa, emoji', () => {
    expect(toIntroWord(gakkou)).toEqual({
      id: 'v1',
      reading: 'がっこう',
      romaji: 'gakkou',
      meaning: 'trường học',
      emoji: '🏫',
      jlpt: 'N5',
    })
  })

  it('không để lộ Kanji và Hán Việt, kể cả khi dòng DB có', () => {
    const json = JSON.stringify(toIntroWord(gakkou))
    expect(json).not.toContain('学校')
    expect(json).not.toContain('HỌC HIỆU')
  })

  it('romaji và emoji trống → null, thẻ vẫn hiện được', () => {
    const word = toIntroWord({ ...gakkou, romaji: null, emoji: '' })
    expect(word?.romaji).toBeNull()
    expect(word?.emoji).toBeNull()
  })

  it('thiếu trường bắt buộc → null', () => {
    expect(toIntroWord({ ...gakkou, reading_kana: ' ' })).toBeNull()
    expect(toIntroWord({ ...gakkou, meaning_vi: null })).toBeNull()
    expect(toIntroWord({ ...gakkou, id: 1 })).toBeNull()
    expect(toIntroWord({ ...gakkou, jlpt_level: 9 })).toBeNull()
  })
})

describe('pickNewWords', () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({ id: `v${i + 1}` }))
  const none = new Set<string>()

  it('mặc định lấy 10 từ đầu theo thứ tự lộ trình', () => {
    const picked = pickNewWords(rows, none, none)
    expect(picked).toHaveLength(INTRO_WORDS_PER_SESSION)
    expect(picked[0].id).toBe('v1')
    expect(picked[9].id).toBe('v10')
  })

  it('bỏ qua từ đã học và từ đã loại, lấy bù từ tiếp theo', () => {
    const picked = pickNewWords(rows, new Set(['v1', 'v2']), new Set(['v4']), 3)
    expect(picked.map((w) => w.id)).toEqual(['v3', 'v5', 'v6'])
  })

  it('vào lại sau khi đã xem 10 từ → 10 từ kế tiếp, không lặp', () => {
    const seen = new Set(pickNewWords(rows, none, none).map((w) => w.id))
    expect(pickNewWords(rows, seen, none).map((w) => w.id)).toEqual(['v11', 'v12', 'v13', 'v14', 'v15'])
  })

  it('hết từ → danh sách rỗng', () => {
    expect(pickNewWords(rows, new Set(rows.map((w) => w.id)), none)).toEqual([])
    expect(pickNewWords([], none, none)).toEqual([])
  })
})

describe('stageAfterIntro', () => {
  it('từ có Kanji và từ chỉ có Kana đều sang Stage 2 (R1)', () => {
    expect(stageAfterIntro(false)).toBe(2)
    expect(stageAfterIntro(true)).toBe(2)
  })
})

describe('isVocabularyId', () => {
  it('chỉ nhận UUID', () => {
    expect(isVocabularyId('6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f')).toBe(true)
    expect(isVocabularyId('n5-0001')).toBe(false)
    expect(isVocabularyId(42)).toBe(false)
    expect(isVocabularyId(undefined)).toBe(false)
  })
})
