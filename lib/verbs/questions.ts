// Thể động từ (Grammar G5): dựng câu luyện chia và chấm. Pure, tất định theo seed (server dựng lại để chấm).
import { toHiragana } from 'wanakana'
import { acceptedOf, conjugate, distractorsOf, formInfo, type VerbFormId } from './conjugate'
import { isVerb, type VerbWord } from './types'

export const VERB_EXERCISES = ['type', 'choose', 'recognize', 'reverse'] as const
export type VerbExercise = (typeof VERB_EXERCISES)[number]

export const VERB_EXERCISE_LABELS: Record<VerbExercise, { title: string; description: string }> = {
  type: { title: 'Type the form', description: 'Type the word in the form asked' },
  choose: { title: 'Choose the form', description: 'Pick the correct form out of 4' },
  recognize: { title: 'Name the form', description: 'See a conjugated word and say which form it is' },
  reverse: { title: 'Back to the base', description: 'Turn a conjugated word back into its ます or dictionary form' },
}

export interface VerbQuestion {
  exercise: VerbExercise
  code: string
  form: VerbFormId
  seed: number
  meaning: string
  /** Từ hiện ở đề (chữ + cách đọc). */
  shown: { t: string; r: string }
  instruction: string
  /** Thể cần chia (type, choose) hoặc cần đổi về (reverse). */
  target: string
  answer: 'typing' | 'option'
  options?: { id: string; label: string }[]
}

type Rng = () => number

function rngOf(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Dạng gốc để đổi về khi làm dạng "reverse": động từ → thể ます (hoặc từ điển nếu đã mở), tính từ → dạng gốc. */
function baseOf(w: VerbWord, unlocked: readonly VerbFormId[], rng: Rng): { id: 'masu' | 'dict'; label: string; t: string; r: string } {
  if (!isVerb(w.kind)) return { id: 'dict', label: 'Base form', t: w.dict, r: w.dictReading }
  const useDict = unlocked.includes('dict') && rng() < 0.5
  const c = conjugate(w, useDict ? 'dict' : 'masu')!
  return { id: useDict ? 'dict' : 'masu', label: useDict ? 'Dictionary form' : 'ます form', t: c.t, r: c.r }
}

/** Dạng hiện ở đề: thể ます cho động từ (như trong lộ trình), dạng gốc cho tính từ. */
const promptOf = (w: VerbWord) => (isVerb(w.kind) ? conjugate(w, 'masu')! : { t: w.dict, r: w.dictReading })

/**
 * Dựng câu. `unlocked`: các thể người học đã mở (lấy đáp án nhiễu, lựa chọn của dạng nhận diện).
 * null khi từ không có thể này, hoặc dạng nhận diện bị mơ hồ (cùng một chữ ứng với hai thể đã mở, vd. 食べられる).
 */
export function buildVerbQuestion(w: VerbWord, form: VerbFormId, exercise: VerbExercise, unlocked: readonly VerbFormId[], seed: number): VerbQuestion | null {
  const right = conjugate(w, form)
  if (!right) return null
  const rng = rngOf(seed)
  const label = formInfo(form).label
  const base = { exercise, code: w.code, form, seed, meaning: w.meaning }
  switch (exercise) {
    case 'type':
      return { ...base, shown: promptOf(w), instruction: `Type the ${label}`, target: label, answer: 'typing' }
    case 'choose': {
      const wrong = shuffle(distractorsOf(w, form, unlocked), rng).slice(0, 3)
      if (wrong.length < 3) return null
      return { ...base, shown: promptOf(w), instruction: `Choose the ${label}`, target: label, answer: 'option', options: shuffle([right.t, ...wrong], rng).map((x) => ({ id: x, label: x })) }
    }
    case 'recognize': {
      const same = unlocked.filter((f) => f !== form && conjugate(w, f)?.t === right.t)
      if (same.length > 0) return null
      const others = shuffle(unlocked.filter((f) => f !== form && conjugate(w, f) !== null), rng).slice(0, 3)
      if (others.length < 3) return null
      return { ...base, shown: { t: right.t, r: right.r }, instruction: 'Which form is this?', target: '', answer: 'option', options: shuffle([form, ...others], rng).map((f) => ({ id: f, label: formInfo(f).label })) }
    }
    case 'reverse': {
      const b = baseOf(w, unlocked, rng)
      if (b.t === right.t) return null
      return { ...base, shown: { t: right.t, r: right.r }, instruction: `Turn it back into the ${b.label}`, target: b.label, answer: 'typing' }
    }
  }
}

/** Chuẩn hoá chữ gõ: romaji → hiragana, katakana → hiragana, bỏ khoảng trắng và dấu câu. */
export function normalizeTyped(text: string): string {
  // Kiểu Hepburn viết っち là "tch" (shutchou); wanakana chỉ hiểu "cch"
  // ぢ/じ, づ/ず gõ romaji giống nhau (ji, zu) nên coi là một
  return toHiragana(text.replace(/[\s　。、]/g, '').replace(/tch/gi, 'cch'), { passRomaji: false }).replace(/ぢ/g, 'じ').replace(/づ/g, 'ず')
}

export interface VerbGrade {
  correct: boolean
  expected: string
  expectedReading: string
}

/** Chấm bằng quy tắc chia, không theo dữ liệu trình duyệt gửi lên. Gõ: chấp nhận Kanji hoặc kana, romaji tự đổi. */
export function gradeVerbQuestion(w: VerbWord, q: VerbQuestion, answer: string, unlocked: readonly VerbFormId[]): VerbGrade {
  const right = conjugate(w, q.form)!
  if (q.exercise === 'recognize') return { correct: answer === q.form, expected: formInfo(q.form).label, expectedReading: right.r }
  if (q.exercise === 'choose') return { correct: acceptedOf(right).includes(answer), expected: right.t, expectedReading: right.r }
  if (q.exercise === 'reverse') {
    const b = baseOf(w, unlocked, rngOf(q.seed))
    const ok = [b.t, b.r].map(normalizeTyped).includes(normalizeTyped(answer))
    return { correct: ok, expected: b.t, expectedReading: b.r }
  }
  const ok = acceptedOf(right).map(normalizeTyped).includes(normalizeTyped(answer))
  return { correct: ok, expected: right.t, expectedReading: right.r }
}
