// V12 (docs/learning-rules-v12.md): luật điểm, bộ thẻ, thứ tự mở, cân bằng, dự báo, chuyển dữ liệu, chấm.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { addStudyDays } from '../../learning/time'
import { parseCsv } from '../../../scripts/seed/csv'
import { balance, balanceTarget, estimatedSeconds, secondsFromStats, type Remaining } from '../balance'
import { reviewCardsFor, typesFor, type CardType } from '../card-types'
import { applyCap, buildDeck, insertRetry, type DeckCard, type DeckInput } from '../deck'
import { forecast, overflowDays, simulateItem } from '../forecast'
import { canOpenKanji, kanjiOrder, radicalOrder, wordKanjiStatus, wordKanjiWaiting, type KanjiRow, type Progress } from '../order'
import { buildReviewCard, buildStageQuestion, gradeCard, gradeQuestion, type Pools } from '../questions'
import { pausedZones } from '../plan'
import { RULES_V12 } from '../rules'
import { applyAnswer, canShow, newItem, plannedShows, type ItemState } from '../stage'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const D0 = '2026-11-20'
const D1 = addStudyDays(D0, 1)

/** Trả lời đúng hết các câu dự kiến của một ngày. */
function playDay(item: ItemState, date: string) {
  let state = item
  let asked = 0
  for (const type of Object.keys(state.types) as CardType[]) {
    for (let n = plannedShows(state, type, date); n > 0 && canShow(state, type, date); n--) {
      state = applyAnswer(state, type, true, date).item
      asked++
    }
  }
  return { state, asked }
}

describe('§3 Điểm theo loại thẻ', () => {
  it('Stage 1 chữ Kanji: mỗi loại 2 điểm (2026-11-26, lần 3); sai −1 và hỏi lại; Stage 2 từ ngày học kế tiếp', () => {
    let item = newItem('kanji', D0)
    expect(Object.keys(item.types)).toEqual(['kanji_hanviet', 'kanji_meaning'])
    expect(plannedShows(item, 'kanji_hanviet', D0)).toBe(2)
    const wrong = applyAnswer(item, 'kanji_hanviet', false, D0)
    expect(wrong.retry).toBe(true)
    expect(wrong.item.types.kanji_hanviet!.points).toBe(0)
    item = wrong.item
    for (let n = 0; n < 2; n++) item = applyAnswer(item, 'kanji_hanviet', true, D0).item
    item = applyAnswer(item, 'kanji_meaning', true, D0).item
    expect(item.stage).toBe(1)
    const r = applyAnswer(item, 'kanji_meaning', true, D0)
    expect(r.stageDone).toBe(true)
    expect(r.item.stage).toBe(2)
    expect(r.item.stageFrom).toBe(D1)
    expect(canShow(r.item, 'hanviet_kanji', D0)).toBe(false)
    expect(canShow(r.item, 'hanviet_kanji', D1)).toBe(true)
  })

  it('Kana (2026-11-26, lần 3): Intro 1 Kana → nghĩa 2 điểm; Intro 2 nghĩa → Kana 2 điểm, nghe → Kana 1 điểm', () => {
    let item = newItem('kana', D0)
    expect(Object.keys(item.types)).toEqual(['kana_meaning'])
    item = applyAnswer(item, 'kana_meaning', true, D0).item
    expect(item.stage).toBe(1)
    const r = applyAnswer(item, 'kana_meaning', true, D0)
    expect(r.item.stage).toBe(2)
    expect(r.item.stageFrom).toBe(D1)
    expect(Object.keys(r.item.types)).toEqual(['meaning_kana', 'listen_kana'])
    expect(plannedShows(r.item, 'meaning_kana', D1)).toBe(2)
    expect(plannedShows(r.item, 'listen_kana', D1)).toBe(1)
  })

  it('chữ Kanji Intro 2 (2026-11-26, lần 3): Hán Việt → chữ, phân biệt chữ giống (nếu có); Intro 3 chỉ gõ Hán Việt', () => {
    expect(typesFor('kanji', 2)).toEqual(['hanviet_kanji'])
    expect(typesFor('kanji', 2, { hasSimilar: true })).toEqual(['hanviet_kanji', 'kanji_similar'])
    expect(typesFor('kanji', 3, { hasSimilar: true })).toEqual(['kanji_type_hanviet'])
    expect(typesFor('word_kanji', 1)).toEqual(['word_hanviet', 'word_meaning'])
    const w = newItem('word_kanji', D0)
    expect(plannedShows(w, 'word_hanviet', D0)).toBe(2)
  })

  it('bộ thủ (giữ như cũ): Intro 1 đúng 1 lần, Intro 2 ngay trong ngày, học xong trong ngày đầu', () => {
    let item = newItem('radical', D0)
    for (const t of typesFor('radical', 1)) item = applyAnswer(item, t, true, D0).item
    expect(item.stage).toBe(2)
    let last
    for (const t of typesFor('radical', 2)) for (let n = 0; n < 2; n++) item = (last = applyAnswer(item, t, true, D0)).item
    expect(item.stage).toBe('review')
    expect(last!.cardsCreated).toEqual([])
  })

  it('Stage 2: mỗi loại 2 điểm (2026-11-20) — đúng hết thì xong trong ngày đầu, Stage 3 từ hôm sau', () => {
    const item: ItemState = { area: 'kana', stage: 2, stageFrom: D0, types: Object.fromEntries(typesFor('kana', 2).map((t) => [t, { points: 0, seenDate: null, seenToday: 0, wrongToday: 0 }])) }
    const day1 = playDay(item, D0)
    expect(day1.asked).toBe(3)
    expect(day1.state.stage).toBe(3)
    expect(day1.state.stageFrom).toBe(D1)
  })

  it('Stage 3: cũng 2 điểm mỗi loại (2026-11-20) — đúng hết thì có Card từ hôm sau', () => {
    const item: ItemState = { area: 'kana', stage: 3, stageFrom: D0, types: Object.fromEntries(typesFor('kana', 3).map((t) => [t, { points: 0, seenDate: null, seenToday: 0, wrongToday: 0 }])) }
    const day1 = playDay(item, D0)
    expect(day1.asked).toBe(2)
    expect(day1.state.stage).toBe('review')
    expect(day1.state.stageFrom).toBe(D1)
  })

  it('sai: −1 (sàn 0), hỏi lại tới khi đủ điểm trong ngày (2026-11-26, bỏ trần 3 lần); lần hỏi lại đúng cũng +1', () => {
    let item: ItemState = { area: 'kana', stage: 2, stageFrom: D0, types: { kana_meaning: { points: 1, seenDate: null, seenToday: 0, wrongToday: 0 } } }
    let r = applyAnswer(item, 'kana_meaning', false, D0)
    expect(r.delta).toBe(-1)
    expect(r.retry).toBe(true)
    r = applyAnswer(r.item, 'kana_meaning', false, D0)
    expect(r.item.types.kana_meaning!.points).toBe(0)
    expect(r.delta).toBe(0)
    r = applyAnswer(r.item, 'kana_meaning', true, D0)
    expect(r.item.types.kana_meaning!.points).toBe(1)
    // Đã gặp 3 lần: vẫn hỏi tiếp vì chưa đủ điểm
    expect(canShow(r.item, 'kana_meaning', D0)).toBe(true)
    for (let n = 0; n < 5; n++) r = applyAnswer(r.item, 'kana_meaning', false, D0)
    expect(r.retry).toBe(true)
    r = applyAnswer(r.item, 'kana_meaning', true, D0)
    r = applyAnswer(r.item, 'kana_meaning', true, D0)
    expect(r.typeDone).toBe(true)
    expect(canShow(r.item, 'kana_meaning', D0)).toBe(false)
    item = { ...r.item, types: { kana_meaning: { points: 1, seenDate: D0, seenToday: 2, wrongToday: 0 } } }
    // Đúng hết thì vẫn 2 lần/ngày
    expect(canShow(item, 'kana_meaning', D0)).toBe(false)
    expect(canShow(item, 'kana_meaning', D1)).toBe(true)
  })

  it('xong Stage cuối: Kana 1 Card, bộ thủ (không có Stage 3) học xong không có Card, chữ 1 Card', () => {
    // 2026-11-22: Từ vựng Kana 1 Card (nghĩa → gõ Kana); bộ thủ không còn Card ôn
    expect(reviewCardsFor('kana')).toEqual(['kana_type'])
    expect(reviewCardsFor('radical')).toEqual([])
    const radical: ItemState = { area: 'radical', stage: 2, stageFrom: D0, types: { hanviet_radical: { points: 1, seenDate: null, seenToday: 0, wrongToday: 0 } } }
    const r = applyAnswer(radical, 'hanviet_radical', true, D0)
    expect(r.item.stage).toBe('review')
    expect(r.cardsCreated).toEqual([])
    expect(reviewCardsFor('kanji')).toEqual(['kanji'])
  })

  it('loại thẻ phân biệt chữ giống nhau chỉ có khi chữ có cặp đã duyệt', () => {
    expect(typesFor('kanji', 2)).not.toContain('kanji_similar')
    expect(typesFor('kanji', 2, { hasSimilar: true })).toContain('kanji_similar')
  })
})

