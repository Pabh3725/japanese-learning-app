import { describe, expect, it } from 'vitest'
import { matchRightIndexForKey, matchRightKeyLabel, pieceIndexForKey, pieceKeyLabel, REPLAY_KEY } from '../keyboard'

describe('Phím chọn mảnh', () => {
  it('1–9 rồi 0, sau đó tới chữ, đủ 18 mảnh', () => {
    expect(pieceIndexForKey('1')).toBe(0)
    expect(pieceIndexForKey('9')).toBe(8)
    expect(pieceIndexForKey('0')).toBe(9)
    expect(pieceIndexForKey('q')).toBe(10)
    expect(pieceIndexForKey('I')).toBe(17)
    expect(pieceKeyLabel(0)).toBe('1')
    expect(pieceKeyLabel(10)).toBe('Q')
    expect(pieceKeyLabel(17)).toBe('I')
  })

  it('ngoài danh sách thì không chọn gì', () => {
    expect(pieceIndexForKey('z')).toBe(-1)
    expect(pieceIndexForKey('Enter')).toBe(-1)
    expect(pieceKeyLabel(18)).toBeNull()
  })

  it('phím nghe lại không trùng phím chọn', () => {
    expect(pieceIndexForKey(REPLAY_KEY)).toBe(-1)
    expect(matchRightIndexForKey(REPLAY_KEY)).toBe(-1)
  })
})

describe('Phím vòng ghép ô', () => {
  it('cột phải dùng A S D F G H, không trùng cột trái 1–6', () => {
    expect(matchRightIndexForKey('a')).toBe(0)
    expect(matchRightIndexForKey('H')).toBe(5)
    expect(matchRightKeyLabel(1)).toBe('S')
    for (const key of ['1', '2', '3', '4', '5', '6']) expect(matchRightIndexForKey(key)).toBe(-1)
  })
})
