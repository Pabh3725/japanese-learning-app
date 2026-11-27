// Grammar V3 — luật bài 5 câu, lịch 3 ngày, ôn 4 câu mỗi mẫu. Pure. Luật: docs/grammar-rules-v3.md.
import type { StudyDate } from '../../learning/types'

export const GRAMMAR_V3 = {
  perBai: 5,
  /** Một bài Intro qua khi có ít nhất 3 câu đúng (cộng dồn qua các ngày). */
  passAt: 3,
  reviewPerPattern: 4,
  /** Dạng phụ của phần ôn, lấy lần lượt; mỗi nhóm 5 mẫu lấy 2 dạng kế tiếp. */
  rotation: ['G6', 'G3', 'G2', 'G7', 'G5', 'G9'] as const,
  /** Thứ tự bài trong buổi ôn. */
  reviewOrder: ['G1', 'G10', 'G6', 'G3', 'G2', 'G7', 'G5', 'G9'] as const,
  groupSize: 5,
} as const

export type V3Type = 'G1' | 'G2' | 'G3' | 'G5' | 'G6' | 'G7' | 'G9' | 'G10'
export type V3Day = 1 | 2

/** Điểm một bài Intro: c câu đúng cộng dồn, n số lần làm, d ngày làm gần nhất. */
export interface BaiScore {
  c: number
  n: number
  d: StudyDate
}
export type V3Scores = Record<string, BaiScore>

export interface V3State {
  day: V3Day
  /** Ngày chuyển sang ngày Intro hiện tại (bài ngày 2 mở từ hôm sau). */
  dayDate: StudyDate | null
  scores: V3Scores
}

/** Số bài Intro của mẫu ở mỗi ngày (theo ngân hàng câu). */
export interface DayCounts {
  day1: number
  day2: number
}

export const baiKey = (day: V3Day, index: number) => `${day}:${index}`

export const isPassed = (s: BaiScore | undefined) => (s?.c ?? 0) >= GRAMMAR_V3.passAt

const keysOf = (day: V3Day, n: number) => Array.from({ length: n }, (_, i) => baiKey(day, i))

/**
 * Bài Intro phải làm hôm nay, theo thứ tự trong ngày.
 * - Ngày 1: bài chưa qua và chưa làm hôm nay.
 * - Ngày 2 (từ hôm sau ngày chuyển): bài ngày 1 chưa qua làm bù trước, rồi bài ngày 2; bài đã làm hôm nay thì để hôm sau.
 */
export function baiToday(state: V3State, counts: DayCounts, today: StudyDate): string[] {
  const pending = (k: string) => !isPassed(state.scores[k]) && (state.scores[k]?.d ?? '') < today
  if (state.day === 1) return keysOf(1, counts.day1).filter(pending)
  if (state.dayDate && state.dayDate >= today) return []
  return [...keysOf(1, counts.day1), ...keysOf(2, counts.day2)].filter(pending)
}

export interface BaiResult {
  state: V3State
  /** Mọi bài Intro đã qua: mẫu sang thẻ ôn. */
  completed: boolean
}

/** Cộng điểm một bài (chỉ cộng câu đúng, sai không trừ) và chuyển ngày khi đã làm hết bài ngày 1. */
export function applyBai(state: V3State, key: string, correct: number, counts: DayCounts, today: StudyDate): BaiResult {
  const old = state.scores[key]
  const scores: V3Scores = { ...state.scores, [key]: { c: (old?.c ?? 0) + correct, n: (old?.n ?? 0) + 1, d: today } }
  const all = [...keysOf(1, counts.day1), ...keysOf(2, counts.day2)]
  const completed = all.every((k) => isPassed(scores[k]))
  let { day, dayDate } = state
  if (day === 1 && keysOf(1, counts.day1).every((k) => (scores[k]?.n ?? 0) > 0)) {
    day = 2
    dayDate = today
  }
  return { state: { day, dayDate, scores }, completed }
}

/** Dạng phụ của nhóm 5 mẫu thứ `group`, đổi theo ngày (offset) để các buổi ôn khác dạng nhau. */
export function rotationFor(group: number, offset: number): [V3Type, V3Type] {
  const r = GRAMMAR_V3.rotation
  const i = (((offset + group * 2) % r.length) + r.length) % r.length
  return [r[i], r[(i + 1) % r.length]]
}

/**
 * 4 dạng ôn của một mẫu: G1, G10 (không có thì G1 lần nữa), 2 dạng phụ của nhóm;
 * mẫu không làm được dạng phụ thì lấy dạng kế tiếp trong vòng mà mẫu làm được.
 */
export function reviewTypesFor(available: ReadonlySet<V3Type>, pair: readonly [V3Type, V3Type]): V3Type[] {
  const out: V3Type[] = ['G1', available.has('G10') ? 'G10' : 'G1']
  const rot = GRAMMAR_V3.rotation
  const start = rot.indexOf(pair[0] as (typeof rot)[number])
  const extra: V3Type[] = []
  for (const t of pair) if (available.has(t) && !extra.includes(t)) extra.push(t)
  for (let k = 0; extra.length < 2 && k < rot.length; k++) {
    const t = rot[(start + k) % rot.length]
    if (available.has(t) && !extra.includes(t)) extra.push(t)
  }
  while (extra.length < 2) extra.push('G1')
  return [...out, ...extra]
}

export interface ReviewItem<Q> {
  code: string
  type: V3Type
  question: Q
}

export interface ReviewBai<Q> {
  /** Dạng của bài; 'mix' = bài cuối gộp các dạng còn ít câu. */
  type: V3Type | 'mix'
  items: ReviewItem<Q>[]
}

/** Gom câu ôn theo dạng thành bài ≤ 5 câu (trộn mẫu); dạng chỉ có 1–2 câu gộp vào một bài cuối trộn dạng. */
export function groupReview<Q>(items: readonly ReviewItem<Q>[], shuffle: <T>(xs: readonly T[]) => T[]): ReviewBai<Q>[] {
  const out: ReviewBai<Q>[] = []
  const small: ReviewItem<Q>[] = []
  for (const t of GRAMMAR_V3.reviewOrder) {
    const xs = shuffle(items.filter((x) => x.type === t))
    if (xs.length === 0) continue
    if (xs.length <= 2) {
      small.push(...xs)
      continue
    }
    for (let i = 0; i < xs.length; i += GRAMMAR_V3.perBai) out.push({ type: t, items: xs.slice(i, i + GRAMMAR_V3.perBai) })
  }
  for (let i = 0; i < small.length; i += GRAMMAR_V3.perBai) out.push({ type: 'mix', items: small.slice(i, i + GRAMMAR_V3.perBai) })
  return out
}