describe('§2 Bộ thẻ trong ngày', () => {
  const posOf = (deck: DeckCard[], key: string) => deck.findIndex((c) => c.key === key)

  it('Stage 1 sau thẻ giới thiệu ở khoảng 0 / 5 / 10 / 10; mọi thẻ có mặt đúng một lần', () => {
    const FOUR = ['kanji_hanviet', 'kanji_meaning', 'hanviet_kanji', 'meaning_kanji'] as const
    const input: DeckInput = {
      newItems: [{ area: 'kanji', itemId: 'k1', stage1Types: FOUR }],
      stageItems: Array.from({ length: 12 }, (_, i) => ({ area: 'kana' as const, itemId: `w${i}`, stage: 2 as const, types: [{ type: 'kana_meaning' as const, shows: 2 }] })),
      reviews: Array.from({ length: 20 }, (_, i) => ({ area: 'kana' as const, itemId: `r${i}`, card: 'kana_type' as const, cardId: `c${i}`, due: new Date(2026, 10, 1) })),
    }
    for (let s = 1; s <= 20; s++) {
      const deck = buildDeck(input, seeded(s))
      expect(deck).toHaveLength(1 + 4 + 24 + 20)
      const intro = posOf(deck, 'intro:kanji:k1')
      const at = FOUR.map((t) => posOf(deck, `s1:kanji:k1:${t}:0`))
      expect(at[0]).toBe(intro + 1)
      expect(at[1]).toBe(at[0] + 1 + 5)
      expect(at[2]).toBe(at[1] + 1 + 10)
      expect(at[3]).toBe(at[2] + 1 + 10)
      // Hai lần gặp cùng loại thẻ cách ít nhất 5 thẻ
      for (let i = 0; i < 12; i++) expect(posOf(deck, `s2:kana:w${i}:kana_meaning:1`) - posOf(deck, `s2:kana:w${i}:kana_meaning:0`)).toBeGreaterThan(5)
    }
  })

  it('nhiều mục mới cùng lúc: chuỗi Stage 1 đan nhau, khoảng cách ít nhất 0 / 5 / 10; thẻ giới thiệu luôn trước', () => {
    const input: DeckInput = {
      newItems: Array.from({ length: 5 }, (_, i) => ({ area: 'kanji' as const, itemId: `n${i}`, stage1Types: [...typesFor('kanji', 1), ...typesFor('kanji', 1)] })),
      stageItems: Array.from({ length: 15 }, (_, i) => ({ area: 'kana' as const, itemId: `w${i}`, stage: 2 as const, types: typesFor('kana', 2).map((type) => ({ type, shows: 2 })) })),
      reviews: Array.from({ length: 30 }, (_, i) => ({ area: 'kana' as const, itemId: `r${i}`, card: 'kana_type' as const, cardId: `c${i}`, due: new Date() })),
    }
    for (let s = 1; s <= 20; s++) {
      const deck = buildDeck(input, seeded(s))
      expect(deck).toHaveLength(5 * 5 + 15 * 4 + 30)
      expect(new Set(deck.map((c) => c.key)).size).toBe(deck.length)
      for (let i = 0; i < 5; i++) {
        const intro = posOf(deck, `intro:kanji:n${i}`)
        const [a, b] = typesFor('kanji', 1).map((t) => posOf(deck, `s1:kanji:n${i}:${t}:0`))
        expect(a).toBeGreaterThan(intro)
        expect(b - a).toBeGreaterThanOrEqual(6)
        // Lần gặp thứ hai của cùng loại cách lần đầu ít nhất 5 thẻ
        for (const t of typesFor('kanji', 1)) expect(posOf(deck, `s1:kanji:n${i}:${t}:1`) - posOf(deck, `s1:kanji:n${i}:${t}:0`)).toBeGreaterThan(5)
      }
    }
  })

  it('trần: giữ mục đang học Stage, rồi Card đến hạn sớm nhất, mục mới sau cùng', () => {
    const input: DeckInput = {
      newItems: [{ area: 'kana', itemId: 'n1', stage1Types: ['kana_meaning', 'meaning_kana'] }],
      stageItems: [{ area: 'kana', itemId: 's1', stage: 2, types: [{ type: 'kana_meaning', shows: 2 }] }],
      reviews: [
        { area: 'kana', itemId: 'a', card: 'kana_type', cardId: 'late', due: new Date(2026, 10, 19) },
        { area: 'kana', itemId: 'b', card: 'kana_type', cardId: 'early', due: new Date(2026, 10, 10) },
      ],
    }
    const { input: kept, deferred } = applyCap(input, 3)
    expect(kept.stageItems).toHaveLength(1)
    expect(kept.reviews.map((r) => r.cardId)).toEqual(['early'])
    expect(deferred).toEqual({ newItems: 1, stageItems: 0, reviews: 1 })
  })

  it('hỏi lại sau 5 thẻ; câu sao tối đa 2 mỗi set', () => {
    const base: DeckInput = { newItems: [], stageItems: [], reviews: Array.from({ length: 30 }, (_, i) => ({ area: 'kana' as const, itemId: `r${i}`, card: 'kana_type' as const, cardId: `c${i}`, due: new Date() })) }
    const deck = buildDeck(base, seeded(3))
    const again = insertRetry(deck, 4, deck[4])
    expect(again[10].key).toBe(`${deck[4].key}:r4`)
    expect((insertRetry(deck, 28, deck[28]).at(-1) as { retry?: boolean }).retry).toBe(true)
    const withStars = buildDeck({ ...base, stars: Array.from({ length: 9 }, (_, i) => ({ area: 'kana' as const, itemId: `s${i}`, type: 'kana_meaning' as const })) }, seeded(4), 10)
    // 30 thẻ → 3 set → tối đa 6 câu sao
    expect(withStars.filter((c) => c.kind === 'star')).toHaveLength(6)
  })
})

