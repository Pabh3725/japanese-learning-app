// Counters: dựng câu luyện và chấm. Pure. Chỉ luyện, không ghi gì vào database (không điểm, không lịch).
import { isKanaAnswerCorrect } from '../exercise/answer-normalize'
import { COUNT_THINGS, COUNTER_SETS, meaningOf, numberReading, numberReadings, setById, type CounterGroup, type CounterSet, type CountEntry } from './data'

export const COUNTER_EXERCISES = ['reading_choice', 'reading_typing', 'listening', 'number_typing', 'counter_choice'] as const
export type CounterExercise = (typeof COUNTER_EXERCISES)[number]

export const COUNTER_EXERCISE_LABELS: Record<CounterExercise, { title: string; description: string }> = {
  reading_choice: { title: 'Choose the reading', description: 'See 3本, pick さんぼん' },
  reading_typing: { title: 'Type the reading', description: 'See 3本, type sanbon' },
  listening: { title: 'Listen', description: 'Hear the reading, pick what you heard' },
  number_typing: { title: 'Write the number', description: 'See さんびゃく, type 300 (Numbers only)' },
  counter_choice: { title: 'Choose the counter', description: 'Pencils → 本, stamps → 枚 (Counters only)' },
}

/** Dạng câu dùng được cho nhóm nào. */
export const EXERCISE_GROUPS: Record<CounterExercise, readonly CounterGroup[]> = {
  reading_choice: ['numbers', 'counters', 'dates', 'time'],
  reading_typing: ['numbers', 'counters', 'dates', 'time'],
  listening: ['numbers', 'counters', 'dates', 'time'],
  number_typing: ['numbers'],
  counter_choice: ['counters'],
}

/** Câu số ngẫu nhiên (nhóm Numbers) dùng setId này; giá trị nằm ở `value`. */
export const RANDOM_NUMBER = 'number'

export interface CounterQuestion {
  key: string
  exercise: CounterExercise
  setId: string
  /** Vị trí mục trong bộ (reading_*, listening) hoặc vị trí vật trong COUNT_THINGS (counter_choice). */
  index: number
  /** Số dùng trong câu chọn từ đếm. */
  n?: number
  /** Số của câu số ngẫu nhiên (setId = RANDOM_NUMBER). */
  value?: number
  /** Ô gõ: kana (đổi romaji) hay chữ số. */
  input?: 'kana' | 'digits'
  instruction: string
  display: string
  hint?: string
  speak?: string
  answer: 'option' | 'typing'
  options?: { id: string; label: string }[]
}

export interface CounterGrade {
  correct: boolean
  /** Đáp án đúng để hiện lại: chữ và cách đọc. */
  written: string
  reading: string
}

type Rng = () => number

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const pick = <T,>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

/** Số ngẫu nhiên, trải đều các độ lớn: 0–10, 11–99, 100–999, 1000–9999, 10000–99999. */
function randomNumber(rng: Rng): number {
  const ranges: [number, number][] = [[0, 10], [11, 99], [100, 999], [1000, 9999], [10000, 99999]]
  const [lo, hi] = pick(ranges, rng)
  return lo + Math.floor(rng() * (hi - lo + 1))
}

/** Số gần giống: đổi một chữ số (không đổi chữ số đầu thành 0). */
function nearNumbers(n: number, rng: Rng): number[] {
  const digits = String(n).split('').map(Number)
  const out = new Set<number>()
  digits.forEach((d, i) => {
    for (const nd of [(d + 1) % 10, (d + 9) % 10, (d + 3) % 10]) {
      if (i === 0 && nd === 0 && digits.length > 1) continue
      const copy = [...digits]
      copy[i] = nd
      out.add(Number(copy.join('')))
    }
  })
  out.delete(n)
  return shuffle([...out], rng)
}

/** Nhiễu cho câu đọc số: đọc thẳng không biến âm (さんひゃく) trước, rồi cách đọc của số gần giống. */
function numberDistractors(n: number, rng: Rng): string[] {
  const accepted = new Set(numberReadings(n))
  const ordered = [numberReading(n, true), ...nearNumbers(n, rng).map((x) => numberReading(x))]
  const out: string[] = []
  for (const r of ordered) if (!accepted.has(r) && !out.includes(r)) out.push(r)
  return out.slice(0, 3)
}

const formatNumber = (n: number) => n.toLocaleString('en-US')

