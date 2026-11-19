import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { confusableKana } from '../similarity'
import { KANA_DISTRACTORS_MAX, KANA_DISTRACTORS_MIN, mixKanaPieces, pickKanaDistractors, splitKana } from '../kana-pieces'

function seeded(seed = 1) {
  let t = seed
  return () => {
    t = (t * 16807) % 2147483647
    return t / 2147483647
  }
}

/** reading_kana của mọi từ trong file data (cột thứ 4, các cột trước không có dấu phẩy). */
const readings = readFileSync(join(process.cwd(), 'data/n5/vocabularies.csv'), 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split(',')[3])

describe('splitKana', () => {
  it('っ là mảnh riêng', () => {
    expect(splitKana('がっこう')).toEqual(['が', 'っ', 'こ', 'う'])
  })
  it('ゃ/ゅ/ょ ghép với chữ đứng trước', () => {
    expect(splitKana('きょうし')).toEqual(['きょ', 'う', 'し'])
    expect(splitKana('しゅくだい')).toEqual(['しゅ', 'く', 'だ', 'い'])
    expect(splitKana('ちゃん')).toEqual(['ちゃ', 'ん'])
  })
  it('Katakana: âm ghép, âm ngoại lai, ッ và ー', () => {
    expect(splitKana('テレビ')).toEqual(['テ', 'レ', 'ビ'])
    expect(splitKana('シャツ')).toEqual(['シャ', 'ツ'])
    expect(splitKana('パーティー')).toEqual(['パ', 'ー', 'ティ', 'ー'])
    expect(splitKana('サッカー')).toEqual(['サ', 'ッ', 'カ', 'ー'])
    expect(splitKana('ファクス')).toEqual(['ファ', 'ク', 'ス'])
  })
  it('từ một mảnh', () => {
    expect(splitKana('て')).toEqual(['て'])
  })

  describe('trên toàn bộ data', () => {
    it('đọc đủ toàn bộ từ', () => {
      expect(readings.length).toBeGreaterThan(1800)
    })
    it('ghép lại đúng từ gốc', () => {
      for (const reading of readings) expect(splitKana(reading).join('')).toBe(reading)
    })
    it('mỗi mảnh là một âm: tối đa 2 ký tự, ký tự thứ hai luôn là kana nhỏ', () => {
      for (const reading of readings) {
        for (const piece of splitKana(reading)) expect(piece).toMatch(/^[ぁ-ゖァ-ヺー][ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]?$/)
      }
    })
  })
})

describe('pickKanaDistractors', () => {
  it('từ Hiragana chỉ có mảnh Hiragana, không trùng đáp án', () => {
    const pieces = splitKana('がっこう')
    const out = pickKanaDistractors(pieces, seeded())
    expect(out).toHaveLength(4) // bằng số mảnh của từ
    for (const d of out) {
      expect(d).toMatch(/^[ぁ-ゖ]{1,2}$/)
      expect(pieces).not.toContain(d)
    }
  })
  it('từ Katakana chỉ có mảnh Katakana', () => {
    for (const d of pickKanaDistractors(splitKana('アメリカ'), seeded())) expect(d).toMatch(/^[ァ-ヺー]{1,2}$/)
  })
  it('mảnh đặc biệt cũng làm mảnh nhiễu, nên thấy chúng không suy ra được đáp án', () => {
    const random = seeded()
    const rounds = Array.from({ length: 2000 }, () => pickKanaDistractors(splitKana('アメリカ'), random))
    const share = (test: (piece: string) => boolean) => rounds.filter((pool) => pool.some(test)).length / rounds.length
    expect(share((p) => p === 'ー')).toBeGreaterThan(0.15)
    expect(share((p) => p === 'ッ')).toBeGreaterThan(0.15)
    expect(share((p) => /^[パピプペポ]$/.test(p))).toBeGreaterThan(0.15)
    expect(share((p) => p.length === 2)).toBeGreaterThan(0.15)
  })
  it('không lấy mảnh đặc biệt đã có trong đáp án', () => {
    for (let i = 1; i < 500; i++) {
      expect(pickKanaDistractors(splitKana('コーヒー'), seeded(i))).not.toContain('ー')
    }
  })
  it('không có mảnh nhiễu trùng nhau', () => {
    const out = pickKanaDistractors(splitKana('エレベーター'), seeded(7))
    expect(new Set(out).size).toBe(out.length)
  })
})

