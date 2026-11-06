// VOC-02, SCH-02 — Dựng câu của Stage 2 và chấm câu trả lời.
// Pure: không gọi database. `rng` truyền vào được → test cho kết quả cố định.
// Luật đáp án nhiễu: docs/data-spec.md §5.

import type { Outcome } from '../learning/types'

export type Stage2ChoiceExercise = 'kana_to_meaning' | 'meaning_to_kana'
export const STAGE2_CHOICE_EXERCISES: readonly Stage2ChoiceExercise[] = ['kana_to_meaning', 'meaning_to_kana']

/** Phần của một từ cần để ra đề. */
export interface QuestionWord {
  id: string // vocabularies.id
  reading_kana: string
  meaning_vi: string
}

export interface ChoiceQuestion {
  exercise: Stage2ChoiceExercise
  /** Đề: kana (kana_to_meaning) hoặc nghĩa (meaning_to_kana). */
  prompt: string
  /** 4 đáp án đã xáo, không trùng nhau. */
  options: string[]
  answer: string
}

export type Rng = () => number

/** So nghĩa: bỏ khoảng trắng hai đầu, viết thường (data-spec §5.1). */
export function sameMeaning(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

const KATAKANA = /^[ァ-ヺー]+$/
export function isKatakana(kana: string): boolean {
  return KATAKANA.test(kana)
}

/** Đáp án đúng của một dạng câu. */
export function answerFor(word: QuestionWord, exercise: Stage2ChoiceExercise): string {
  return exercise === 'kana_to_meaning' ? word.meaning_vi : word.reading_kana
}

/**
 * Một từ khác có được làm đáp án nhiễu không.
 * Loại: chính nó · cùng nghĩa (2 đáp án đúng) · cùng cách đọc (đồng âm: きます 来/着 → đề kana có 2 nghĩa đúng;
 * đề nghĩa thì 2 ô hiện giống hệt nhau).
 */
export function canBeDistractor(target: QuestionWord, other: QuestionWord): boolean {
  return (
    other.id !== target.id &&
    !sameMeaning(other.meaning_vi, target.meaning_vi) &&
    other.reading_kana !== target.reading_kana
  )
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Chọn `count` đáp án nhiễu (dạng chữ hiển thị). Đề chọn kana: ưu tiên cùng kiểu chữ
 * (Katakana ↔ Katakana) để không đoán được chỉ nhờ nhìn kiểu chữ; thiếu thì lấy thêm từ phần còn lại.
 */
export function pickDistractors(
  target: QuestionWord,
  pool: readonly QuestionWord[],
  exercise: Stage2ChoiceExercise,
  rng: Rng,
  count = 3,
): string[] {
  const valid = pool.filter((w) => canBeDistractor(target, w))
  let ordered = shuffle(valid, rng)
  if (exercise === 'meaning_to_kana') {
    const kata = isKatakana(target.reading_kana)
    ordered = [...ordered.filter((w) => isKatakana(w.reading_kana) === kata), ...ordered.filter((w) => isKatakana(w.reading_kana) !== kata)]
  }

  const answer = answerFor(target, exercise)
  const picked: string[] = []
  for (const w of ordered) {
    const text = answerFor(w, exercise)
    // Hai từ nhiễu khác nhau có thể cùng chữ hiển thị (nghĩa trùng nhau) → chỉ lấy một
    if (text === answer || picked.some((p) => (exercise === 'kana_to_meaning' ? sameMeaning(p, text) : p === text))) continue
    picked.push(text)
    if (picked.length === count) break
  }
  if (picked.length < count) throw new Error(`Không đủ đáp án nhiễu cho từ ${target.id}`)
  return picked
}

export function buildChoiceQuestion(
  target: QuestionWord,
  pool: readonly QuestionWord[],
  exercise: Stage2ChoiceExercise,
  rng: Rng = Math.random,
): ChoiceQuestion {
  const answer = answerFor(target, exercise)
  return {
    exercise,
    prompt: exercise === 'kana_to_meaning' ? target.reading_kana : target.meaning_vi,
    options: shuffle([answer, ...pickDistractors(target, pool, exercise, rng)], rng),
    answer,
  }
}

/** D1 — Server chấm: so đáp án người học chọn với đáp án thật của từ (không tin trình duyệt). */
export function gradeChoice(target: QuestionWord, exercise: Stage2ChoiceExercise, chosen: string): Outcome {
  return chosen.trim() === answerFor(target, exercise).trim() ? 'correct' : 'wrong'
}

/** Hàm ngẫu nhiên có hạt giống (mulberry32) — để test và để dựng lại cùng một đề nếu cần. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// SCH-02 — Chọn từ đến hẹn cho một lượt
// ---------------------------------------------------------------------------

/** Số câu mỗi lượt. Tạm thời: SES-01 / REV-02 sẽ thay phần chọn câu. */
export const WORDS_PER_ROUND = 10

/** Lấy từ đã đến hẹn, quá hẹn lâu nhất trước, hòa thì theo lộ trình. Không đổi mảng gốc. */
export function pickDueWords<T extends { dueAt: string; sortOrder: number }>(
  rows: readonly T[],
  now: Date,
  limit: number = WORDS_PER_ROUND,
): T[] {
  const nowMs = now.getTime()
  return rows
    .filter((row) => Date.parse(row.dueAt) <= nowMs)
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.sortOrder - b.sortOrder)
    .slice(0, limit)
}
