import { describe, expect, it } from 'vitest'
import { createBoard, MIN_SPEED_WORDS, nextBoard, PAIRS_PER_BOARD, uniqueSpeedWords } from '../../speed-matching'

const make = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, word: `語${i}`, meaning: `nghĩa ${i}` }))

function expectValidBoard(board: ReturnType<typeof createBoard>) {
  expect(board.tiles).toHaveLength(PAIRS_PER_BOARD * 2)
  expect(new Set(board.tiles.map((t) => t.key)).size).toBe(PAIRS_PER_BOARD * 2)
  // Mỗi từ có đúng một ô chữ và một ô nghĩa
  expect(new Set(board.tiles.map((t) => t.wordId)).size).toBe(PAIRS_PER_BOARD)
  for (const tile of board.tiles) {
    expect(board.tiles.filter((t) => t.wordId === tile.wordId).map((t) => t.kind).sort()).toEqual(['meaning', 'word'])
  }
}

describe('Speed Matching', () => {
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

  it('có đủ từ thì bàn sau dùng từ khác bàn trước', () => {
    const words = make(40)
    const first = createBoard(words)
    const second = nextBoard(words, first)
    const ids = new Set(first.tiles.map((t) => t.wordId))
    expect(second.tiles.some((t) => ids.has(t.wordId))).toBe(false)
  })
})