describe('§5–6 Thứ tự mở', () => {
  const rows = (name: string) => {
    const [head, ...body] = parseCsv(readFileSync(join(process.cwd(), 'data', 'n5', name), 'utf8')).records.map((r) => r.cells)
    return body.map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ''])))
  }

  it('bộ thủ: 100 bộ, bộ có trong nhiều chữ học trước', () => {
    const order = radicalOrder(rows('radical_meanings.csv').map((r) => ({ number: Number(r.number), n5n4Kanji: Number(r.n5n4_kanji) })))
    expect(order).toHaveLength(100)
    expect(order[0]).toBe(30) // 口
  })

  it('chữ: dễ → khó (2026-11-24) — N5 trước N4, ít nét trước, cùng nét thì phổ biến trước; thành phần học trước chữ chứa nó', () => {
    const k = (character: string, level: number, strokes: number, freq: number, components: string[] = []): KanjiRow => ({ character, level, freq, strokes, components, radicals: [] })
    // 国 (8 nét) phổ biến hơn 木 (4 nét) nhưng học sau; 休 cần 人 (thành phần) trước
    expect(kanjiOrder([k('国', 5, 8, 1), k('木', 5, 4, 50), k('休', 5, 6, 30, ['人']), k('人', 5, 2, 5), k('一', 5, 1, 2), k('二', 5, 2, 9)])).toEqual(['一', '人', '二', '木', '休', '国'])
    expect(kanjiOrder([k('話', 5, 13, 100, ['言']), k('言', 4, 7, 200), k('日', 5, 4, 1), k('語', 4, 14, 50)])).toEqual(['日', '言', '話', '語'])
  })

  it('chữ mở khi các bộ trong phạm vi đã qua Stage 1', () => {
    const progress = new Map<number, Progress>([[85, 2]])
    expect(canOpenKanji({ radicals: [85, 999] }, new Set([85]), progress)).toBe(true)
    expect(canOpenKanji({ radicals: [85, 30] }, new Set([85, 30]), progress)).toBe(false)
  })

  it('Từ vựng Kanji (2026-11-24): mở khi Kana đã vào Stage 2 và mọi chữ đã học xong; không còn hàng chờ', () => {
    const word = { id: 'w', level: 5, kanaOnly: false, kanji: ['寝'] }
    expect(wordKanjiStatus(word, 2, new Map([['寝', 'review']]))).toBe('open')
    expect(wordKanjiStatus(word, 2, new Map([['寝', 3]]))).toBe('locked')
    expect(wordKanjiStatus(word, 2, new Map())).toBe('locked')
    expect(wordKanjiStatus(word, 1, new Map([['寝', 'review']]))).toBe('locked')
    expect(wordKanjiStatus({ ...word, kanaOnly: true }, 'review', new Map())).toBe('none')
  })
})