/** Chữ số người học gõ: bỏ dấu phẩy, dấu chấm, khoảng trắng; đổi số toàn góc. */
export function parseTypedNumber(text: string): number | null {
  const ascii = text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[,，.\s]/g, '')
  return /^\d+$/.test(ascii) ? Number(ascii) : null
}

function buildNumber(exercise: CounterExercise, key: string, rng: Rng): CounterQuestion | null {
  const value = randomNumber(rng)
  const reading = numberReading(value)
  const base = { key, exercise, setId: RANDOM_NUMBER, index: 0, value }
  if (exercise === 'number_typing') {
    return { ...base, instruction: 'Write the number', display: reading, hint: 'Type it in digits', answer: 'typing', input: 'digits' }
  }
  if (exercise === 'reading_choice') {
    const wrong = numberDistractors(value, rng)
    if (wrong.length < 3) return null
    return { ...base, instruction: 'How do you read it?', display: formatNumber(value), answer: 'option', options: shuffle([reading, ...wrong], rng).map((r) => ({ id: r, label: r })) }
  }
  if (exercise === 'reading_typing') {
    return { ...base, instruction: 'Type the reading', display: formatNumber(value), answer: 'typing', input: 'kana' }
  }
  if (exercise === 'listening') {
    const others = nearNumbers(value, rng).slice(0, 3)
    if (others.length < 3) return null
    return { ...base, instruction: 'Which number did you hear?', display: '', speak: reading, answer: 'option', options: shuffle([value, ...others], rng).map((x) => ({ id: String(x), label: formatNumber(x) })) }
  }
  return null
}

/** Các cách đọc của chữ số khi ghép với từ đếm (đúng hoặc sai tùy từ đếm): dùng dựng nhiễu biến âm. */
const NUMBER_SOUNDS: Record<number, string[]> = {
  1: ['いち', 'いっ'], 2: ['に'], 3: ['さん'], 4: ['よん', 'よ', 'し'], 5: ['ご'],
  6: ['ろく', 'ろっ'], 7: ['なな', 'しち'], 8: ['はち', 'はっ'], 9: ['きゅう', 'く'], 10: ['じゅう', 'じゅっ'],
}

/**
 * Nhiễu cho câu chọn cách đọc: nhiễu soạn tay trước, rồi biến âm theo quy tắc (số × âm cuối của từ đếm),
 * cuối cùng là cách đọc của mục khác cùng bộ. Không bao giờ lấy một cách đọc được chấp nhận của chính mục này.
 */
export function readingDistractors(set: CounterSet, entry: CountEntry, rng: Rng, count = 3): string[] {
  const accepted = new Set(entry.readings)
  const rule: string[] = []
  const sounds = entry.n !== null ? NUMBER_SOUNDS[entry.n] : undefined
  if (set.tails && sounds) for (const p of sounds) for (const t of set.tails) rule.push(p + t)
  const others = set.entries.filter((e) => e !== entry).map((e) => e.readings[0])
  const ordered = [...(entry.wrong ?? []), ...shuffle(rule, rng), ...shuffle(others, rng)]
  const out: string[] = []
  for (const r of ordered) if (!accepted.has(r) && !out.includes(r)) out.push(r)
  return out.slice(0, count)
}

/** Bộ từ đếm có vật để luyện chọn từ đếm. */
const THING_SETS = [...new Set(COUNT_THINGS.flatMap((t) => t.sets))]
const suffixOf = (set: CounterSet) => set.label.replace(/^～/, '')

