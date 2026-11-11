// V9 R11 — giả lập người học chạy bài Learn qua AIS. docs/learning-rules.md §14.6.
import { describe, expect, it } from 'vitest'
import { RULES_V9 } from '../../learning/rules'
import type { Outcome } from '../../learning/types'
import { applyIntro, applyResult, applySupport, planNext, startLesson, type Candidate, type EndReason, type LessonGroup, type LessonLimits, type LessonState, type StepPlan } from '../ais'

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface PoolSize {
  vocabDue?: number
  wordKanjiDue?: number
  kanjiLearning?: number
  kanjiCards?: number
  newWords?: number
  newKanji?: number
  stars?: number
}

function pool(size: PoolSize = {}): Candidate[] {
  const out: Candidate[] = []
  const add = (n: number, make: (i: number) => Candidate) => {
    for (let i = 0; i < n; i++) out.push(make(i))
  }
  add(size.vocabDue ?? 30, (i) => ({ key: `s:v${i}`, group: 'vocabulary', kind: 'stage', anchor: `w:v${i}`, overdueDays: i % 4, left: 1 }))
  add(size.wordKanjiDue ?? 10, (i) => ({ key: `s:k${i}`, group: 'word_kanji', kind: 'stage', anchor: `w:k${i}`, overdueDays: i % 2, left: 1 }))
  add(size.kanjiLearning ?? 6, (i) => ({ key: `k:${i}`, group: 'kanji', kind: 'kanji_learning', anchor: `kj:${i}`, overdueDays: 0, left: 3 }))
  add(size.kanjiCards ?? 4, (i) => ({ key: `c:${i}`, group: 'kanji', kind: 'kanji_card', anchor: `kj:c${i}`, overdueDays: 1, left: 1 }))
  add(size.newWords ?? 10, (i) => ({ key: `nw:${i}`, group: 'vocabulary', kind: 'new_word', anchor: `w:n${i}`, overdueDays: 0, left: 2 }))
  add(size.newKanji ?? 3, (i) => ({ key: `nk:${i}`, group: 'kanji', kind: 'new_kanji', anchor: `kj:n${i}`, overdueDays: 0, left: 3 }))
  add(size.stars ?? 0, (i) => ({ key: `st:${i}`, group: 'vocabulary', kind: 'star', anchor: `w:v${i}`, overdueDays: 0, left: 4 }))
  return out
}

const ALL: LessonGroup[] = ['vocabulary', 'word_kanji', 'kanji']
const limits = (over: Partial<LessonLimits> = {}): LessonLimits => ({ target: 50, budget: 200, kanjiLearning: 100, kanjiCards: 60, ...over })

interface Event {
  plan: StepPlan
  outcome?: Outcome
  counted: number
  anchor?: string
  kind?: string
}

/** Chạy một bài tới hết. `wrong(key, n)`: câu thứ n của mục có sai không. */
function run(state: LessonState, wrong: (key: string, n: number) => boolean = () => false, stopAfter = Infinity) {
  const events: Event[] = []
  const askedCount: Record<string, number> = {}
  let end: EndReason | null = null
  for (let step = 0; step < 1000 && step < stopAfter; step++) {
    const plan = planNext(state)
    if (plan.type === 'end') {
      end = plan.reason
      break
    }
    const c = state.candidates.find((x) => x.key === plan.key)!
    if (plan.type === 'intro') {
      state = applyIntro(state, plan.key)
      events.push({ plan, counted: state.counted, anchor: c.anchor, kind: c.kind })
      continue
    }
    askedCount[plan.key] = (askedCount[plan.key] ?? 0) + 1
    const outcome: Outcome = wrong(plan.key, askedCount[plan.key]) ? 'wrong' : 'correct'
    events.push({ plan, outcome, counted: state.counted, anchor: c.anchor, kind: c.kind })
    state = applyResult(state, plan, outcome)
  }
  return { state, events, end }
}

const scored = (e: Event) => e.plan.type === 'question' && !e.plan.micro && e.kind !== 'star'

/** R3: mỗi câu tính điểm cách lần xuất hiện trước của cùng anchor ít nhất 4 câu tính điểm (câu kiểm tra nhanh cũng đặt mốc). */
function gapViolations(events: readonly Event[]): Event[] {
  const lastSeen: Record<string, number> = {}
  const bad: Event[] = []
  for (const e of events) {
    if (e.plan.type !== 'question') continue
    if (scored(e) && lastSeen[e.anchor!] !== undefined && e.counted - lastSeen[e.anchor!] < RULES_V9.spacing.minGap) bad.push(e)
    lastSeen[e.anchor!] = scored(e) ? e.counted + 1 : e.counted
  }
  return bad
}

