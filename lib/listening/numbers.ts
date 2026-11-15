// LISTENING_V2 §V2.5: nghe số, giờ, ngày, giá (dữ liệu Counters). Pure.
// Nghe → chọn trong 4 cách viết nghe na ná (4時 / 7時 / 14時 / 40分), hoặc nghe → gõ chữ số.
import { COUNTER_SETS, meaningOf, numberReading, type CounterGroup, type CountEntry, type CounterSet } from '../counters/data'
import { shuffle } from '../jlpt/reading'
import { digitsOf, withAnswer, type ListeningQuestion } from './questions'

type Rng = () => number

export const NUMBER_GROUPS: readonly CounterGroup[] = ['numbers', 'time', 'dates', 'counters']
export const isNumberGroup = (v: unknown): v is CounterGroup => NUMBER_GROUPS.includes(v as CounterGroup)
export type NumbersMode = 'choose' | 'type'
export const isNumbersMode = (v: unknown): v is NumbersMode => v === 'choose' || v === 'type'

interface Item {
  ref: string
  written: string
  reading: string
  meaning: string
  /** Cách viết khác để làm nhiễu (đọc của chúng dùng để xếp theo độ giống khi nghe). */
  pool: { written: string; reading: string }[]
}

/** Khoảng cách chỉnh sửa giữa hai chuỗi kana: nhỏ = nghe na ná. */
export function editDistance(a: string, b: string): number {
  const x = [...a]
  const y = [...b]
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j)
  for (let i = 1; i <= x.length; i++) {
    const cur = [i]
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[y.length]
}

const fmt = (n: number) => n.toLocaleString('en-US')

/** Số na ná khi nghe: đổi một chữ số, thêm / bớt một chữ số (×10, ÷10). */
function nearValues(n: number): number[] {
  const out = new Set<number>([n * 10, Math.floor(n / 10)])
  const digits = String(n).split('').map(Number)
  digits.forEach((d, i) => {
    for (const nd of [1, 3, 4, 6, 7, 8, 9].map((k) => (d + k) % 10)) {
      if (i === 0 && nd === 0) continue
      const copy = [...digits]
      copy[i] = nd
      out.add(Number(copy.join('')))
    }
  })
  out.delete(n)
  return [...out].filter((x) => x > 0)
}

function randomValue(rng: Rng, ranges: [number, number][], step = 1): number {
  const [lo, hi] = ranges[Math.floor(rng() * ranges.length)]
  return Math.max(lo, Math.round((lo + rng() * (hi - lo)) / step) * step)
}

function numberItem(n: number): Item {
  return { ref: `num:${n}`, written: fmt(n), reading: numberReading(n), meaning: `số ${n.toLocaleString('vi-VN')}`, pool: nearValues(n).map((x) => ({ written: fmt(x), reading: numberReading(x) })) }
}

function priceItem(n: number): Item {
  return {
    ref: `yen:${n}`,
    written: `${fmt(n)}円`,
    reading: `${numberReading(n)}えん`,
    meaning: `${n.toLocaleString('vi-VN')} yên`,
    pool: nearValues(n).map((x) => ({ written: `${fmt(x)}円`, reading: `${numberReading(x)}えん` })),
  }
}

function entryItem(set: CounterSet, entry: CountEntry): Item {
  return {
    ref: `${set.id}:${entry.written}`,
    written: entry.written,
    reading: entry.readings[0],
    meaning: meaningOf(set, entry),
    pool: set.entries.filter((e) => e !== entry && e.n !== null).map((e) => ({ written: e.written, reading: e.readings[0] })),
  }
}

/** Dựng lại mục từ mã (dùng cho danh sách câu nghe sai). */
export function numberItemOf(ref: string): Item | null {
  const [kind, rest] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)]
  if (kind === 'num' && /^\d+$/.test(rest)) return numberItem(Number(rest))
  if (kind === 'yen' && /^\d+$/.test(rest)) return priceItem(Number(rest))
  const set = COUNTER_SETS.find((s) => s.id === kind)
  const entry = set?.entries.find((e) => e.written === rest && e.n !== null)
  return set && entry ? entryItem(set, entry) : null
}

/** Gõ chữ số được khi cách viết có số và không có 半 (4時半 gõ 4 thì lẫn với 4時). */
const typeable = (item: Item) => digitsOf(item.written).length > 0 && !item.written.includes('半')

function question(item: Item, mode: NumbersMode, rng: Rng): ListeningQuestion | null {
  const base = {
    type: 'numbers' as const,
    ref: item.ref,
    script: [{ sp: 'N' as const, text: item.reading }],
    explanation: `${item.written}（${item.reading}）: ${item.meaning}`,
    transcript: [{ sp: 'N' as const, pieces: [{ t: item.written, r: item.reading }] }],
  }
  if (mode === 'type') {
    if (!typeable(item)) return null
    return { ...base, instruction: 'Type the number you hear (digits only, e.g. 14:30 → 1430).', options: [], input: 'digits', answer: digitsOf(item.written) }
  }
  // Nhiễu: cách đọc gần nhất (khoảng cách chỉnh sửa), không trùng cách viết / cách đọc của đáp án
  const ranked = shuffle(item.pool, rng)
    .filter((c) => c.written !== item.written && c.reading !== item.reading)
    .sort((a, b) => editDistance(a.reading, item.reading) - editDistance(b.reading, item.reading))
  const distractors = [...new Set(ranked.map((c) => c.written))].slice(0, 3)
  if (distractors.length < 3) return null
  return { ...base, instruction: 'Which one did you hear?', ...withAnswer(item.written, distractors, rng) }
}

/** Câu nghe số dựng lại từ mã (danh sách câu nghe sai): luôn là câu chọn. */
export function numberQuestionOf(ref: string, rng: Rng): ListeningQuestion | null {
  const item = numberItemOf(ref)
  return item ? question(item, 'choose', rng) : null
}

/** Một phiên nghe số: nhóm được chọn xen kẽ; nhóm Numbers gồm số ngẫu nhiên, giá tiền ngẫu nhiên và mục trong bảng. */
export function buildNumbersSession(groups: readonly CounterGroup[], mode: NumbersMode, count: number, rng: Rng): ListeningQuestion[] {
  const chosen = groups.filter(isNumberGroup)
  if (chosen.length === 0) return []
  const out: ListeningQuestion[] = []
  const used = new Set<string>()
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const group = chosen[tries % chosen.length]
    let item: Item
    const r = rng()
    if (group === 'numbers' && r < 1 / 3) item = numberItem(randomValue(rng, [[11, 99], [100, 999], [1000, 9999], [10000, 99999]]))
    else if (group === 'numbers' && r < 2 / 3) item = priceItem(randomValue(rng, [[100, 990], [1000, 9990], [10000, 50000]], 10))
    else {
      const sets = COUNTER_SETS.filter((s) => s.group === group)
      const set = sets[Math.floor(rng() * sets.length)]
      const entries = set.entries.filter((e) => e.n !== null)
      item = entryItem(set, entries[Math.floor(rng() * entries.length)])
    }
    if (used.has(item.ref)) continue
    const q = question(item, mode, rng)
    if (!q) continue
    used.add(item.ref)
    out.push(q)
  }
  return out
}