describe('§8 Cân bằng theo thời gian', () => {
  it('thời gian ước tính khớp bảng §8.1', () => {
    // 2026-11-26 (lần 3): Kana 15 + 2×6 + (2 + 1)×6 + 2×12 + 60; chữ 15 + 4×6 + 2×6 + 2×12 + 60; Từ Kanji 15 + 4×6 + 4×6 + 2×12 + 60
    expect(estimatedSeconds('kana')).toBe(129)
    expect(estimatedSeconds('radical')).toBe(51)
    expect(estimatedSeconds('kanji')).toBe(135)
    expect(estimatedSeconds('word_kanji')).toBe(147)
  })

  it('ba khu hết cùng ngày (tính lại mỗi ngày, cộng dồn phần lẻ); bộ thủ học trước chữ', () => {
    let rem: Remaining = { kana: 425, radical: 100, kanji: 263, word_kanji: 300 }
    let carry = {}
    let date = D0
    const lastDay: Record<string, number> = {}
    const first = balance(rem, { kind: 'minutes', minutes: 30 }, D0)
    for (let d = 0; d < first.days + 5 && Object.values(rem).some((n) => n > 0); d++) {
      const r = balance(rem, { kind: 'date', date: first.finishDate }, date, undefined, carry)
      // Chữ chỉ mở khi bộ thủ đã mở hết (ngày mở bộ cuối cùng thì phần thời gian còn lại dành cho chữ)
      if (rem.radical > r.today.radical) expect(r.today.kanji).toBe(0)
      for (const a of ['kana', 'radical', 'kanji', 'word_kanji'] as const) {
        rem = { ...rem, [a]: rem[a] - r.today[a] }
        if (r.today[a] > 0) lastDay[a] = d
      }
      carry = r.carry
      date = addStudyDays(date, 1)
    }
    expect(Object.values(rem).every((n) => n === 0)).toBe(true)
    expect(lastDay.kana).toBe(first.days - 1)
    expect(lastDay.kanji).toBe(first.days - 1)
    expect(lastDay.word_kanji).toBe(first.days - 1)
  })

  it('dừng một khu khi bật cân bằng: khu dừng không mở mục mới, thời gian chia cho các khu còn chạy', () => {
    const rem: Remaining = { kana: 425, radical: 0, kanji: 263, word_kanji: 300 }
    const normal = balance(rem, { kind: 'minutes', minutes: 20 }, D0)
    const paused = balance(rem, { kind: 'minutes', minutes: 20 }, D0, undefined, { kanji: 0.4 }, { kanji: true })
    expect(paused.today.kanji).toBe(0)
    expect(paused.carry.kanji).toBe(0.4)
    // Thời gian của khu dừng dồn sang khu còn chạy: các khu còn chạy xong sớm hơn
    expect(paused.days).toBeLessThan(normal.days)
    // Tổng thời gian mục mới trung bình mỗi ngày vẫn gần 20 phút (phần lẻ cộng dồn)
    let r2 = rem
    let carry: Partial<Record<keyof Remaining, number>> = {}
    let day = D0
    const mins: number[] = []
    for (let d = 0; d < 30; d++) {
      const r = balance(r2, { kind: 'minutes', minutes: 20 }, day, undefined, carry, { kanji: true })
      mins.push(r.minutes.kana + r.minutes.kanji + r.minutes.word_kanji)
      r2 = { ...r2, kana: r2.kana - r.today.kana, word_kanji: r2.word_kanji - r.today.word_kanji }
      carry = r.carry
      day = addStudyDays(day, 1)
    }
    const avg = mins.reduce((a, b) => a + b, 0) / mins.length
    expect(avg).toBeGreaterThan(18)
    expect(avg).toBeLessThanOrEqual(20.5)
    // Mục tiêu ngày: khu còn chạy giữ chỉ tiêu theo ngày đó
    const date = addStudyDays(D0, 99)
    expect(balance(rem, { kind: 'date', date }, D0, undefined, {}, { kanji: true }).today.kana).toBe(balance(rem, { kind: 'date', date }, D0).today.kana)
  })

  it('§8.1 hiệu chỉnh bằng thời gian thật: chưa đủ 14 ngày giữ ước tính; đủ thì nhân theo tỷ lệ thật / ước tính', () => {
    const rows = (days: number) => [
      { area: 'kana' as const, cardType: 'kana_meaning', isCard: false, answers: 100, realMs: 1_200_000, studyDays: days },
      { area: 'kana' as const, cardType: 'kana_type', isCard: true, answers: 10, realMs: 150_000, studyDays: days },
    ]
    expect(secondsFromStats(rows(13)).kana).toBe(estimatedSeconds('kana'))
    // Ước tính 100 × 6 + 10 × 15 = 750 giây; thật 1.350 giây → ×1,8
    expect(secondsFromStats(rows(14)).kana).toBeCloseTo(estimatedSeconds('kana') * 1.8)
    expect(secondsFromStats(rows(14)).kanji).toBe(estimatedSeconds('kanji'))
  })

  it('luật dừng mục mới: khu tồn (câu Stage + Card đến hạn) từ trần trở lên thì không mở mục mới', () => {
    const caps = { kana: 120, kanji: 100, word_kanji: 80 }
    expect(pausedZones({ kana: 119, kanji: 100, word_kanji: 300 }, caps)).toEqual({ kana: false, kanji: true, word_kanji: true })
    expect(pausedZones({ kana: 0, kanji: 0, word_kanji: 0 }, caps)).toEqual({ kana: false, kanji: false, word_kanji: false })
  })

  it('mục tiêu từ Settings: ngày đã qua hoặc chưa chọn thì dùng số mục mỗi ngày, không dồn mọi mục vào một ngày', () => {
    const tomorrow = addStudyDays(D0, 1)
    expect(balanceTarget('date', tomorrow, 12, D0)).toEqual({ kind: 'date', date: tomorrow })
    expect(balanceTarget('date', D0, 12, D0)).toEqual({ kind: 'date', date: D0 })
    expect(balanceTarget('date', addStudyDays(D0, -3), 12, D0)).toEqual({ kind: 'items', perDay: 12 })
    expect(balanceTarget('date', null, 12, D0)).toEqual({ kind: 'items', perDay: 12 })
    expect(balanceTarget('items', tomorrow, 30, D0)).toEqual({ kind: 'items', perDay: 30 })
    const rem: Remaining = { kana: 425, radical: 100, kanji: 263, word_kanji: 300 }
    const passed = balance(rem, balanceTarget('date', addStudyDays(D0, -3), 12, D0), D0)
    expect(passed.days).toBeGreaterThan(30)
    expect(passed.today.kana).toBeLessThan(rem.kana / 10)
  })

  it('mục tiêu số mục (2026-11-20): mỗi ngày đúng tổng số mục (trung bình), chia theo số mục còn lại, ba khu xong cùng ngày', () => {
    let rem: Remaining = { kana: 581, radical: 100, kanji: 78, word_kanji: 526 }
    let carry: Partial<Record<keyof Remaining, number>> = {}
    let date = D0
    const totals: number[] = []
    const lastDay: Record<string, number> = {}
    const first = balance(rem, { kind: 'items', perDay: 12 }, D0)
    expect(first.days).toBe(Math.ceil(1285 / 12))
    // Hôm nay: Kana ~581/108, Từ vựng Kanji ~526/108, khu Kanji ~178/108 (bộ thủ trước)
    expect(first.today.kana + first.today.radical + first.today.kanji + first.today.word_kanji).toBeLessThanOrEqual(12)
    expect(first.today.kanji).toBe(0)
    for (let d = 0; d < 200 && Object.values(rem).some((n) => n > 0); d++) {
      const r = balance(rem, { kind: 'items', perDay: 12 }, date, undefined, carry)
      totals.push(r.today.kana + r.today.radical + r.today.kanji + r.today.word_kanji)
      for (const a of ['kana', 'radical', 'kanji', 'word_kanji'] as const) {
        rem = { ...rem, [a]: rem[a] - r.today[a] }
        if (r.today[a] > 0) lastDay[a] = d
      }
      carry = r.carry
      date = addStudyDays(date, 1)
    }
    expect(Object.values(rem).every((n) => n === 0)).toBe(true)
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    expect(avg).toBeGreaterThan(11.5)
    expect(avg).toBeLessThanOrEqual(12)
    expect(Math.max(...totals)).toBeLessThanOrEqual(14)
    expect(Math.abs(lastDay.kana - lastDay.word_kanji)).toBeLessThanOrEqual(1)
    expect(Math.abs(lastDay.kana - lastDay.kanji)).toBeLessThanOrEqual(1)
  })

  it('mục tiêu số phút: trung bình cả kỳ gần đúng số phút đặt ra (phần lẻ cộng dồn)', () => {
    let rem: Remaining = { kana: 425, radical: 0, kanji: 263, word_kanji: 300 }
    let carry = {}
    let date = D0
    const minutes: number[] = []
    for (let d = 0; d < 400 && Object.values(rem).some((n) => n > 0); d++) {
      const r = balance(rem, { kind: 'minutes', minutes: 20 }, date, undefined, carry)
      minutes.push(r.minutes.kana + r.minutes.kanji + r.minutes.word_kanji)
      for (const a of ['kana', 'radical', 'kanji', 'word_kanji'] as const) rem = { ...rem, [a]: rem[a] - r.today[a] }
      carry = r.carry
      date = addStudyDays(date, 1)
    }
    const avg = minutes.reduce((a, b) => a + b, 0) / minutes.length
    expect(avg).toBeGreaterThan(18)
    expect(avg).toBeLessThanOrEqual(20.5)
  })
})

describe('§2 Dự báo vượt trần', () => {
  it('một từ Kana mới (đúng hết): Intro 1 2 câu, Intro 2 3 câu hôm sau, Intro 3 2 câu gõ, Card từ ngày thứ 4', () => {
    const sim = simulateItem(newItem('kana', D0), D0, 7)
    expect(sim.counts).toEqual([2, 3, 2, 0, 0, 0, 0])
    expect(sim.cardsFrom).toBe(3)
  })

  it('báo ngày vượt trần', () => {
    const days = forecast({ today: D0, items: [], reviewsByDay: { kana: [5, 200], kanji: [], word_kanji: [] }, newPerDay: { kana: 3 }, caps: { kana: 100, kanji: 100, word_kanji: 100 } })
    expect(days).toHaveLength(7)
    expect(days[0].counts.kana).toBe(5 + 3 * 2)
    expect(overflowDays(days).map((d) => d.date)).toEqual([D1])
    expect(days[1].over.kana).toBe(200 + 3 * 3 + 3 * 2 - 100)
  })
})