describe('AIS — bài 20, 50, 100 câu', () => {
  for (const target of [20, 50, 100]) {
    it(`bài ${target} câu: đủ số câu, không câu Stage nào thiếu giãn cách`, () => {
      const r = run(startLesson(pool({ vocabDue: 60, wordKanjiDue: 25, newWords: 12 }), ALL, limits({ target }), 7))
      expect(r.end).toBe('target')
      expect(r.state.answered).toBe(target)
      expect(gapViolations(r.events)).toEqual([])
    })
  }
})

describe('AIS — mục mới', () => {
  it('thẻ giới thiệu → câu kiểm tra nhanh ngay sau → gọi lại sau 4–6 câu → gọi lại sau 8–12 câu', () => {
    const r = run(startLesson(pool(), ALL, limits(), 3))
    const intros = r.events.filter((e) => e.plan.type === 'intro')
    expect(intros.length).toBeGreaterThan(0)
    for (const intro of intros) {
      const key = (intro.plan as { key: string }).key
      const own = r.events.filter((e) => e.plan.type === 'question' && e.plan.key === key)
      const at = r.events.indexOf(intro)
      expect(r.events[at + 1]?.plan, key).toEqual({ type: 'question', key, micro: true })
      const [micro, recall1, recall2] = own
      if (recall1) expect(recall1.counted - micro.counted).toBeGreaterThanOrEqual(4)
      if (recall1) expect(recall1.counted - micro.counted).toBeLessThanOrEqual(6 + 4)
      if (recall2) expect(recall2.counted - (recall1.counted + 1)).toBeGreaterThanOrEqual(8)
    }
  })

  it('còn câu cũ để xen: không quá 2 mục mới cùng lúc, mỗi lần giới thiệu cách nhau ≥ 5 câu', () => {
    const r = run(startLesson(pool({ newWords: 20, vocabDue: 80, wordKanjiDue: 40 }), ALL, limits({ target: 100 }), 11))
    let lastIntro = -Infinity
    let answered = 0
    for (const e of r.events) {
      if (e.plan.type === 'intro') {
        expect(answered - lastIntro).toBeGreaterThanOrEqual(RULES_V9.ais.introduceEvery)
        lastIntro = answered
      } else if (e.kind !== 'star') answered++
    }
  })

  it('mục cũ không bị bỏ đói: lúc giới thiệu mục mới, mục cũ đã chiếm ≥ 40% câu tính điểm', () => {
    const r = run(startLesson(pool({ vocabDue: 40, newWords: 20 }), ['vocabulary'], limits({ target: 100 }), 5))
    let counted = 0
    let old = 0
    for (const e of r.events) {
      if (e.plan.type === 'intro' && counted > 0) expect(old / counted).toBeGreaterThanOrEqual(RULES_V9.ais.minDueShare)
      if (scored(e)) {
        counted++
        if (e.kind === 'stage' || e.kind === 'kanji_learning' || e.kind === 'kanji_card') old++
      }
    }
  })
})

describe('AIS — trả lời sai', () => {
  it('sai: câu kiểm tra lại không tính điểm đến sau khoảng 2 câu, không ai bị trừ điểm vì gần nhau', () => {
    const first = run(startLesson(pool(), ALL, limits(), 9)).events.find((e) => scored(e) && e.kind === 'stage')!
    const key = (first.plan as { key: string }).key
    const r = run(startLesson(pool(), ALL, limits(), 9), (k, n) => k === key && n === 1)
    const own = r.events.filter((e) => e.plan.type === 'question' && e.plan.key === key)
    expect(own[0].outcome).toBe('wrong')
    expect(own[1].plan).toMatchObject({ micro: true })
    expect(own[1].counted - (own[0].counted + 1)).toBeGreaterThanOrEqual(RULES_V9.ais.wrongRecheckAfter)
    expect(gapViolations(r.events)).toEqual([])
  })

  it('sai liên tục: một mục không quá 6 câu trong một bài, bài vẫn kết thúc', () => {
    const r = run(startLesson(pool({ newWords: 3 }), ALL, limits({ target: 100 }), 13), (key) => key.startsWith('nw:'))
    const per: Record<string, number> = {}
    for (const e of r.events) if (e.plan.type === 'question') per[e.plan.key] = (per[e.plan.key] ?? 0) + 1
    for (const [key, n] of Object.entries(per)) expect(n, key).toBeLessThanOrEqual(RULES_V9.ais.maxPerItemPerLesson)
    expect(r.end).not.toBeNull()
  })

  it('mục mới sai ở lần gọi lại thì quay về gọi lại lần 1, không cộng điểm khi còn quá gần', () => {
    const r = run(startLesson(pool({ newWords: 2, vocabDue: 30 }), ['vocabulary'], limits(), 21), (key, n) => key === 'nw:0' && n === 2)
    expect(gapViolations(r.events)).toEqual([])
  })
})

