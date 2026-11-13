import { toRomaji } from 'wanakana'
import { describe, expect, it } from 'vitest'
import { COUNT_THINGS, COUNTER_SETS, numberReading, numberReadings, setById } from '../data'
import { buildCounterSession, gradeCounterQuestion, parseTypedNumber, readingDistractors, RANDOM_NUMBER, type CounterQuestion } from '../questions'

const seeded = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
const HIRAGANA = /^[ぁ-ゖー]+$/

describe('Dữ liệu', () => {
  it('mỗi bộ: chữ không trùng, cách đọc là hiragana, nhiễu soạn tay không trùng cách đọc đúng', () => {
    for (const set of COUNTER_SETS) {
      const written = set.entries.map((e) => e.written)
      expect(new Set(written).size, set.id).toBe(written.length)
      for (const e of set.entries) {
        expect(e.readings.length, e.written).toBeGreaterThan(0)
        for (const r of [...e.readings, ...(e.wrong ?? [])]) expect(r, `${set.id} ${e.written}`).toMatch(HIRAGANA)
        for (const w of e.wrong ?? []) expect(e.readings, `${e.written} nhiễu ${w}`).not.toContain(w)
      }
    }
  })

  it('cách đọc biến âm then chốt', () => {
    const r = (id: string, written: string) => setById(id)!.entries.find((e) => e.written === written)!.readings
    expect(r('hon', '3本')).toEqual(['さんぼん'])
    expect(r('hon', '6本')).toEqual(['ろっぽん'])
    expect(r('hiki', '1匹')).toEqual(['いっぴき'])
    expect(r('day', '1日')).toEqual(['ついたち'])
    expect(r('day', '20日')).toEqual(['はつか'])
    expect(r('month', '4月')).toEqual(['しがつ'])
    expect(r('hour', '9時')).toEqual(['くじ'])
    expect(r('minute', '3分')).toEqual(['さんぷん'])
    expect(r('yen', '300円')).toEqual(['さんびゃくえん'])
    expect(r('nin', '4人')).toEqual(['よにん'])
  })

  it('vật để chọn từ đếm đều thuộc bộ có thật', () => {
    for (const t of COUNT_THINGS) for (const id of t.sets) expect(setById(id), `${t.word} → ${id}`).toBeDefined()
  })
})

describe('Đáp án nhiễu và chấm', () => {
  it('mọi mục có đủ 3 nhiễu, không nhiễu nào là cách đọc được chấp nhận', () => {
    for (const set of COUNTER_SETS) {
      for (const entry of set.entries) {
        const wrong = readingDistractors(set, entry, seeded(7))
        expect(wrong, `${set.id} ${entry.written}`).toHaveLength(3)
        for (const w of wrong) expect(entry.readings).not.toContain(w)
      }
    }
  })

  it('câu chọn cách đọc: đáp án đúng chấm đúng, mọi nhiễu chấm sai', () => {
    const qs = buildCounterSession({ groups: ['counters', 'dates', 'time'], exercises: ['reading_choice'], count: 400 }, seeded(3))
    expect(qs.length).toBeGreaterThan(300)
    for (const q of qs) {
      const entry = setById(q.setId)!.entries[q.index]
      expect(gradeCounterQuestion(q, entry.readings[0]).correct).toBe(true)
      for (const o of q.options!.filter((o) => o.id !== entry.readings[0])) expect(gradeCounterQuestion(q, o.id).correct, `${entry.written} ${o.id}`).toBe(false)
    }
  })

  it('câu gõ: gõ romaji của mọi cách đọc được chấp nhận đều đúng', () => {
    for (const set of COUNTER_SETS) {
      set.entries.forEach((entry, index) => {
        const q: CounterQuestion = { key: 'k', exercise: 'reading_typing', setId: set.id, index, instruction: '', display: entry.written, answer: 'typing' }
        for (const r of entry.readings) expect(gradeCounterQuestion(q, toRomaji(r)).correct, `${entry.written} ${toRomaji(r)}`).toBe(true)
        for (const w of entry.wrong ?? []) expect(gradeCounterQuestion(q, w).correct, `${entry.written} ${w}`).toBe(false)
      })
    }
  })

  it('câu nghe và câu chọn từ đếm: chỉ một lựa chọn đúng', () => {
    const qs = buildCounterSession({ groups: ['counters', 'dates', 'time'], exercises: ['listening', 'counter_choice'], count: 300 }, seeded(11))
    for (const q of qs) {
      const right = q.options!.filter((o) => gradeCounterQuestion(q, o.id).correct)
      expect(right, `${q.exercise} ${q.display}`).toHaveLength(1)
    }
  })

  it('không chọn nhóm Counters thì không có câu chọn từ đếm', () => {
    expect(buildCounterSession({ groups: ['dates'], exercises: ['counter_choice'], count: 10 })).toEqual([])
    const qs = buildCounterSession({ groups: ['time'], exercises: ['counter_choice', 'reading_typing'], count: 10 }, seeded(5))
    expect(qs).toHaveLength(10)
    expect(qs.every((q) => q.exercise === 'reading_typing')).toBe(true)
  })
})