describe('Câu hỏi và chấm', () => {
  const pools: Pools = {
    kana: ['ねこ', 'いぬ', 'とり', 'さかな', 'テレビ'].map((k, i) => ({ id: `w${i}`, kana: k, meaning: `nghĩa ${i}`, hanViet: null })),
    radical: ['口', '人', '水', '木'].map((c, i) => ({ id: `r${i}`, char: c, name: `Tên ${i}`, meaning: `nghĩa ${i}` })),
    kanji: ['日', '目', '月', '木'].map((c, i) => ({ id: `k${i}`, char: c, hanViet: `HV${i}`, meaning: `nghĩa ${i}`, similar: c === '日' ? ['目'] : [] })),
    word_kanji: ['学校', '学生', '先生', '日本'].map((e, i) => ({ id: `v${i}`, expression: e, kana: `かな${i}`, hanViet: `HV ${i}`, meaning: `nghĩa ${i}` })),
  }
  const itemFor = { kana: pools.kana[4], radical: pools.radical[0], kanji: pools.kanji[0], word_kanji: pools.word_kanji[0] }

  it('mọi loại thẻ dựng được; đáp án đúng chấm đúng; lựa chọn không trùng', () => {
    for (const area of ['kana', 'radical', 'kanji', 'word_kanji'] as const) {
      for (const stage of [1, 2, 3] as const) {
        for (const type of typesFor(area, stage, { hasSimilar: true })) {
          const q = buildStageQuestion(type, itemFor[area], pools, seeded(1))
          if (q.kind === 'choice') {
            expect(new Set(q.options).size, type).toBe(4)
            expect(q.options).toContain(q.answer)
          }
          expect(gradeQuestion(q, q.answer), type).toBe(true)
        }
      }
    }
  })

  it('gõ: Kana không phân biệt bảng chữ; Hán Việt không cần dấu; Card gom chung sai một phần là sai', () => {
    expect(gradeQuestion(buildStageQuestion('meaning_type_kana', itemFor.kana, pools, seeded(1)), 'てれび')).toBe(true)
    expect(gradeQuestion({ kind: 'typing', prompt: '', promptKind: 'kanji', input: 'text', answer: 'NHẬT' }, 'nhat')).toBe(true)
    const card = buildReviewCard('word_kanji', itemFor.word_kanji, pools, seeded(2))
    // Card Từ vựng Kanji không hỏi cách đọc Kana (2026-11-19)
    expect(card.parts.map((p) => p.part)).toEqual(['type_hanviet', 'choose_meaning'])
    expect(gradeCard(card.parts, ['hv 0', 'nghĩa 0'])).toBe(true)
    expect(gradeCard(card.parts, ['hv 0', 'nghĩa 1'])).toBe(false)
    expect(RULES_V12.points.correct).toBe(1)
  })
})

describe('Dữ liệu thật N5–N4: mọi mục dựng được đủ loại thẻ', () => {
  const rows = (name: string) => {
    const [head, ...body] = parseCsv(readFileSync(join(process.cwd(), 'data', 'n5', name), 'utf8')).records.map((r) => r.cells)
    return body.map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ''])))
  }
  const vocab = rows('vocabularies.csv').filter((r) => r.jlpt_level === '5' || r.jlpt_level === '4')
  const policy = new Map(rows('kanji_policy.csv').map((r) => [r.code, r.policy]))
  const names = new Map(rows('radicals.csv').map((r) => [r.number, r.name_vi.replace(/^Bộ /, '')]))
  const radicalRows = rows('radical_meanings.csv')
  const inScope = new Set(radicalOrder(radicalRows.map((r) => ({ number: Number(r.number), n5n4Kanji: Number(r.n5n4_kanji) }))))
  const kanjiRows = rows('kanji.csv').filter((r) => r.jlpt_level === '5' || r.jlpt_level === '4')
  const similar = new Map<string, string[]>()
  for (const r of rows('kanji_similar.csv').filter((x) => x.approved === 'true')) {
    similar.set(r.a, [...(similar.get(r.a) ?? []), r.b])
    similar.set(r.b, [...(similar.get(r.b) ?? []), r.a])
  }
  const pools: Pools = {
    kana: vocab.map((r) => ({ id: r.code, kana: r.reading_kana, meaning: r.meaning_vi, hanViet: r.han_viet || null })),
    radical: radicalRows.filter((r) => inScope.has(Number(r.number))).map((r) => ({ id: r.number, char: r.character, name: names.get(r.number)!, meaning: r.meaning_vi })),
    kanji: kanjiRows.map((r) => ({ id: r.character, char: r.character, hanViet: r.han_viet, meaning: r.meaning_vi, similar: similar.get(r.character) ?? [] })),
    word_kanji: vocab
      .filter((r) => r.han_viet && policy.get(r.code) !== 'KANA_ONLY' && r.expression !== r.reading_kana)
      .map((r) => ({ id: r.code, expression: r.expression, kana: r.reading_kana, hanViet: r.han_viet, meaning: r.meaning_vi })),
  }

  it('đáp án nhiễu 3 tầng (2026-11-24): có mục gần giống, có mục vừa học, không trùng đáp án đúng', () => {
    const kanjiOf = (c: string) => pools.kanji.find((k) => k.char === c)!
    // 休: chữ trông giống / chung thành phần (体, 人, 木) phải có trong lựa chọn
    for (let s = 1; s <= 20; s++) {
      const q = buildStageQuestion('meaning_kanji', kanjiOf('休'), pools, seeded(s))
      if (q.kind !== 'choice') throw new Error('phải là câu chọn')
      expect(q.options.filter((o) => ['体', '人', '木'].includes(o)).length, q.options.join('')).toBeGreaterThanOrEqual(1)
    }
    // 学校: từ có chung chữ (学生, 高校…) phải có trong lựa chọn
    const gakkou = pools.word_kanji.find((w) => w.expression === '学校')!
    const q2 = buildStageQuestion('meaning_word', gakkou, pools, seeded(3))
    if (q2.kind !== 'choice') throw new Error('phải là câu chọn')
    expect(q2.options.filter((o) => o !== '学校' && (o.includes('学') || o.includes('校'))).length).toBeGreaterThanOrEqual(1)
    // Có mục vừa học: đáp án nhiễu còn lại lấy từ danh sách vừa học
    const recentIds = pools.kana.slice(100, 115).map((w) => w.id)
    const withRecent: Pools = { ...pools, recent: { kana: recentIds } }
    const target = pools.kana[5]
    let fromRecent = 0
    for (let s = 1; s <= 30; s++) {
      const q = buildStageQuestion('meaning_kana', target, withRecent, seeded(s))
      if (q.kind !== 'choice') throw new Error('phải là câu chọn')
      expect(new Set(q.options).size).toBe(4)
      fromRecent += q.options.filter((o) => recentIds.some((id) => pools.kana.find((w) => w.id === id)!.kana === o)).length
      // Không đáp án nhiễu nào cùng nghĩa với đáp án đúng
      for (const o of q.options.filter((x) => x !== target.kana)) expect(pools.kana.find((w) => w.kana === o)!.meaning).not.toBe(target.meaning)
    }
    expect(fromRecent).toBeGreaterThanOrEqual(30)
  })

  it('mọi loại thẻ Stage và Card Review của mọi mục: dựng được, đáp án đúng chấm đúng', () => {
    let n = 0
    for (const area of ['kana', 'radical', 'kanji', 'word_kanji'] as const) {
      for (const [i, item] of pools[area].entries()) {
        const hasSimilar = area === 'kanji' && ((item as { similar?: readonly string[] }).similar?.length ?? 0) > 0
        for (const stage of [1, 2, 3] as const) {
          for (const type of typesFor(area, stage, { hasSimilar })) {
            const q = buildStageQuestion(type, item, pools, seeded(i + 1))
            expect(gradeQuestion(q, q.answer), `${area} ${item.id} ${type}`).toBe(true)
            n++
          }
        }
        for (const card of reviewCardsFor(area)) {
          const c = buildReviewCard(card, item, pools, seeded(i + 2))
          expect(gradeCard(c.parts, c.parts.map((p) => p.question.answer)), `${area} ${item.id} ${card}`).toBe(true)
        }
      }
    }
    expect(pools.radical).toHaveLength(100)
    expect(n).toBeGreaterThan(10000)
  })
})

