import { describe, expect, it } from 'vitest'
import { kanjiSpan, readingDistractors, readingMutations } from '../reading'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

describe('readingMutations (JLPT 漢字読み)', () => {
  it('trường âm, âm đục, âm ngắt, âm ghép', () => {
    const m = readingMutations('がっこう').map((x) => x.text)
    expect(m).toContain('がっこ')
    expect(m).toContain('がこう')
    expect(m).toContain('かっこう')
    expect(readingMutations('せんせい').map((x) => x.text)).toContain('せんせ')
    expect(readingMutations('きょう').map((x) => x.text)).toContain('きよう')
    expect(readingMutations('びょういん').map((x) => x.text)).toEqual(expect.arrayContaining(['ぴょういん', 'びよういん', 'びょいん']))
  })
  it('không trả cách đọc gốc, không bắt đầu bằng kana nhỏ', () => {
    for (const r of ['がっこう', 'しゅくだい', 'でんわ', 'おおきい']) {
      const m = readingMutations(r).map((x) => x.text)
      expect(m).not.toContain(r)
      expect(m.every((x) => !/^[っゃゅょ]/.test(x))).toBe(true)
      expect(new Set(m).size).toBe(m.length)
    }
  })
  it('3 nhiễu khác nhau, ưu tiên khác loại, bỏ cách đọc cần loại trừ', () => {
    const d = readingDistractors('がっこう', seeded(1), new Set(['がっこ']))
    expect(d).toHaveLength(3)
    expect(new Set(d).size).toBe(3)
    expect(d).not.toContain('がっこ')
    expect(d).not.toContain('がっこう')
  })
})

describe('sửa sau bản mẫu', () => {
  it('không thêm う sau nguyên âm đã kéo dài', () => {
    for (const r of ['しゅうまつ', 'けんきゅうしゃ', 'しんごう']) expect(readingMutations(r).map((m) => m.text).some((x) => x.includes('うう'))).toBe(false)
  })
  it('chỉ đổi phần đọc của chữ Hán, không đổi kana đi kèm', () => {
    expect(kanjiSpan('散歩します', 'さんぽします')).toEqual([0, 3])
    expect(kanjiSpan('休み', 'やすみ')).toEqual([0, 2])
    expect(kanjiSpan('お茶', 'おちゃ')).toEqual([1, 3])
    const m = readingMutations('さんぽします', kanjiSpan('散歩します', 'さんぽします')).map((x) => x.text)
    expect(m.every((x) => x.endsWith('します'))).toBe(true)
  })
})
