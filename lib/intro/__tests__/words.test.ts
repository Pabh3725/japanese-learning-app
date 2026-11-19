import { describe, expect, it } from 'vitest'
import { isVocabularyId, parseVocabularyIds } from '../words'

describe('isVocabularyId', () => {
  it('chỉ nhận UUID', () => {
    expect(isVocabularyId('6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f')).toBe(true)
    expect(isVocabularyId('n5-0001')).toBe(false)
    expect(isVocabularyId(42)).toBe(false)
    expect(isVocabularyId(undefined)).toBe(false)
  })
})

describe('parseVocabularyIds', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  it('nhận danh sách UUID, bỏ trùng', () => {
    expect(parseVocabularyIds([id, id])).toEqual([id])
  })
  it('từ chối dữ liệu lạ, rỗng hoặc quá dài', () => {
    expect(parseVocabularyIds([])).toBe(null)
    expect(parseVocabularyIds('x')).toBe(null)
    expect(parseVocabularyIds([id, 'x'])).toBe(null)
    expect(parseVocabularyIds(Array.from({ length: 201 }, () => id))).toBe(null)
  })
})