describe('Số đếm thường', () => {
  it('đọc số có biến âm', () => {
    const cases: [number, string][] = [
      [0, 'ぜろ'], [4, 'よん'], [7, 'なな'], [9, 'きゅう'], [10, 'じゅう'], [14, 'じゅうよん'], [40, 'よんじゅう'],
      [100, 'ひゃく'], [300, 'さんびゃく'], [600, 'ろっぴゃく'], [800, 'はっぴゃく'], [1000, 'せん'], [3000, 'さんぜん'],
      [8000, 'はっせん'], [10000, 'いちまん'], [3480, 'さんぜんよんひゃくはちじゅう'], [25600, 'にまんごせんろっぴゃく'],
      [100000, 'じゅうまん'], [1000000, 'ひゃくまん'], [111, 'ひゃくじゅういち'],
    ]
    for (const [n, r] of cases) expect(numberReading(n), String(n)).toBe(r)
    expect(numberReading(300, true)).toBe('さんひゃく')
    expect(numberReadings(7)).toContain('しち')
    expect(numberReadings(70)).toContain('しちじゅう')
  })

  it('gõ số: bỏ dấu phẩy, nhận số toàn góc', () => {
    expect(parseTypedNumber('3,480')).toBe(3480)
    expect(parseTypedNumber('３４８０')).toBe(3480)
    expect(parseTypedNumber('abc')).toBeNull()
  })

  it('câu số ngẫu nhiên: đáp án đúng chấm đúng, mọi lựa chọn khác chấm sai', () => {
    const qs = buildCounterSession({ groups: ['numbers'], exercises: ['reading_choice', 'listening', 'number_typing', 'reading_typing'], count: 400 }, seeded(17))
    const random = qs.filter((q) => q.setId === RANDOM_NUMBER)
    expect(random.length).toBeGreaterThan(150)
    for (const q of random) {
      const n = q.value!
      if (q.exercise === 'number_typing') {
        expect(gradeCounterQuestion(q, String(n)).correct).toBe(true)
        expect(gradeCounterQuestion(q, String(n + 1)).correct).toBe(false)
      } else if (q.exercise === 'reading_typing') {
        expect(gradeCounterQuestion(q, toRomaji(numberReading(n))).correct, String(n)).toBe(true)
      } else {
        const right = q.options!.filter((o) => gradeCounterQuestion(q, o.id).correct)
        expect(right, `${q.exercise} ${n}`).toHaveLength(1)
      }
    }
  })

  it('dạng chỉ dành cho một nhóm thì không xuất hiện ở nhóm khác', () => {
    expect(buildCounterSession({ groups: ['time'], exercises: ['number_typing'], count: 10 })).toEqual([])
    const qs = buildCounterSession({ groups: ['numbers', 'dates'], exercises: ['number_typing', 'reading_choice'], count: 50 }, seeded(2))
    expect(qs.filter((q) => q.exercise === 'number_typing').every((q) => q.setId === RANDOM_NUMBER)).toBe(true)
    // Câu số ngẫu nhiên có cùng setId nhưng khác số: không bị coi là trùng
    expect(buildCounterSession({ groups: ['numbers'], exercises: ['number_typing'], count: 20 }, seeded(4))).toHaveLength(20)
  })
})