describe('Chọn mục mới hôm nay (plan)', () => {
  const words = Array.from({ length: 6 }, (_, i) => ({ id: `w${i}`, level: i < 4 ? 5 : 4, sortOrder: i, kanaOnly: false, kanji: i === 0 ? ['日'] : [] }))
  const kanji = [
    { id: 'k-hi', character: '日', level: 5, freq: 1, strokes: 4, components: [], radicals: [72] },
    { id: 'k-me', character: '目', level: 5, freq: 50, strokes: 5, components: [], radicals: [109] },
  ]
  const base = {
    today: D0,
    words,
    radicals: [72, 109],
    kanji,
    wordKanji: [words[0]],
    progress: new Map<string, Progress>(),
    openedToday: { kana: 0, radical: 0, kanji: 0, word_kanji: 0 },
    balanceOn: false,
    target: { kind: 'minutes' as const, minutes: 20 },
    manual: { kana: 2, kanji: 3, word_kanji: 2 },
  }

  it('cấp N5 trước; Kana theo thứ tự; khu Kanji: bộ thủ trước, chữ chỉ mở khi bộ đã qua Stage 1', async () => {
    const { planNewItems } = await import('../plan')
    const r = planNewItems(base)
    expect(r.level).toBe(5)
    expect(r.open.kana).toEqual(['w0', 'w1'])
    expect(r.open.radical).toEqual([72, 109])
    expect(r.open.kanji).toEqual([])
    // Bộ 72 đã qua Stage 1 → mở được 日, chưa mở được 目
    const r2 = planNewItems({ ...base, progress: new Map<string, Progress>([['radical:72', 2], ['radical:109', 1]]) })
    expect(r2.open.radical).toEqual([])
    expect(r2.open.kanji).toEqual(['k-hi'])
  })

  it('khu bị dừng mục mới thì không mở gì ở khu đó, khu khác vẫn mở (cả khi bật cân bằng)', async () => {
    const { planNewItems } = await import('../plan')
    const r = planNewItems({ ...base, paused: { kanji: true } })
    expect(r.open.kana).toEqual(['w0', 'w1'])
    expect(r.open.radical).toEqual([])
    expect(r.open.kanji).toEqual([])
    const b = planNewItems({ ...base, balanceOn: true, paused: { kana: true } })
    expect(b.open.kana).toEqual([])
    expect(b.open.radical.length).toBeGreaterThan(0)
  })

  it('đã mở hôm nay thì không mở thêm quá chỉ tiêu', async () => {
    const { planNewItems } = await import('../plan')
    expect(planNewItems({ ...base, openedToday: { kana: 2, radical: 0, kanji: 0, word_kanji: 0 } }).open.kana).toEqual([])
  })

  it('Từ vựng Kanji: chỉ mở khi mọi chữ đã học xong; từ N5 có chữ N4 thuộc cấp N4; từ có chữ ngoài N5–N4 thì chưa có', async () => {
    const { planNewItems } = await import('../plan')
    expect(planNewItems({ ...base, progress: new Map<string, Progress>([['kana:w0', 2], ['kanji:k-hi', 'review']]) }).open.word_kanji).toEqual(['w0'])
    // Chữ mới ở Stage 2: chưa mở (không còn hàng chờ)
    expect(planNewItems({ ...base, progress: new Map<string, Progress>([['kana:w0', 2], ['kanji:k-hi', 2]]) }).open.word_kanji).toEqual([])
    // Từ N5 chứa chữ N4 (語): không tính vào cấp N5; từ chứa chữ ngoài danh sách (図): không có thẻ
    const w4 = { ...words[1], kanji: ['語'] }
    const wx = { ...words[2], kanji: ['図'] }
    const withN4 = { ...base, kanji: [...kanji, { id: 'k-go', character: '語', level: 4, freq: 9, strokes: 14, components: [], radicals: [] }], wordKanji: [words[0], w4, wx] }
    expect(planNewItems(withN4).remaining.word_kanji).toBe(1)
  })

  it('N3–N2 (2026-11-27): khu Kanji học tiếp N3 rồi N2; từ N5 có chữ N3 mở ở cấp N3; chữ N1 vẫn chặn', async () => {
    const { planNewItems } = await import('../plan')
    const n3 = { id: 'k-ka', character: '可', level: 3, freq: 300, strokes: 5, components: [], radicals: [] }
    const n2 = { id: 'k-ni', character: '了', level: 2, freq: 900, strokes: 2, components: [], radicals: [] }
    const n1 = { id: 'k-x', character: '丑', level: 1, freq: null, strokes: 4, components: [], radicals: [] }
    const done = new Map<string, Progress>([['kanji:k-hi', 'review'], ['kanji:k-me', 'review'], ['radical:72', 'review'], ['radical:109', 'review']])
    const w3 = { ...words[1], kanji: ['日', '可'] }
    const w1 = { ...words[2], kanji: ['丑'] }
    const input = { ...base, kanji: [...kanji, n2, n3, n1], wordKanji: [words[0], w3, w1], progress: done }
    const r = planNewItems(input)
    expect(r.levels.kanji).toBe(3)
    expect(r.open.kanji).toEqual(['k-ka'])
    // Từ N5 có chữ N3: chỉ từ 日 (N5) còn ở cấp N5; mở hết N5 thì khu Từ vựng Kanji sang N3
    expect(r.levels.word_kanji).toBe(5)
    const later = planNewItems({ ...input, progress: new Map<string, Progress>([...done, ['word_kanji:w0', 'review'], ['kanji:k-ka', 'review']]) })
    expect(later.levels.kanji).toBe(2)
    expect(later.levels.word_kanji).toBe(3)
    expect(later.remaining.word_kanji).toBe(1)
  })

  it('cân bằng: chỉ tiêu từ balance, ba khu cùng chia theo số ngày', async () => {
    const { planNewItems } = await import('../plan')
    const r = planNewItems({ ...base, balanceOn: true, target: { kind: 'date', date: addStudyDays(D0, 1) } })
    expect(r.balance?.days).toBe(2)
    expect(r.open.kana).toHaveLength(2) // 4 từ N5 / 2 ngày
  })
})

