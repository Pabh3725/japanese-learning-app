import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildKanaAssemblyQuestion,
  isKanaAssemblyCorrect,
  KANA_DISTRACTORS_MAX,
  KANA_DISTRACTORS_MIN,
  mixKanaPieces,
  parseKanaAssemblyRequest,
  pickKanaDistractors,
  pickStage2Words,
  splitKana,
  type Stage2WordRow,
} from '../kana-pieces'

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
    it('đọc đủ 912 từ', () => {
      expect(readings).toHaveLength(912)
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
      expect(d).toMatch(/^[ぁ-ゖ]$/)
      expect(pieces).not.toContain(d)
    }
  })
  it('từ Katakana chỉ có mảnh Katakana', () => {
    for (const d of pickKanaDistractors(splitKana('アメリカ'), seeded())) expect(d).toMatch(/^[ァ-ヺ]$/)
  })
  it('không có mảnh nhiễu trùng nhau', () => {
    const out = pickKanaDistractors(splitKana('エレベーター'), seeded(7))
    expect(new Set(out).size).toBe(out.length)
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

describe('buildKanaAssemblyQuestion', () => {
  it('có đủ mảnh đáp án và mảnh nhiễu', () => {
    const q = buildKanaAssemblyQuestion('がっこう', seeded())
    expect(q.slots).toBe(4)
    expect(q.pool).toHaveLength(4 + 4)
    for (const piece of ['が', 'っ', 'こ', 'う']) expect(q.pool).toContain(piece)
  })
  it('từ có chữ lặp giữ đủ số mảnh', () => {
    const q = buildKanaAssemblyQuestion('おかあさん', seeded())
    expect(q.pool.filter((p) => ['お', 'か', 'あ', 'さ', 'ん'].includes(p))).toHaveLength(5)
    const repeated = buildKanaAssemblyQuestion('もしもし', seeded())
    expect(repeated.pool.filter((p) => p === 'も')).toHaveLength(2)
  })
  it('không gửi cách đọc xuống trình duyệt', () => {
    expect(Object.keys(buildKanaAssemblyQuestion('がっこう', seeded())).sort()).toEqual(['pool', 'slots'])
  })
})

describe('isKanaAssemblyCorrect', () => {
  it('đúng thứ tự → đúng', () => {
    expect(isKanaAssemblyCorrect(['が', 'っ', 'こ', 'う'], 'がっこう')).toBe(true)
  })
  it('sai thứ tự hoặc thiếu mảnh → sai', () => {
    expect(isKanaAssemblyCorrect(['こ', 'が', 'っ', 'う'], 'がっこう')).toBe(false)
    expect(isKanaAssemblyCorrect(['が', 'っ', 'こ'], 'がっこう')).toBe(false)
    expect(isKanaAssemblyCorrect([], 'がっこう')).toBe(false)
  })
})

describe('pickStage2Words', () => {
  const row = (id: string, sort: number, at: string | null): Stage2WordRow => ({
    id,
    last_practiced_at: at,
    vocabularies: { reading_kana: 'あ', meaning_vi: 'a', sort_order: sort },
  })

  it('chưa luyện trước, rồi lâu chưa luyện, hòa thì theo lộ trình', () => {
    const rows = [
      row('recent', 1, '2026-11-05T10:00:00Z'),
      row('old', 2, '2026-11-01T10:00:00Z'),
      row('new-b', 9, null),
      row('new-a', 3, null),
    ]
    expect(pickStage2Words(rows).map((r) => r.id)).toEqual(['new-a', 'new-b', 'old', 'recent'])
  })
  it('giới hạn số từ', () => {
    expect(pickStage2Words([row('a', 1, null), row('b', 2, null)], 1).map((r) => r.id)).toEqual(['a'])
  })
})

describe('parseKanaAssemblyRequest', () => {
  const valid = {
    learnerVocabularyId: '6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f',
    clientEventId: '7f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f',
    pieces: ['が', 'っ', 'こ', 'う'],
  }
  it('nhận dữ liệu đúng, làm tròn thời gian', () => {
    expect(parseKanaAssemblyRequest({ ...valid, responseMs: 1200.4 })).toEqual({ ...valid, responseMs: 1200 })
  })
  it('từ chối dữ liệu sai dạng', () => {
    expect(parseKanaAssemblyRequest(null)).toBeNull()
    expect(parseKanaAssemblyRequest({ ...valid, learnerVocabularyId: 'x' })).toBeNull()
    expect(parseKanaAssemblyRequest({ ...valid, clientEventId: undefined })).toBeNull()
    expect(parseKanaAssemblyRequest({ ...valid, pieces: [] })).toBeNull()
    expect(parseKanaAssemblyRequest({ ...valid, pieces: [1] })).toBeNull()
    expect(parseKanaAssemblyRequest({ ...valid, pieces: ['quá dài rồi'] })).toBeNull()
    expect(parseKanaAssemblyRequest({ ...valid, responseMs: -1 })).toBeNull()
  })
  it('không nhận kết quả do trình duyệt tự báo', () => {
    expect(parseKanaAssemblyRequest({ ...valid, outcome: 'correct' })).not.toHaveProperty('outcome')
  })
})
