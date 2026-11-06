import { describe, expect, it } from 'vitest'
import { buildMatchRound, MATCH_PAIR_COUNT, parseMatchPenalties, type MatchCandidate } from '../match-round'
import { seededRng } from '../questions'

let counter = 0
const newId = () => `id-${counter++}`

const word = (n: number, over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: `w${n}`,
  learnerVocabularyId: `lv${n}`,
  expression: `漢${n}`,
  reading_kana: `かな${n}`,
  meaning_vi: `nghĩa ${n}`,
  han_viet: `HÁN ${n}`,
  is_kana_only: false,
  currentStage: 5,
  stage5Active: true,
  ...over,
})
const ten = Array.from({ length: 10 }, (_, i) => word(i))

describe('buildMatchRound', () => {
  it('đủ 6 cặp, cột phải đúng là một hoán vị', () => {
    const round = buildMatchRound(ten, newId, seededRng(1))!
    expect(round.pairs).toHaveLength(MATCH_PAIR_COUNT)
    expect([...round.rightOrder].sort()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('có đủ 4 kiểu cặp qua nhiều lần dựng', () => {
    const types = new Set(Array.from({ length: 60 }, (_, s) => buildMatchRound(ten, newId, seededRng(s + 1))!.pairType))
    expect(types).toEqual(new Set(['kana_meaning', 'kanji_meaning', 'kanji_kana', 'kanji_hanviet']))
  })

  it('ưu tiên từ đang chạy Stage 5', () => {
    const mixed = [
      ...Array.from({ length: 6 }, (_, i) => word(i)),
      ...Array.from({ length: 6 }, (_, i) => word(i + 10, { stage5Active: false })),
    ]
    const round = buildMatchRound(mixed, newId, seededRng(2))!
    expect(round.pairs.every((p) => Number(p.learnerVocabularyId.slice(2)) < 6)).toBe(true)
  })

  it('không lộ Kanji của từ chưa xem Stage 3', () => {
    const notYet = Array.from({ length: 8 }, (_, i) => word(i, { currentStage: 2 }))
    for (let s = 1; s < 30; s++) expect(buildMatchRound(notYet, newId, seededRng(s))!.pairType).toBe('kana_meaning')
  })

  it('từ chỉ có Kana chỉ dùng được Kana ↔ nghĩa', () => {
    const kana = Array.from({ length: 8 }, (_, i) => word(i, { is_kana_only: true, han_viet: null }))
    for (let s = 1; s < 30; s++) expect(buildMatchRound(kana, newId, seededRng(s))!.pairType).toBe('kana_meaning')
  })

  it('không có hai ô cùng chữ, để mỗi ô chỉ có một đáp án', () => {
    const dup = [...ten, word(20, { meaning_vi: 'nghĩa 1' }), word(21, { reading_kana: 'かな1', meaning_vi: 'khác' })]
    for (let s = 1; s < 30; s++) {
      const round = buildMatchRound(dup, newId, seededRng(s))!
      expect(new Set(round.pairs.map((p) => p.right)).size).toBe(6)
      expect(new Set(round.pairs.map((p) => p.left)).size).toBe(6)
    }
  })

  it('bỏ nghĩa quá dài; không đủ 6 cặp thì không có vòng', () => {
    expect(buildMatchRound(ten.slice(0, 5), newId, seededRng(1))).toBeNull()
    const long = ten.map((w) => ({ ...w, is_kana_only: true, meaning_vi: `${w.meaning_vi} ${'x'.repeat(50)}` }))
    expect(buildMatchRound(long, newId, seededRng(1))).toBeNull()
  })
})

describe('parseMatchPenalties', () => {
  const a = { learnerVocabularyId: '11111111-1111-4111-8111-111111111111', clientEventId: '22222222-2222-4222-8222-222222222222' }
  const b = { learnerVocabularyId: '33333333-3333-4333-8333-333333333333', clientEventId: '44444444-4444-4444-8444-444444444444' }

  it('nhận danh sách hợp lệ, bỏ trường lạ', () => {
    expect(parseMatchPenalties([{ ...a, points: 9 }, b])).toEqual([a, b])
    expect(parseMatchPenalties([])).toEqual([])
  })

  it('từ chối dữ liệu sai dạng, trùng từ, quá 6 từ', () => {
    expect(parseMatchPenalties('x')).toBeNull()
    expect(parseMatchPenalties([{ ...a, clientEventId: 'x' }])).toBeNull()
    expect(parseMatchPenalties([a, { ...a, clientEventId: b.clientEventId }])).toBeNull()
    expect(parseMatchPenalties(Array(7).fill(a))).toBeNull()
  })
})
