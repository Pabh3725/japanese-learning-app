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
import { migrateKanji, migrateWord } from '../migrate'
import { canOpenKanji, kanjiOrder, queueTriggered, radicalOrder, wordKanjiStatus, type KanjiRow, type Progress } from '../order'
import { buildReviewCard, buildStageQuestion, gradeCard, gradeQuestion, type Pools } from '../questions'
import { pausedZones } from '../plan'
import { RULES_V12 } from '../rules'
import { applyAnswer, canShow, newItem, plannedShows, type ItemState } from '../stage'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const D0 = '2026-11-20'
const D1 = addStudyDays(D0, 1)
const D2 = addStudyDays(D0, 2)

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
  it('Stage 1: mỗi loại đúng 1 lần là qua; Stage 2 chạy từ ngày học kế tiếp', () => {
    let item = newItem('kana', D0)
    expect(Object.keys(item.types)).toEqual(['kana_meaning', 'meaning_kana'])
    const wrong = applyAnswer(item, 'kana_meaning', false, D0)
    expect(wrong.retry).toBe(true)
    expect(wrong.item.types.kana_meaning!.points).toBe(0)
    item = applyAnswer(wrong.item, 'kana_meaning', true, D0).item
    const r = applyAnswer(item, 'meaning_kana', true, D0)
    expect(r.stageDone).toBe(true)
    expect(r.item.stage).toBe(2)
    expect(r.item.stageFrom).toBe(D1)
    expect(canShow(r.item, 'kana_meaning', D0)).toBe(false)
    expect(canShow(r.item, 'kana_meaning', D1)).toBe(true)
  })

  it('Stage 2: đúng thì 2 lần/ngày, điểm thứ 3 rơi vào hôm sau', () => {
    const item: ItemState = { area: 'kana', stage: 2, stageFrom: D0, types: Object.fromEntries(typesFor('kana', 2).map((t) => [t, { points: 0, seenDate: null, seenToday: 0, wrongToday: 0 }])) }
    const day1 = playDay(item, D0)
    expect(day1.asked).toBe(8)
    for (const t of typesFor('kana', 2)) expect(day1.state.types[t]!.points).toBe(2)
    expect(canShow(day1.state, 'kana_meaning', D0)).toBe(false)
    const day2 = playDay(day1.state, D1)
    expect(day2.asked).toBe(4)
    expect(day2.state.stage).toBe(3)
    expect(day2.state.stageFrom).toBe(D2)
  })

  it('sai: −1 (sàn 0), hỏi lại, tối đa 3 lần/ngày; lần hỏi lại đúng cũng +1', () => {
    let item: ItemState = { area: 'kana', stage: 2, stageFrom: D0, types: { kana_meaning: { points: 1, seenDate: null, seenToday: 0, wrongToday: 0 } } }
    let r = applyAnswer(item, 'kana_meaning', false, D0)
    expect(r.delta).toBe(-1)
    expect(r.retry).toBe(true)
    r = applyAnswer(r.item, 'kana_meaning', false, D0)
    expect(r.item.types.kana_meaning!.points).toBe(0)
    expect(r.delta).toBe(0)
    r = applyAnswer(r.item, 'kana_meaning', true, D0)
    expect(r.item.types.kana_meaning!.points).toBe(1)
    expect(canShow(r.item, 'kana_meaning', D0)).toBe(false)
    item = r.item
    expect(canShow(item, 'kana_meaning', D1)).toBe(true)
  })

  it('xong Stage cuối thì tạo Card: Kana 2 Card, bộ thủ (không có Stage 3) 1 Card, chữ 1 Card', () => {
    expect(reviewCardsFor('kana')).toEqual(['kana_type', 'kana_choose'])
    expect(reviewCardsFor('radical')).toEqual(['radical'])
    const radical: ItemState = { area: 'radical', stage: 2, stageFrom: D0, types: { radical_hanviet: { points: 2, seenDate: null, seenToday: 0, wrongToday: 0 } } }
    const r = applyAnswer(radical, 'radical_hanviet', true, D0)
    expect(r.item.stage).toBe('review')
    expect(r.cardsCreated).toEqual(['radical'])
  })

  it('loại thẻ phân biệt chữ giống nhau chỉ có khi chữ có cặp đã duyệt', () => {
    expect(typesFor('kanji', 3)).not.toContain('kanji_similar')
    expect(typesFor('kanji', 3, { hasSimilar: true })).toContain('kanji_similar')
  })
})

