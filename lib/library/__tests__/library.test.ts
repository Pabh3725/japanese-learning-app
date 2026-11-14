import { describe, expect, it } from 'vitest'
import { toKanjiList, toKanjiListItem, toProgress, toVocabList, toVocabListItem } from '../mappers'
import { matchesKanji, matchesVocab, normalizeSearch } from '../search'

const gakkou = {
  id: 'v1',
  code: 'n5-0013',
  sort_order: 13,
  expression: '学校',
  reading_kana: 'がっこう',
  meaning_vi: 'trường học',
  romaji: null,
  han_viet: 'HỌC HIỆU',
  is_kana_only: false,
  jlpt_level: 5,
}
const kore = { ...gakkou, id: 'v2', code: 'n5-0002', sort_order: 2, expression: 'これ', reading_kana: 'これ', meaning_vi: 'cái này', han_viet: null, is_kana_only: true }

describe('toProgress', () => {
  it('không có dòng tiến độ → chưa học', () => {
    expect(toProgress(undefined)).toEqual({ kind: 'not_started' })
  })
  it('đang học → stage', () => {
    expect(toProgress({ current_stage: 3, learning_status: 'learning' })).toEqual({ kind: 'learning', stage: 3 })
  })
  it('đã xong vòng học ban đầu', () => {
    expect(toProgress({ current_stage: 5, learning_status: 'initial_complete' })).toEqual({ kind: 'complete' })
  })
  it('stage sai dạng → coi như chưa học', () => {
    expect(toProgress({ current_stage: 9, learning_status: 'learning' })).toEqual({ kind: 'not_started' })
  })
})

describe('toVocabListItem', () => {
  it('đổi tên cột DB sang tên DTO', () => {
    expect(toVocabListItem(gakkou)).toEqual({
      lesson: null,
      id: 'v1',
      code: 'n5-0013',
      sortOrder: 13,
      expression: '学校',
      reading: 'がっこう',
      meaning: 'trường học',
      hanViet: 'HỌC HIỆU',
      isKanaOnly: false,
      jlpt: 'N5',
      progress: { kind: 'not_started' },
      status: 'not_started',
    })
  })
  it('từ chỉ có kana: hanViet = null', () => {
    expect(toVocabListItem(kore)?.hanViet).toBe(null)
  })
  it('thiếu trường bắt buộc → null', () => {
    expect(toVocabListItem({ ...gakkou, meaning_vi: '' })).toBe(null)
    expect(toVocabListItem({ ...gakkou, sort_order: null })).toBe(null)
    expect(toVocabListItem(null)).toBe(null)
  })
})

describe('toVocabList', () => {
  it('ghép tiến độ theo id, sắp theo lộ trình, đếm dòng hỏng', () => {
    const { items, invalid } = toVocabList(
      [gakkou, { ...gakkou, id: 'bad', expression: '' }, kore],
      [{ vocabulary_id: 'v1', current_stage: 2, learning_status: 'learning' }],
    )
    expect(items.map((i) => i.code)).toEqual(['n5-0002', 'n5-0013'])
    expect(items[1].progress).toEqual({ kind: 'learning', stage: 2 })
    expect(items[0].progress).toEqual({ kind: 'not_started' })
    expect(invalid).toBe(1)
  })
})

describe('toKanjiListItem', () => {
  const gaku = {
    id: 'k1',
    character: '学',
    han_viet: 'HỌC',
    meaning_vi: 'học',
    onyomi: ['ガク'],
    kunyomi: ['まな.ぶ'],
    stroke_count: null,
    jlpt_level: null,
  }
  it('stroke_count và jlpt_level NULL vẫn hợp lệ', () => {
    expect(toKanjiListItem(gaku)).toEqual({
      id: 'k1',
      character: '学',
      hanViet: 'HỌC',
      meaning: 'học',
      onyomi: ['ガク'],
      kunyomi: ['まな.ぶ'],
      strokes: null,
      jlpt: null,
      status: 'not_started',
    })
  })
  it('kunyomi rỗng là dữ liệu đúng', () => {
    expect(toKanjiListItem({ ...gaku, kunyomi: [] })?.kunyomi).toEqual([])
  })
  it('đếm dòng hỏng', () => {
    expect(toKanjiList([gaku, { ...gaku, character: '' }]).invalid).toBe(1)
  })
})

describe('tìm kiếm', () => {
  const item = toVocabListItem(gakkou)!
  it('không phân biệt dấu và hoa thường', () => {
    expect(normalizeSearch('  Trường Học ')).toBe('truong hoc')
    expect(normalizeSearch('Đi')).toBe('di')
  })
  it('tìm theo nghĩa không dấu, Hán Việt, kana, cách viết, mã', () => {
    expect(matchesVocab(item, 'truong')).toBe(true)
    expect(matchesVocab(item, 'hoc hieu')).toBe(true)
    expect(matchesVocab(item, 'がっ')).toBe(true)
    expect(matchesVocab(item, '学')).toBe(true)
    expect(matchesVocab(item, 'n5-0013')).toBe(true)
    expect(matchesVocab(item, 'xyz')).toBe(false)
  })
  it('ô tìm rỗng → khớp tất cả', () => {
    expect(matchesVocab(item, '   ')).toBe(true)
  })
  it('Kanji: tìm theo âm On/Kun', () => {
    const k = toKanjiListItem({ id: 'k1', character: '学', han_viet: 'HỌC', meaning_vi: 'học', onyomi: ['ガク'], kunyomi: ['まな.ぶ'] })!
    expect(matchesKanji(k, 'ガク')).toBe(true)
    expect(matchesKanji(k, 'hoc')).toBe(true)
  })
})