describe('mảnh dễ nhầm', () => {
  it.each([
    ['か', ['が']],
    ['は', ['ば', 'ぱ', 'ほ']],
    ['あ', ['お']],
    ['つ', ['づ', 'っ', 'す']],
    ['シ', ['ジ', 'チ', 'ツ']],
    ['ソ', ['ゾ', 'ン']],
  ])('%s nhầm với %j', (piece, expected) => {
    expect(confusableKana(piece)).toEqual(expect.arrayContaining(expected))
  })

  it('âm ghép nhầm với âm ghép khác và với hai mảnh riêng', () => {
    expect(confusableKana('きょ')).toEqual(expect.arrayContaining(['き', 'よ', 'きゃ', 'きゅ', 'ぎょ']))
    expect(confusableKana('シャ')).toEqual(expect.arrayContaining(['シ', 'ヤ', 'シュ', 'ジャ']))
    expect(confusableKana('シャ')).not.toContain('ツャ')
    expect(confusableKana('ファ')).toEqual(['フ', 'ア'])
  })

  it('mảnh dễ nhầm giữ đúng bảng chữ của mảnh gốc', () => {
    for (const reading of readings) {
      for (const piece of splitKana(reading)) {
        const pattern = /[ァ-ヺ]/.test(piece) ? /^[ァ-ヺ]{1,2}$/ : /^[ぁ-ゖ]{1,2}$/
        if (piece !== 'ー') for (const other of confusableKana(piece)) expect(other).toMatch(pattern)
      }
    }
  })

  it('khoảng một nửa mảnh nhiễu là mảnh dễ nhầm với đáp án, tính trên toàn bộ từ', () => {
    const random = seeded()
    let confusable = 0
    let total = 0
    for (const reading of readings) {
      const pieces = splitKana(reading)
      const distractors = pickKanaDistractors(pieces, random)
      const expected = new Set(pieces.flatMap((piece) => confusableKana(piece)))
      confusable += distractors.filter((d) => expected.has(d)).length
      total += distractors.length
      expect(new Set(distractors).size).toBe(distractors.length)
      for (const d of distractors) expect(pieces).not.toContain(d)
    }
    expect(confusable / total).toBeGreaterThan(0.4)
    expect(confusable / total).toBeLessThan(0.65)
  })

  it('đủ số mảnh nhiễu với mọi từ, kể cả từ có ít chữ dễ nhầm', () => {
    const random = seeded()
    for (const reading of readings) {
      const pieces = splitKana(reading)
      const expected = Math.min(18 - pieces.length, KANA_DISTRACTORS_MAX, Math.max(KANA_DISTRACTORS_MIN, pieces.length))
      expect(pickKanaDistractors(pieces, random)).toHaveLength(expected)
    }
  })
})

describe('số mảnh nhiễu theo độ dài từ', () => {
  it('từ ngắn tối thiểu 3, từ dài tối đa 6', () => {
    expect(pickKanaDistractors(['て'], seeded())).toHaveLength(KANA_DISTRACTORS_MIN)
    expect(pickKanaDistractors(splitKana('おねがいします'), seeded())).toHaveLength(KANA_DISTRACTORS_MAX)
  })
})

describe('mixKanaPieces — trộn kỹ', () => {
  const hasAdjacentAnswer = (pool: string[], pieces: string[]) =>
    pool.some((p, i) => i > 0 && pieces.includes(p) && pieces.includes(pool[i - 1]))

  it('không mất mảnh nào', () => {
    const pool = mixKanaPieces(['が', 'っ', 'こ', 'う'], ['く', 'せ', 'た', 'の'], seeded())
    expect([...pool].sort()).toEqual(['が', 'っ', 'こ', 'う', 'く', 'せ', 'た', 'の'].sort())
  })

  it('trên toàn bộ data, nhiều lần xáo: đủ mảnh, không mảnh đáp án nào liền nhau khi đủ khe, không giữ đúng thứ tự', () => {
    let seed = 1
    for (const reading of readings) {
      const pieces = splitKana(reading)
      for (let run = 0; run < 20; run++) {
        const random = seeded(seed++)
        const distractors = pickKanaDistractors(pieces, random)
        const pool = mixKanaPieces(pieces, distractors, random)
        expect(pool).toHaveLength(pieces.length + distractors.length)
        if (pieces.length <= distractors.length + 1) expect(hasAdjacentAnswer(pool, pieces)).toBe(false)
        if (pieces.length > 1 && new Set(pieces).size > 1) {
          expect(pool.filter((p) => pieces.includes(p)).join('')).not.toBe(reading)
        }
      }
    }
  })
})