describe('AIS — ngân sách và trần', () => {
  it('nhiều bài trong một ngày: tổng câu tính điểm không vượt ngân sách 200, mở bài mới không đặt lại bộ đếm', () => {
    let budget = 200
    let kanjiLearning = 100
    let total = 0
    const ends: EndReason[] = []
    for (let lesson = 0; lesson < 8; lesson++) {
      const r = run(startLesson(pool({ vocabDue: 120, wordKanjiDue: 60, kanjiLearning: 30, newWords: 20 }), ALL, limits({ budget, kanjiLearning, target: 50 }), 100 + lesson))
      const used = r.events.filter((e) => scored(e) && e.kind !== 'kanji_card').length
      total += used
      budget -= used
      kanjiLearning -= r.events.filter((e) => scored(e) && (e.kind === 'kanji_learning' || e.kind === 'new_kanji')).length
      ends.push(r.end!)
      if (budget <= 0) break
    }
    expect(total).toBeLessThanOrEqual(200)
    expect(ends.at(-1)).toBe('budget')
  })

  it('trần phụ Kanji và trần Card Kanji được tôn trọng; Card Kanji không tốn ngân sách Learn', () => {
    const r = run(startLesson(pool({ kanjiLearning: 20, kanjiCards: 20, newKanji: 5 }), ['kanji'], limits({ target: 100, kanjiLearning: 7, kanjiCards: 5 }), 4))
    expect(r.events.filter((e) => scored(e) && (e.kind === 'kanji_learning' || e.kind === 'new_kanji')).length).toBeLessThanOrEqual(7)
    expect(r.events.filter((e) => scored(e) && e.kind === 'kanji_card').length).toBeLessThanOrEqual(5)
    expect(r.state.limits.budget).toBe(200 - r.events.filter((e) => scored(e) && e.kind !== 'kanji_card').length)
  })
})

describe('AIS — công bằng, hết câu, tiếp tục bài', () => {
  it('ba nhóm đều có câu khi cả ba có việc', () => {
    const r = run(startLesson(pool(), ALL, limits(), 17))
    for (const g of ALL) expect(r.state.groupCounts[g], g).toBeGreaterThan(0)
  })

  it('chỉ học một nhóm: không có câu của nhóm khác', () => {
    const r = run(startLesson(pool(), ['word_kanji'], limits(), 17))
    expect(r.events.every((e) => !('key' in e.plan) || e.plan.key.startsWith('s:k'))).toBe(true)
  })

  it('hết câu cũ để xen: vẫn giới thiệu nốt mục mới thay vì dừng sớm', () => {
    const r = run(startLesson(pool({ vocabDue: 4, wordKanjiDue: 0, kanjiLearning: 0, kanjiCards: 0, newWords: 4, newKanji: 0 }), ALL, limits(), 2))
    expect(r.events.filter((e) => e.plan.type === 'intro')).toHaveLength(4)
    expect(gapViolations(r.events)).toEqual([])
  })

  it('không còn câu hợp lệ: kết thúc sớm, không lặp câu cho đủ số', () => {
    const r = run(startLesson(pool({ vocabDue: 5, wordKanjiDue: 0, kanjiLearning: 0, kanjiCards: 0, newWords: 0, newKanji: 0 }), ALL, limits(), 1))
    expect(r.end).toBe('empty')
    expect(r.state.answered).toBe(5)
    expect(run(startLesson([], ALL, limits(), 1)).end).toBe('empty')
  })

  it('thoát giữa chừng rồi vào lại: trạng thái lưu dạng JSON, chạy tiếp ra đúng như không thoát', () => {
    const start = startLesson(pool(), ALL, limits(), 99)
    const straight = run(start)
    const half = run(start, undefined, 23)
    const resumed = run(JSON.parse(JSON.stringify(half.state)))
    expect([...half.events, ...resumed.events].map((e) => e.plan)).toEqual(straight.events.map((e) => e.plan))
  })

  it('câu học thêm của từ có sao: tối đa 3 mỗi bài, không tính vào số câu của bài', () => {
    const r = run(startLesson(pool({ stars: 5 }), ALL, limits(), 31))
    const stars = r.events.filter((e) => e.kind === 'star')
    expect(stars.length).toBeLessThanOrEqual(RULES_V9.ais.starPerLesson)
    expect(stars.length).toBeGreaterThan(0)
    expect(r.state.answered).toBe(50)
  })

  it('câu hỗ trợ Kanji trực quan (R12): tính vào số câu của bài, không tốn ngân sách, không đổi mục nào', () => {
    const start = startLesson(pool(), ALL, limits(), 5)
    const after = applySupport(start)
    expect(after.answered).toBe(start.answered + 1)
    expect(after.counted).toBe(start.counted)
    expect(after.limits).toEqual(start.limits)
    expect(after.items).toEqual(start.items)
    let s = start
    for (let i = 0; i < 50; i++) s = applySupport(s)
    expect(planNext(s)).toEqual({ type: 'end', reason: 'target' })
  })
})
