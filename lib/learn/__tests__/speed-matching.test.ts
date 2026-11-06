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

const card = (type: SpeedWordSource['cards'][number]['type'], lastReviewAt: string | null, extra: Partial<SpeedWordSource['cards'][number]> = {}) => ({
  type,
  retired: false,
  lastReviewAt,
  practiceDate: null,
  practiceToday: 0,
  ...extra,
})
const source = (id: string, cards: SpeedWordSource['cards'], extra: Partial<SpeedWordSource> = {}): SpeedWordSource => ({
  id,
  expression: `漢${id}`,
  kana: `かな${id}`,
  meaning: `nghĩa ${id}`,
  hanViet: `HV ${id}`,
  isKanaOnly: false,
  kanjiSeen: false,
  cards,
  ...extra,
})
const today = '2026-11-07'

describe('Speed Matching: chọn từ theo chế độ', () => {
  it('Card lâu chưa ôn trước, chưa ôn lần nào trước nhất; chạm trần xuống sau; không có Card xuống cuối', () => {
    const words = wordsForMode(
      [
        source('noCard', []),
        source('recent', [card('vocab.meaning_kana', '2026-11-06T00:00:00Z')]),
        source('capped', [card('vocab.meaning_kana', '2026-01-01T00:00:00Z', { practiceDate: today, practiceToday: 3 })]),
        source('old', [card('vocab.meaning_kana', '2026-10-01T00:00:00Z')]),
        source('never', [card('vocab.meaning_kana', null)]),
      ],
      'mixed',
      today,
      3,
    ).words
    expect(words.map((w) => w.id)).toEqual(['never', 'old', 'recent', 'capped', 'noCard'])
  })

  it('trần của hôm qua không còn tính', () => {
    const words = wordsForMode(
      [
        source('recent', [card('vocab.meaning_kana', '2026-11-06T00:00:00Z')]),
        source('yesterday', [card('vocab.meaning_kana', '2026-01-01T00:00:00Z', { practiceDate: '2026-11-06', practiceToday: 3 })]),
      ],
      'mixed',
      today,
      3,
    ).words
    expect(words[0].id).toBe('yesterday')
  })

  it('chế độ một loại Card chỉ gồm từ có Card đó còn hoạt động', () => {
    const data = wordsForMode(
      [
        source('a', [card('vocab.kana_hanviet', null)]),
        source('b', [card('vocab.kana_hanviet', null, { retired: true })]),
        source('c', [card('vocab.meaning_kana', null)]),
      ],
      'vocab.kana_hanviet',
      today,
      3,
    )
    expect(data.words.map((w) => w.id)).toEqual(['a'])
    expect(data.words[0]).toMatchObject({ word: 'かなa', meaning: 'HV a', wordIsJapanese: true })
    expect(data.total).toBe(1)
  })

  it('Hỗn hợp: chưa giới thiệu Kanji thì hiện Kana và tính cho Card Kana; đã giới thiệu thì hiện Kanji', () => {
    const data = wordsForMode(
      [
        source('kana', [card('vocab.meaning_kana', null)]),
        source('kanji', [card('vocab.meaning_kanji', null)], { kanjiSeen: true }),
        source('kanaOnly', [card('vocab.meaning_kana', null)], { kanjiSeen: true, isKanaOnly: true }),
      ],
      'mixed',
      today,
      3,
    )
    const byId = Object.fromEntries(data.words.map((w) => [w.id, w.word]))
    expect(byId).toEqual({ kana: 'かなkana', kanji: '漢kanji', kanaOnly: 'かなkanaOnly' })
  })

  it('không lộ Kanji trước khi giới thiệu, kể cả khi đã có Card', () => {
    const data = wordsForMode([source('a', [card('vocab.meaning_kanji', null)])], 'vocab.meaning_kanji', today, 3)
    expect(data.words).toEqual([])
  })

  it('nghĩa ↔ Hán Việt: ô chữ không phải chữ Nhật; từ thiếu Hán Việt bị bỏ', () => {
    const data = wordsForMode(
      [source('a', [card('vocab.meaning_hanviet', null)]), source('b', [card('vocab.meaning_hanviet', null)], { hanViet: null })],
      'vocab.meaning_hanviet',
      today,
      3,
    )
    expect(data.words).toEqual([{ id: 'a', word: 'HV a', meaning: 'nghĩa a', wordIsJapanese: false }])
  })
})