function buildOne(exercise: CounterExercise, chosen: readonly CounterGroup[], key: string, rng: Rng): CounterQuestion | null {
  const groups = chosen.filter((g) => EXERCISE_GROUPS[exercise].includes(g))
  if (groups.length === 0) return null
  const group = pick(groups, rng)
  // Nhóm Numbers: nửa câu là số ngẫu nhiên, nửa là mục trong bảng tra
  if (group === 'numbers' && (exercise === 'number_typing' || rng() < 0.5)) return buildNumber(exercise, key, rng)
  if (exercise === 'counter_choice') {
    const index = Math.floor(rng() * COUNT_THINGS.length)
    const thing = COUNT_THINGS[index]
    const n = 2 + Math.floor(rng() * 8)
    const wrong = shuffle(THING_SETS.filter((id) => !thing.sets.includes(id)), rng).slice(0, 3)
    const options = shuffle([thing.sets[0], ...wrong], rng).map((id) => ({ id, label: `${n}${suffixOf(setById(id)!)}` }))
    return {
      key, exercise, setId: thing.sets[0], index, n,
      instruction: 'Which counter fits?',
      display: `${thing.word}を ${n}＿`,
      hint: `${n} ${thing.meaning}`,
      answer: 'option', options,
    }
  }
  const sets = COUNTER_SETS.filter((s) => s.group === group)
  if (sets.length === 0) return null
  const set = pick(sets, rng)
  const index = Math.floor(rng() * set.entries.length)
  const entry = set.entries[index]
  const base = { key, exercise, setId: set.id, index, hint: meaningOf(set, entry) }
  if (exercise === 'reading_choice') {
    const wrong = readingDistractors(set, entry, rng)
    if (wrong.length < 3) return null
    return { ...base, instruction: 'How do you read it?', display: entry.written, answer: 'option', options: shuffle([entry.readings[0], ...wrong], rng).map((r) => ({ id: r, label: r })) }
  }
  if (exercise === 'reading_typing') {
    return { ...base, instruction: 'Type the reading', display: entry.written, answer: 'typing', input: 'kana' }
  }
  const others = shuffle(set.entries.filter((e) => e !== entry), rng).slice(0, 3)
  if (others.length < 3) return null
  return {
    ...base, hint: set.usage, instruction: 'Which one did you hear?', display: '', speak: entry.readings[0], answer: 'option',
    options: shuffle([entry, ...others], rng).map((e) => ({ id: e.written, label: e.written })),
  }
}

export interface CounterSessionInput {
  groups: readonly CounterGroup[]
  exercises: readonly CounterExercise[]
  count: number
}

/** Dựng phiên luyện. Dạng bài xoay vòng; dạng không dựng được (vd. chọn từ đếm khi không chọn nhóm Counters) thì bỏ qua. */
export function buildCounterSession(input: CounterSessionInput, rng: Rng = Math.random): CounterQuestion[] {
  const exercises = input.exercises.filter((e) => EXERCISE_GROUPS[e].some((g) => input.groups.includes(g)))
  if (input.groups.length === 0 || exercises.length === 0) return []
  const out: CounterQuestion[] = []
  for (let i = 0, tries = 0; out.length < input.count && tries < input.count * 5; tries++, i++) {
    const exercise = shuffle(exercises, rng)[0]
    const q = buildOne(exercise, input.groups, `q${out.length}`, rng)
    // Tránh hai câu liền nhau hỏi cùng một mục
    const prev = out[out.length - 1]
    if (q && !(prev && prev.setId === q.setId && prev.index === q.index && prev.value === q.value)) out.push(q)
  }
  return out
}

/** Chấm theo dữ liệu, không theo nội dung câu hỏi (trừ số n của câu chọn từ đếm, số của câu số ngẫu nhiên). */
export function gradeCounterQuestion(q: CounterQuestion, answer: string): CounterGrade {
  if (q.setId === RANDOM_NUMBER && q.value !== undefined) {
    const written = formatNumber(q.value)
    const readings = numberReadings(q.value)
    const reading = readings[0]
    if (q.exercise === 'number_typing') return { correct: parseTypedNumber(answer) === q.value, written, reading }
    if (q.exercise === 'listening') return { correct: answer === String(q.value), written, reading }
    if (q.exercise === 'reading_choice') return { correct: readings.includes(answer), written, reading }
    return { correct: readings.some((r) => isKanaAnswerCorrect(answer, r)), written, reading }
  }
  if (q.exercise === 'counter_choice') {
    const thing = COUNT_THINGS[q.index]
    const set = setById(thing.sets[0])!
    const entry = set.entries.find((e) => e.n === q.n)
    return { correct: thing.sets.includes(answer), written: `${q.n}${suffixOf(set)}`, reading: entry?.readings[0] ?? '' }
  }
  const set = setById(q.setId)!
  const entry = set.entries[q.index]
  const written = entry.written
  const reading = entry.readings[0]
  if (q.exercise === 'listening') return { correct: answer === written, written, reading }
  if (q.exercise === 'reading_choice') return { correct: entry.readings.includes(answer), written, reading }
  return { correct: entry.readings.some((r) => isKanaAnswerCorrect(answer, r)), written, reading }
}

export function parseGroups(raw: readonly string[]): CounterGroup[] {
  return (['numbers', 'counters', 'dates', 'time'] as const).filter((g) => raw.includes(g))
}

export function parseExercises(raw: readonly string[]): CounterExercise[] {
  return COUNTER_EXERCISES.filter((e) => raw.includes(e))
}