describe('Nhịp học tự nhập (2026-11-24)', () => {
  it('đề xuất số chữ / từ Kanji để xong cùng Kana; ước tính ngày xong và phút mỗi ngày', async () => {
    const { paceEstimate } = await import('../pace')
    const r = paceEstimate({ remaining: { kana: 580, kanji: 80, word_kanji: 120 }, perDay: { kana: 10, kanji: 2, word_kanji: 1 }, seconds: { kana: 135, kanji: 135, word_kanji: 147 } })
    expect(r.days).toEqual({ kana: 58, kanji: 40, word_kanji: 120 })
    expect(r.suggest).toEqual({ kanji: 2, word_kanji: 3 })
    expect(r.total).toBe(123)
    expect(r.minutes).toBe(Math.round((10 * 135 + 2 * 135 + 147) / 60))
    // Khu đặt 0 mà còn mục: chưa có ngày xong
    expect(paceEstimate({ remaining: { kana: 10, kanji: 5, word_kanji: 0 }, perDay: { kana: 5, kanji: 0, word_kanji: 0 }, seconds: { kana: 1, kanji: 1, word_kanji: 1 } }).total).toBeNull()
  })
})

describe('Từ vựng Kanji chờ chữ (2026-11-25)', () => {
  it('chờ khi còn chữ chưa học xong; chữ ngoài N5–N4 cũng chặn', () => {
    const p = new Map<string, Progress>([['会', 'review'], ['社', 2], ['国', 'review']])
    expect(wordKanjiWaiting(['会', '社'], p)).toBe(true)
    expect(wordKanjiWaiting(['会'], p)).toBe(false)
    expect(wordKanjiWaiting(['韓', '国'], p)).toBe(true)
  })
})

describe('Từ vựng Kanji trọng tâm Hán Việt (2026-11-26)', () => {
  const pools: Pools = {
    kana: [],
    radical: [],
    kanji: [],
    word_kanji: [
      { id: 'a', expression: '会社', kana: 'かいしゃ', hanViet: 'HỘI XÃ', meaning: 'công ty' },
      { id: 'b', expression: '社員', kana: 'しゃいん', hanViet: 'XÃ VIÊN', meaning: 'nhân viên công ty' },
      { id: 'c', expression: '会社員', kana: 'かいしゃいん', hanViet: 'HỘI XÃ VIÊN', meaning: 'nhân viên công ty' },
      { id: 'd', expression: '社長', kana: 'しゃちょう', hanViet: 'XÃ TRƯỞNG', meaning: 'giám đốc' },
      { id: 'e', expression: '電話', kana: 'でんわ', hanViet: 'ĐIỆN THOẠI', meaning: 'điện thoại' },
    ],
  }
  it('Intro 1 từ → Hán Việt · từ → nghĩa; Intro 2 nghĩa → Hán Việt · Hán Việt → từ; Intro 3 nghĩa → gõ Hán Việt', () => {
    expect(typesFor('word_kanji', 1)).toEqual(['word_hanviet', 'word_meaning'])
    expect(typesFor('word_kanji', 2)).toEqual(['meaning_hanviet', 'hanviet_word'])
    expect(typesFor('word_kanji', 3)).toEqual(['meaning_type_hanviet'])
  })
  it('nghĩa → Hán Việt không lấy từ trùng nghĩa làm đáp án nhiễu', () => {
    for (let i = 0; i < 20; i++) {
      const q = buildStageQuestion('meaning_hanviet', pools.word_kanji[1], pools, Math.random)
      expect(q.kind === 'choice' && q.options).not.toContain('HỘI XÃ VIÊN')
      expect(q.kind === 'choice' && q.answer).toBe('XÃ VIÊN')
    }
  })
  it('nghĩa → gõ Hán Việt hiện cách đọc dưới nghĩa', () => {
    const q = buildStageQuestion('meaning_type_hanviet', pools.word_kanji[2], pools, Math.random)
    expect(q).toMatchObject({ kind: 'typing', prompt: 'nhân viên công ty', reading: 'かいしゃいん', answer: 'HỘI XÃ VIÊN' })
  })
  it('cách đọc hiện trên đề có từ Kanji (chỉ nhắc lại, không hỏi)', () => {
    const w = pools.word_kanji[0]
    for (const t of ['word_hanviet', 'word_meaning', 'meaning_hanviet'] as const) expect(buildStageQuestion(t, w, { ...pools, word_kanji: [...pools.word_kanji] }, Math.random)).toMatchObject({ reading: 'かいしゃ' })
    expect(buildReviewCard('word_kanji', w, pools, Math.random).reading).toBe('かいしゃ')
    expect(buildStageQuestion('hanviet_word', w, pools, Math.random)).not.toHaveProperty('reading')
  })
})

