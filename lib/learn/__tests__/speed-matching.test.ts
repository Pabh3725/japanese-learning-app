import { describe, expect, it } from 'vitest'
import { createBoard, MIN_SPEED_WORDS, nextBoard, PAIRS_PER_BOARD, uniqueSpeedWords, wordsForMode, type SpeedWordSource } from '../../speed-matching'

const make = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, word: `語${i}`, meaning: `nghĩa ${i}`, wordIsJapanese: true }))

function expectValidBoard(board: ReturnType<typeof createBoard>) {
  expect(board.tiles).toHaveLength(PAIRS_PER_BOARD * 2)
  expect(new Set(board.tiles.map((t) => t.key)).size).toBe(PAIRS_PER_BOARD * 2)
  // Mỗi từ có đúng một ô chữ và một ô nghĩa
  expect(new Set(board.tiles.map((t) => t.wordId)).size).toBe(PAIRS_PER_BOARD)
  for (const tile of board.tiles) {
    expect(board.tiles.filter((t) => t.wordId === tile.wordId).map((t) => t.kind).sort()).toEqual(['meaning', 'word'])
  }
}

describe('Speed Matching: bàn chơi', () => {
  it('bỏ từ trùng chữ hoặc trùng nghĩa', () => {
    const unique = uniqueSpeedWords([
      { id: 'a', word: 'はし', meaning: 'đũa' },
      { id: 'b', word: 'はし', meaning: 'cầu' },
      { id: 'c', word: 'おはし', meaning: 'đũa' },
      { id: 'd', word: 'いぬ', meaning: 'con chó' },
    ])
    expect(unique.map((w) => w.id)).toEqual(['a', 'd'])
  })

  it.each([MIN_SPEED_WORDS, MIN_SPEED_WORDS + 3, 40])('với %i từ, bàn nào cũng đủ 8 cặp không lặp, kể cả khi hết từ phải trộn lại', (n) => {
    const words = make(n)
    let board = createBoard(words)
    expectValidBoard(board)
    for (let i = 0; i < 30; i++) {
      board = nextBoard(words, board)
      expect(board.round).toBe(i + 2)
      expectValidBoard(board)
    }
  })

  it('các ô nằm lộn xộn, không xếp từng cặp cạnh nhau', () => {
    const { tiles } = createBoard(make(20))
    const adjacentPairs = tiles.filter((t, i) => tiles[i + 1]?.wordId === t.wordId).length
    expect(adjacentPairs).toBeLessThan(PAIRS_PER_BOARD)
  })

  it('bàn đầu giữ thứ tự ưu tiên, bàn sau dùng các từ tiếp theo', () => {
    const words = make(40)
    const first = createBoard(words)
    const second = nextBoard(words, first)
    expect(new Set(first.tiles.map((t) => t.wordId))).toEqual(new Set(words.slice(0, 8).map((w) => w.id)))
    expect(new Set(second.tiles.map((t) => t.wordId))).toEqual(new Set(words.slice(8, 16).map((w) => w.id)))
  })
})

const source = (id: string, extra: Partial<SpeedWordSource> = {}): SpeedWordSource => ({
  id,
  expression: `漢${id}`,
  kana: `かな${id}`,
  meaning: `nghĩa ${id}`,
  hanViet: `HV ${id}`,
  isKanaOnly: false,
  kanjiSeen: false,
  lastReviewAt: null,
  ...extra,
})

describe('Speed Matching: chọn từ theo chế độ', () => {
  it('từ lâu chưa ôn trước, chưa ôn lần nào trước nhất', () => {
    const words = wordsForMode(
      [source('recent', { lastReviewAt: '2026-11-06T00:00:00Z' }), source('old', { lastReviewAt: '2026-10-01T00:00:00Z' }), source('never')],
      'mixed',
    ).words
    expect(words.map((w) => w.id)).toEqual(['never', 'old', 'recent'])
  })

  it('không lộ Kanji trước khi học phần Từ Kanji', () => {
    const data = wordsForMode([source('a'), source('b', { kanjiSeen: true }), source('c', { kanjiSeen: true, isKanaOnly: true })], 'mixed')
    const byId = Object.fromEntries(data.words.map((w) => [w.id, w.word]))
    expect(byId).toEqual({ a: 'かなa', b: '漢b', c: 'かなc' })
    expect(wordsForMode([source('a')], 'kanji').words).toEqual([])
    expect(wordsForMode([source('a', { kanjiSeen: true })], 'kanji').words[0].word).toBe('漢a')
  })

  it('Hán Việt ↔ nghĩa: ô chữ không phải chữ Nhật; từ thiếu Hán Việt bị bỏ', () => {
    const data = wordsForMode([source('a'), source('b', { hanViet: null })], 'hanviet')
    expect(data.words).toEqual([{ id: 'a', word: 'HV a', meaning: 'nghĩa a', wordIsJapanese: false }])
  })
})