describe('§2 Bộ thẻ trong ngày', () => {
  const posOf = (deck: DeckCard[], key: string) => deck.findIndex((c) => c.key === key)

  it('Stage 1 sau thẻ giới thiệu ở khoảng 0 / 5 / 10 / 10; mọi thẻ có mặt đúng một lần', () => {
    const input: DeckInput = {
      newItems: [{ area: 'kanji', itemId: 'k1', stage1Types: typesFor('kanji', 1) }],
      stageItems: Array.from({ length: 12 }, (_, i) => ({ area: 'kana' as const, itemId: `w${i}`, stage: 2 as const, types: [{ type: 'kana_meaning' as const, shows: 2 }] })),
      reviews: Array.from({ length: 20 }, (_, i) => ({ area: 'kana' as const, itemId: `r${i}`, card: 'kana_choose' as const, cardId: `c${i}`, due: new Date(2026, 10, 1) })),
    }
    for (let s = 1; s <= 20; s++) {
      const deck = buildDeck(input, seeded(s))
      expect(deck).toHaveLength(1 + 4 + 24 + 20)
      const intro = posOf(deck, 'intro:kanji:k1')
      const at = typesFor('kanji', 1).map((t) => posOf(deck, `s1:kanji:k1:${t}`))
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
      newItems: Array.from({ length: 5 }, (_, i) => ({ area: 'kana' as const, itemId: `n${i}`, stage1Types: typesFor('kana', 1) })),
      stageItems: Array.from({ length: 15 }, (_, i) => ({ area: 'kana' as const, itemId: `w${i}`, stage: 2 as const, types: typesFor('kana', 2).map((type) => ({ type, shows: 2 })) })),
      reviews: Array.from({ length: 30 }, (_, i) => ({ area: 'kana' as const, itemId: `r${i}`, card: 'kana_type' as const, cardId: `c${i}`, due: new Date() })),
    }
    for (let s = 1; s <= 20; s++) {
      const deck = buildDeck(input, seeded(s))
      expect(deck).toHaveLength(5 * 3 + 15 * 8 + 30)
      expect(new Set(deck.map((c) => c.key)).size).toBe(deck.length)
      for (let i = 0; i < 5; i++) {
        const intro = posOf(deck, `intro:kana:n${i}`)
        const [a, b] = typesFor('kana', 1).map((t) => posOf(deck, `s1:kana:n${i}:${t}`))
        expect(a).toBeGreaterThan(intro)
        expect(b - a).toBeGreaterThanOrEqual(6)
      }
    }
  })

  it('trần: giữ mục đang học Stage, rồi Card đến hạn sớm nhất, mục mới sau cùng', () => {
    const input: DeckInput = {
      newItems: [{ area: 'kana', itemId: 'n1', stage1Types: ['kana_meaning', 'meaning_kana'] }],
      stageItems: [{ area: 'kana', itemId: 's1', stage: 2, types: [{ type: 'kana_meaning', shows: 2 }] }],
      reviews: [
        { area: 'kana', itemId: 'a', card: 'kana_choose', cardId: 'late', due: new Date(2026, 10, 19) },
        { area: 'kana', itemId: 'b', card: 'kana_choose', cardId: 'early', due: new Date(2026, 10, 10) },
      ],
    }
    const { input: kept, deferred } = applyCap(input, 3)
    expect(kept.stageItems).toHaveLength(1)
    expect(kept.reviews.map((r) => r.cardId)).toEqual(['early'])
    expect(deferred).toEqual({ newItems: 1, stageItems: 0, reviews: 1 })
  })

  it('hỏi lại sau 5 thẻ; câu sao tối đa 2 mỗi set', () => {
    const base: DeckInput = { newItems: [], stageItems: [], reviews: Array.from({ length: 30 }, (_, i) => ({ area: 'kana' as const, itemId: `r${i}`, card: 'kana_choose' as const, cardId: `c${i}`, due: new Date() })) }
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

  it('chữ: N5 trước N4, phổ biến trước; thành phần học trước chữ chứa nó', () => {
    const k = (character: string, level: number, freq: number, components: string[] = []): KanjiRow => ({ character, level, freq, strokes: 5, components, radicals: [] })
    expect(kanjiOrder([k('話', 5, 100, ['言']), k('言', 4, 200), k('日', 5, 1), k('語', 4, 50)])).toEqual(['日', '言', '話', '語'])
  })

  it('chữ mở khi các bộ trong phạm vi đã qua Stage 1', () => {
    const progress = new Map<number, Progress>([[85, 2]])
    expect(canOpenKanji({ radicals: [85, 999] }, new Set([85]), progress)).toBe(true)
    expect(canOpenKanji({ radicals: [85, 30] }, new Set([85, 30]), progress)).toBe(false)
  })

  it('Từ vựng Kanji: mở khi Kana và các chữ đã vào Stage 2; từ N5–N4 thiếu chữ vào hàng chờ', () => {
    const word = { id: 'w', level: 5, kanaOnly: false, kanji: ['寝'] }
    expect(wordKanjiStatus(word, 2, new Map([['寝', 'review']]))).toBe('open')
    expect(wordKanjiStatus(word, 2, new Map())).toBe('queued')
    expect(wordKanjiStatus({ ...word, level: 3 }, 2, new Map())).toBe('locked')
    expect(wordKanjiStatus({ ...word, kanaOnly: true }, 'review', new Map())).toBe('none')
    expect(queueTriggered({ kanaAllOpened: false, kanjiAllOpened: false, otherOpenable: 0 })).toBe(true)
    expect(queueTriggered({ kanaAllOpened: false, kanjiAllOpened: false, otherOpenable: 3 })).toBe(false)
  })
})

describe('§8 Cân bằng theo thời gian', () => {
  it('thời gian ước tính khớp bảng §8.1', () => {
    expect(estimatedSeconds('kana')).toBe(309)
    expect(estimatedSeconds('radical')).toBe(159)
    expect(estimatedSeconds('kanji')).toBe(261)
    expect(estimatedSeconds('word_kanji')).toBe(225)
  })

  it('ba khu hết cùng ngày (tính lại mỗi ngày, cộng dồn phần lẻ); bộ thủ học trước chữ', () => {
    let rem: Remaining = { kana: 425, radical: 100, kanji: 263, word_kanji: 300 }
    let carry = {}
    let date = D0
    const lastDay: Record<string, number> = {}
    const first = balance(rem, { kind: 'minutes', minutes: 30 }, D0)
    for (let d = 0; d < first.days + 5 && Object.values(rem).some((n) => n > 0); d++) {
      const r = balance(rem, { kind: 'date', date: first.finishDate }, date, undefined, carry)
      if (rem.radical > 0) expect(r.today.kanji).toBe(0)
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
    expect(paused.today.kana).toBeGreaterThan(normal.today.kana)
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

  it('mục tiêu từ Settings: ngày đã qua hoặc chưa chọn thì dùng số phút, không dồn mọi mục vào một ngày', () => {
    const tomorrow = addStudyDays(D0, 1)
    expect(balanceTarget('date', tomorrow, 20, D0)).toEqual({ kind: 'date', date: tomorrow })
    expect(balanceTarget('date', D0, 20, D0)).toEqual({ kind: 'date', date: D0 })
    expect(balanceTarget('date', addStudyDays(D0, -3), 20, D0)).toEqual({ kind: 'minutes', minutes: 20 })
    expect(balanceTarget('date', null, 20, D0)).toEqual({ kind: 'minutes', minutes: 20 })
    expect(balanceTarget('minutes', tomorrow, 30, D0)).toEqual({ kind: 'minutes', minutes: 30 })
    const rem: Remaining = { kana: 425, radical: 100, kanji: 263, word_kanji: 300 }
    const passed = balance(rem, balanceTarget('date', addStudyDays(D0, -3), 20, D0), D0)
    expect(passed.days).toBeGreaterThan(30)
    expect(passed.today.kana).toBeLessThan(rem.kana / 10)
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
  it('một từ Kana mới (đúng hết): 2, 8, 4, 6, 3 câu rồi Card từ ngày thứ 6', () => {
    const sim = simulateItem(newItem('kana', D0), D0, 7)
    expect(sim.counts).toEqual([2, 8, 4, 6, 3, 0, 0])
    expect(sim.cardsFrom).toBe(5)
  })

  it('báo ngày vượt trần', () => {
    const days = forecast({ today: D0, items: [], reviewsByDay: { kana: [5, 200], kanji: [], word_kanji: [] }, newPerDay: { kana: 3 }, caps: { kana: 100, kanji: 100, word_kanji: 100 } })
    expect(days).toHaveLength(7)
    expect(days[0].counts.kana).toBe(5 + 6)
    expect(overflowDays(days).map((d) => d.date)).toEqual([D1])
    expect(days[1].over.kana).toBe(200 + 3 * 8 + 6 - 100)
  })
})

describe('§7 Chuyển dữ liệu', () => {
  it('từ có Card Kana → Review Kana, giữ Card ① và thêm Card ②; Stage 5 cũ → Stage 2 Từ vựng Kanji', () => {
    const m = migrateWord({ stages: [{ stage: 3, completed: true }, { stage: 5, completed: false }], kanjiIntroSeen: true, cards: ['vocab.kana'] })
    expect(m.kana.progress).toBe('review')
    expect(m.wordKanji?.progress).toBe(2)
    expect(m.cards).toEqual([
      { card: 'kana_type', from: { kind: 'keep', oldType: 'vocab.kana' } },
      { card: 'kana_choose', from: { kind: 'new' } },
    ])
  })

  it('Stage 2 / 3 cũ → Stage 2 / 3 Kana; chưa đụng nhánh Kanji thì không có Từ vựng Kanji', () => {
    expect(migrateWord({ stages: [{ stage: 2, completed: false }], kanjiIntroSeen: false, cards: [] })).toEqual({ kana: { progress: 2, introSeen: true }, wordKanji: null, cards: [] })
    expect(migrateWord({ stages: [{ stage: 2, completed: true }, { stage: 3, completed: false }], kanjiIntroSeen: false, cards: [] }).kana.progress).toBe(3)
  })

  it('chữ: đang Học → Stage 2; 2 Card → 1, lấy Card đến hạn sớm hơn', () => {
    expect(migrateKanji({ phase: 'learning', cards: [] }).progress.progress).toBe(2)
    const m = migrateKanji({ phase: 'review', cards: [{ type: 'kanji.meaning', due: new Date(2026, 11, 5) }, { type: 'kanji.hanviet', due: new Date(2026, 11, 1) }] })
    expect(m.card).toEqual({ card: 'kanji', from: { kind: 'keep', oldType: 'kanji.hanviet' } })
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
    expect(card.parts.map((p) => p.part)).toEqual(['type_kana', 'type_hanviet', 'choose_meaning'])
    expect(gradeCard(card.parts, ['かな0', 'hv 0', 'nghĩa 0'])).toBe(true)
    expect(gradeCard(card.parts, ['かな0', 'hv 0', 'nghĩa 1'])).toBe(false)
    expect(RULES_V12.points.pass).toBe(3)
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

  it('Từ vựng Kanji: mở khi Kana và chữ đã vào Stage 2; thiếu chữ thì vào hàng chờ, mở khi không còn từ khác mở được', async () => {
    const { planNewItems } = await import('../plan')
    const ready = new Map<string, Progress>([['kana:w0', 2], ['kanji:k-hi', 2]])
    expect(planNewItems({ ...base, progress: ready }).open.word_kanji).toEqual(['w0'])
    // Chữ chưa học: hàng chờ; không có từ nào khác mở được → mở luôn
    expect(planNewItems({ ...base, progress: new Map<string, Progress>([['kana:w0', 2]]) }).open.word_kanji).toEqual(['w0'])
  })

  it('cân bằng: chỉ tiêu từ balance, ba khu cùng chia theo số ngày', async () => {
    const { planNewItems } = await import('../plan')
    const r = planNewItems({ ...base, balanceOn: true, target: { kind: 'date', date: addStudyDays(D0, 1) } })
    expect(r.balance?.days).toBe(2)
    expect(r.open.kana).toHaveLength(2) // 4 từ N5 / 2 ngày
  })
})