describe('Ngày đầu học Intro 1 + 2, cấp riêng từng khu, ước tính Từ Kanji (2026-11-26)', () => {
  const posOf = (deck: DeckCard[], key: string) => deck.findIndex((c) => c.key === key)
  it('xong Stage 1 giữa phiên: chèn câu Stage 2 vào phần còn lại, hai lần cùng loại cách ít nhất 5 thẻ', async () => {
    const { insertStageCards } = await import('../deck')
    const deck: DeckCard[] = Array.from({ length: 30 }, (_, i) => ({ kind: 'review', key: `rv:c${i}`, area: 'kana', itemId: `r${i}`, card: 'kana_type', cardId: `c${i}` }))
    const out = insertStageCards(deck, 4, { area: 'kana', itemId: 'n1', stage: 2 }, typesFor('kana', 2).map((type) => ({ type, shows: 2 })))
    expect(out).toHaveLength(34)
    for (const t of typesFor('kana', 2)) {
      const a = posOf(out, `s2:kana:n1:${t}:0`)
      const b = posOf(out, `s2:kana:n1:${t}:1`)
      expect(a).toBeGreaterThan(4)
      expect(b - a).toBeGreaterThan(RULES_V12.retryAfter)
    }
    // Gần cuối bộ: đặt cuối, không mất câu
    expect(insertStageCards(deck.slice(0, 3), 2, { area: 'kana', itemId: 'n1', stage: 2 }, [{ type: 'listen_kana', shows: 2 }])).toHaveLength(5)
  })

  it('trần tính cả câu Stage 2 của ngày đầu', () => {
    const input: DeckInput = { newItems: Array.from({ length: 5 }, (_, i) => ({ area: 'kana' as const, itemId: `n${i}`, stage1Types: typesFor('kana', 1), later: 4 })), stageItems: [], reviews: [] }
    const r = applyCap(input, 13)
    expect(r.input.newItems).toHaveLength(2)
    expect(r.deferred.newItems).toBe(3)
  })

  it('mỗi khu tự sang cấp sau khi mở hết cấp của mình', async () => {
    const { planNewItems } = await import('../plan')
    const words = [
      { id: 'a', level: 5, sortOrder: 1, kanaOnly: false, kanji: [] },
      { id: 'b', level: 4, sortOrder: 2, kanaOnly: false, kanji: [] },
      { id: 'c', level: 4, sortOrder: 3, kanaOnly: false, kanji: [] },
    ]
    const kanji = [
      { id: 'k5', character: '日', level: 5, freq: 1, strokes: 4, components: [], radicals: [] },
      { id: 'k4', character: '朝', level: 4, freq: 1, strokes: 12, components: [], radicals: [] },
    ]
    const r = planNewItems({
      today: D0,
      words,
      radicals: [],
      kanji,
      wordKanji: [],
      progress: new Map<string, Progress>([['kana:a', 2]]),
      openedToday: { kana: 0, radical: 0, kanji: 0, word_kanji: 0 },
      balanceOn: false,
      target: { kind: 'minutes', minutes: 20 },
      manual: { kana: 5, kanji: 5, word_kanji: 5 },
    })
    // Kana đã mở hết N5 → mở N4 ngay, dù khu Kanji còn chữ N5
    expect(r.levels).toEqual({ kana: 4, kanji: 5, word_kanji: null })
    expect(r.open.kana).toEqual(['b', 'c'])
    expect(r.open.kanji).toEqual(['k5'])
    expect(r.remaining.kana).toBe(2)
    expect(r.level).toBe(5)
  })

  it('Từ Kanji mở mọi từ đủ điều kiện, từ N5 trước từ N4', async () => {
    const { planNewItems } = await import('../plan')
    const words = [
      { id: 'x4', level: 4, sortOrder: 1, kanaOnly: false, kanji: ['日'] },
      { id: 'x5', level: 5, sortOrder: 2, kanaOnly: false, kanji: ['日'] },
    ]
    const r = planNewItems({
      today: D0,
      words,
      radicals: [],
      kanji: [{ id: 'k5', character: '日', level: 5, freq: 1, strokes: 4, components: [], radicals: [] }],
      wordKanji: words,
      progress: new Map<string, Progress>([['kana:x4', 2], ['kana:x5', 2], ['kanji:k5', 'review']]),
      openedToday: { kana: 0, radical: 0, kanji: 0, word_kanji: 0 },
      balanceOn: false,
      target: { kind: 'minutes', minutes: 20 },
      manual: { kana: 0, kanji: 0, word_kanji: 1 },
    })
    expect(r.open.word_kanji).toEqual(['x5'])
  })

  it('ước tính Từ Kanji theo ngày sớm nhất mở được của từng từ; ngày thiếu không bù', async () => {
    const { wordKanjiDays, paceEstimate } = await import('../pace')
    const row = (kanjiRank: number | null, kanaRank: number | null = null) => ({ level: 5, current: true, kanaRank, kanaDays: 0, kanjiRank, kanjiDays: 0 })
    // 4 từ cần chữ thứ 0, 1, 2, 3 trong hàng chờ; 1 chữ/ngày → chữ thứ k học xong ngày k + 3, từ mở từ ngày k + 4
    const words = [row(0), row(1), row(2), row(3)]
    expect(wordKanjiDays(words, { kana: 10, kanji: 1, word_kanji: 5 })).toBe(8)
    // Không có ràng buộc: mở từ ngày 1 (kế hoạch chạy đầu ngày), 2 từ mỗi ngày → xong sau ngày 2
    expect(wordKanjiDays([row(null), row(null), row(null), row(null)], { kana: 10, kanji: 1, word_kanji: 2 })).toBe(3)
    // Khu Kanji đặt 0 mà từ còn chữ chưa mở: không có ngày xong
    expect(wordKanjiDays(words, { kana: 10, kanji: 0, word_kanji: 5 })).toBeNull()
    // Đề xuất: số nhỏ nhất để xong không muộn hơn Kana
    const p = paceEstimate({ remaining: { kana: 100, kanji: 4, word_kanji: 4 }, perDay: { kana: 10, kanji: 1, word_kanji: 1 }, seconds: { kana: 1, kanji: 1, word_kanji: 1 }, wordKanji: words })
    expect(p.days.word_kanji).toBe(8)
    expect(p.suggest.word_kanji).toBe(1)
  })

  it('dữ liệu ước tính: vị trí trong hàng chờ Kana / Kanji, số ngày của chữ đang học', async () => {
    const { wordKanjiPaceRows } = await import('../plan')
    const words = [
      { id: 'w1', level: 5, sortOrder: 1, kanaOnly: false, kanji: ['日', '本'] },
      { id: 'w2', level: 5, sortOrder: 2, kanaOnly: false, kanji: ['日'] },
    ]
    const kanji = [
      { id: 'k1', character: '日', level: 5, freq: 1, strokes: 4, components: [], radicals: [] },
      { id: 'k2', character: '本', level: 5, freq: 2, strokes: 5, components: [], radicals: [] },
    ]
    const rows = wordKanjiPaceRows({ words, kanji, wordKanji: words, progress: new Map<string, Progress>([['kana:w1', 1], ['kanji:k1', 3]]) }, 5)
    expect(rows).toEqual([
      { level: 5, current: true, kanaRank: null, kanaDays: 1, kanjiRank: 0, kanjiDays: 1 },
      { level: 5, current: true, kanaRank: 0, kanaDays: 0, kanjiRank: null, kanjiDays: 1 },
    ])
  })
})

describe('Romaji ở Intro 1 Kana (2026-11-26)', () => {
  const pools: Pools = {
    kana: ['ねこ', 'いぬ', 'とり', 'さかな', 'コーヒー'].map((k, i) => ({ id: `w${i}`, kana: k, meaning: `nghĩa ${i}`, hanViet: null })),
    radical: [],
    kanji: [],
    word_kanji: [],
  }
  it('Kana → nghĩa có romaji; nghĩa → Kana không có (không lộ đáp án)', async () => {
    const { romajiOf } = await import('../questions')
    expect(romajiOf('コーヒー')).toBe('koohii')
    expect(romajiOf('きって')).toBe('kitte')
    expect(buildStageQuestion('kana_meaning', pools.kana[4], pools, Math.random)).toMatchObject({ romaji: 'koohii' })
    expect(buildStageQuestion('meaning_kana', pools.kana[4], pools, Math.random)).not.toHaveProperty('romaji')
  })
})
