import { describe, expect, it } from 'vitest'
import { pieceIndexForKey, pieceKeyLabel } from '../keyboard'

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
})
