import { describe, expect, it } from 'vitest'
import { applyBai, baiKey, baiToday, groupReview, isPassed, reviewTypesFor, rotationFor, type V3State, type V3Type } from '../v3/rules'
import { readingDict, toPieces } from '../v3/pieces'

const counts = { day1: 6, day2: 4 }
const fresh: V3State = { day: 1, dayDate: null, scores: {} }

describe('Grammar V3 — lịch ba ngày', () => {
  it('mẫu mới: hôm nay làm cả 6 bài ngày 1', () => {
    expect(baiToday(fresh, counts, '2026-11-28')).toEqual(['1:0', '1:1', '1:2', '1:3', '1:4', '1:5'])
  })

  it('chỉ cộng câu đúng, qua bài khi ≥ 3', () => {
    const r = applyBai(fresh, '1:0', 2, counts, '2026-11-28')
    expect(r.state.scores['1:0']).toEqual({ c: 2, n: 1, d: '2026-11-28' })
    expect(isPassed(r.state.scores['1:0'])).toBe(false)
    const r2 = applyBai(r.state, '1:0', 1, counts, '2026-11-29')
    expect(isPassed(r2.state.scores['1:0'])).toBe(true)
  })

  it('làm hết bài ngày 1 thì sang ngày 2, bài ngày 2 mở từ hôm sau', () => {
    let s = fresh
    for (let i = 0; i < 6; i++) s = applyBai(s, baiKey(1, i), i === 2 ? 1 : 5, counts, '2026-11-28').state
    expect(s.day).toBe(2)
    expect(s.dayDate).toBe('2026-11-28')
    expect(baiToday(s, counts, '2026-11-28')).toEqual([])
    // Hôm sau: bài ngày 1 chưa qua làm bù trước, rồi 4 bài ngày 2
    expect(baiToday(s, counts, '2026-11-29')).toEqual(['1:2', '2:0', '2:1', '2:2', '2:3'])
  })

  it('đang làm dở ngày 1 thì hôm nay chỉ còn bài chưa làm', () => {
    let s = fresh
    s = applyBai(s, '1:0', 5, counts, '2026-11-28').state
    s = applyBai(s, '1:1', 1, counts, '2026-11-28').state
    expect(s.day).toBe(1)
    expect(baiToday(s, counts, '2026-11-28')).toEqual(['1:2', '1:3', '1:4', '1:5'])
    expect(baiToday(s, counts, '2026-11-29')).toEqual(['1:1', '1:2', '1:3', '1:4', '1:5'])
  })

  it('qua hết 10 bài thì mẫu xong (sang thẻ ôn)', () => {
    let s = fresh
    for (let i = 0; i < 6; i++) s = applyBai(s, baiKey(1, i), 5, counts, '2026-11-28').state
    let last = { state: s, completed: false }
    for (let i = 0; i < 4; i++) last = applyBai(last.state, baiKey(2, i), 4, counts, '2026-11-29')
    expect(last.completed).toBe(true)
  })
})

describe('Grammar V3 — ôn', () => {
  it('dạng phụ đổi theo nhóm và theo ngày', () => {
    expect(rotationFor(0, 0)).toEqual(['G6', 'G3'])
    expect(rotationFor(1, 0)).toEqual(['G2', 'G7'])
    expect(rotationFor(0, 1)).toEqual(['G3', 'G2'])
    expect(rotationFor(2, 1)).toEqual(['G9', 'G6'])
  })

  it('mỗi mẫu 4 dạng; thiếu dạng phụ thì lấy dạng kế tiếp; thiếu G10 thì G1 hai lần', () => {
    const all = new Set<V3Type>(['G1', 'G2', 'G3', 'G5', 'G6', 'G7', 'G9', 'G10'])
    expect(reviewTypesFor(all, ['G6', 'G3'])).toEqual(['G1', 'G10', 'G6', 'G3'])
    expect(reviewTypesFor(new Set<V3Type>(['G1', 'G2', 'G6', 'G9']), ['G7', 'G5'])).toEqual(['G1', 'G1', 'G9', 'G6'])
  })

  it('gom theo dạng thành bài ≤ 5 câu, dạng ít câu gộp bài cuối', () => {
    const items = [
      ...Array.from({ length: 7 }, (_, i) => ({ code: `g0${i}`, type: 'G1' as V3Type, question: i })),
      ...Array.from({ length: 3 }, (_, i) => ({ code: `g1${i}`, type: 'G10' as V3Type, question: i })),
      { code: 'g20', type: 'G6' as V3Type, question: 0 },
      { code: 'g21', type: 'G3' as V3Type, question: 0 },
    ]
    const bais = groupReview(items, (xs) => [...xs])
    expect(bais.map((b) => [b.type, b.items.length])).toEqual([['G1', 5], ['G1', 2], ['G10', 3], ['mix', 2]])
  })
})

describe('Grammar V3 — furigana cho câu hỏi dạng chữ', () => {
  const dict = readingDict([{ pieces: [{ t: '私', r: 'わたし' }, { t: 'は' }, { t: '学生', r: 'がくせい' }, { t: 'です' }] }])
  it('tách chữ theo từ điển, ô trống thành mảnh blank', () => {
    expect(toPieces('私は学生（＿＿）。', dict)).toEqual([{ t: '私', r: 'わたし' }, { t: 'は' }, { t: '学生', r: 'がくせい' }, { t: '', blank: true }, { t: '。' }])
  })
  it('chữ không có trong từ điển giữ nguyên', () => {
    expect(toPieces('先生です', dict)).toEqual([{ t: '先生です' }])
  })
})
