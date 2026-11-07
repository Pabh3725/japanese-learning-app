// Khu Kanji: giới thiệu → học 12 câu trong 4 buổi → ôn FSRS dài hạn. Pure. Luật: docs/PROJECT_SPEC.md §18.6.
import { RULES_V4 } from '../learning/rules'
import { nextStudyDayStart, studyDate } from '../learning/time'
import type { Outcome, StudyDate } from '../learning/types'

export const KANJI_EXERCISES = [
  'kanji_to_meaning',
  'kanji_to_hanviet',
  'pick_kanji',
  'kanji_reading',
  'hanviet_typing',
  'reading_typing',
  'word_meaning',
  'kanji_write',
] as const
export type KanjiExercise = (typeof KANJI_EXERCISES)[number]

export function isKanjiExercise(value: unknown): value is KanjiExercise {
  return KANJI_EXERCISES.includes(value as KanjiExercise)
}

/** Số câu đúng theo từng dạng ở giai đoạn Học. */
export type KanjiCounts = Partial<Record<KanjiExercise, number>>

export interface KanjiLearningState {
  points: number
  pointsToday: number
  pointsDate: StudyDate | null
  counts: KanjiCounts
  correctStreak: number
}

type Rng = () => number

const DAY_MS = 86_400_000
const REQUIRED_PER_FACET = 2

const count = (counts: KanjiCounts, code: KanjiExercise) => counts[code] ?? 0
const meaningDone = (c: KanjiCounts) => count(c, 'kanji_to_meaning') + count(c, 'word_meaning')
const hanVietDone = (c: KanjiCounts) => count(c, 'kanji_to_hanviet') + count(c, 'hanviet_typing')
const readingDone = (c: KanjiCounts) => count(c, 'kanji_reading') + count(c, 'reading_typing')

function leastDone(list: readonly KanjiExercise[], counts: KanjiCounts, rng: Rng): KanjiExercise {
  const lowest = Math.min(...list.map((code) => count(counts, code)))
  const candidates = list.filter((code) => count(counts, code) === lowest)
  return candidates[Math.floor(rng() * candidates.length)]
}

/** Đi từ dễ tới khó theo điểm. Bước cuối ưu tiên mặt còn thiếu để đủ điều kiện hoàn tất. */
export function chooseLearningExercise(points: number, counts: KanjiCounts, hasWord: boolean, rng: Rng = Math.random): KanjiExercise {
  const { middleFrom, recallFrom } = RULES_V4.kanji
  if (points < middleFrom) return leastDone(['kanji_to_meaning', 'kanji_to_hanviet'], counts, rng)
  if (points < recallFrom) return leastDone(['pick_kanji', 'kanji_reading'], counts, rng)

  const needs: KanjiExercise[] = []
  if (count(counts, 'hanviet_typing') === 0 || hanVietDone(counts) < REQUIRED_PER_FACET) needs.push('hanviet_typing')
  if (count(counts, 'reading_typing') === 0 || readingDone(counts) < REQUIRED_PER_FACET) needs.push('reading_typing')
  if (meaningDone(counts) < REQUIRED_PER_FACET) needs.push(hasWord ? 'word_meaning' : 'kanji_to_meaning')
  if (needs.length > 0) return leastDone(needs, counts, rng)
  return leastDone(['hanviet_typing', 'reading_typing', hasWord ? 'word_meaning' : 'kanji_to_meaning', 'pick_kanji', 'kanji_reading'], counts, rng)
}

/** Các câu của một buổi, tính như thể trả lời đúng để dạng bài tăng dần trong buổi. */
export function planSitting(points: number, counts: KanjiCounts, questions: number, hasWord: boolean, rng: Rng = Math.random): KanjiExercise[] {
  const plan: KanjiExercise[] = []
  const running = { ...counts }
  for (let i = 0; i < questions; i++) {
    const exercise = chooseLearningExercise(points + i, running, hasWord, rng)
    plan.push(exercise)
    running[exercise] = count(running, exercise) + 1
  }
  return plan
}

/** Ôn dài hạn: chỉ gõ và viết rồi tự chấm, không lặp dạng lần trước. */
export function chooseReviewExercise(last: string | null, rng: Rng = Math.random): KanjiExercise {
  const list = (['hanviet_typing', 'reading_typing', 'kanji_write'] as const).filter((code) => code !== last)
  return list[Math.floor(rng() * list.length)]
}

export function canCompleteLearning(state: Pick<KanjiLearningState, 'points' | 'counts' | 'correctStreak'>): boolean {
  const c = state.counts
  return (
    state.points >= RULES_V4.kanji.completeAt &&
    state.correctStreak >= RULES_V4.completion.correctStreak &&
    meaningDone(c) >= REQUIRED_PER_FACET &&
    hanVietDone(c) >= REQUIRED_PER_FACET &&
    readingDone(c) >= REQUIRED_PER_FACET &&
    count(c, 'hanviet_typing') >= 1 &&
    count(c, 'reading_typing') >= 1
  )
}

export interface KanjiLearningResult {
  state: KanjiLearningState
  delta: number
  completed: boolean
}

/** Đúng +1, tối đa 3 điểm cộng mỗi ngày; đúng nhờ gợi ý 0; sai −2, không xuống dưới 0. */
export function applyLearningAnswer(state: KanjiLearningState, exercise: KanjiExercise, outcome: Outcome, now: Date): KanjiLearningResult {
  const today = studyDate(now)
  const plusToday = state.pointsDate === today ? state.pointsToday : 0
  const { maxPositivePerDay, wrong } = RULES_V4.kanji
  const raw = outcome === 'correct' ? 1 : outcome === 'wrong' ? wrong : 0
  const gain = raw > 0 && plusToday >= maxPositivePerDay ? 0 : raw
  const points = Math.max(0, state.points + gain)
  const next: KanjiLearningState = {
    points,
    pointsToday: gain > 0 ? plusToday + 1 : plusToday,
    pointsDate: today,
    counts: outcome === 'correct' ? { ...state.counts, [exercise]: count(state.counts, exercise) + 1 } : state.counts,
    correctStreak: outcome === 'correct' ? state.correctStreak + 1 : 0,
  }
  return { state: next, delta: points - state.points, completed: canCompleteLearning(next) }
}

/** Buổi kế tiếp bắt đầu 00:00 giờ VN. Lịch khi đúng hết: ngày 1, 2, 3, 5; học thêm thì mỗi ngày một buổi. */
export function nextSittingAt(now: Date, sittingsDone: number): { due: Date; days: number } {
  const days = RULES_V4.kanji.sittingGaps[sittingsDone - 1] ?? 1
  return { due: new Date(nextStudyDayStart(now).getTime() + (days - 1) * DAY_MS), days }
}

export function kanjiRating(outcome: Outcome): 'Again' | 'Hard' | 'Good' {
  return outcome === 'wrong' ? 'Again' : outcome === 'hint' ? 'Hard' : 'Good'
}

export interface KanjiDailyInput {
  newPerDay: number
  cap: number
  answeredToday: number
  openedToday: number
  /** Số câu còn đến hạn hôm nay. */
  dueQuestions: number
  notOpened: number
}

/** Số chữ mới còn mở được: ôn và học trước, mỗi chữ mới cần chỗ cho cả buổi đầu trong trần. */
export function newKanjiToday({ newPerDay, cap, answeredToday, openedToday, dueQuestions, notOpened }: KanjiDailyInput): number {
  const room = Math.floor((cap - answeredToday - dueQuestions) / RULES_V4.kanji.questionsPerSitting)
  return Math.max(0, Math.min(newPerDay - openedToday, notOpened, room))
}

export interface KanjiLoadAdvice {
  /** Số câu đến hạn vượt phần còn lại của trần hôm nay. */
  over: number
  suggestCap: number
  /** Null khi số chữ mới đang đặt đã vừa với trần. */
  suggestNewPerDay: number | null
}

/** Quá tải khi câu đến hạn vượt phần còn lại của trần từ 10 câu trở lên. */
export function kanjiLoadAdvice({ dueQuestions, room, cap, newPerDay }: { dueQuestions: number; room: number; cap: number; newPerDay: number }): KanjiLoadAdvice | null {
  const { overloadFrom, learningShareOfCap, completeAt } = RULES_V4.kanji
  const over = dueQuestions - room
  if (over < overloadFrom) return null
  const fits = Math.max(1, Math.floor((cap * learningShareOfCap) / completeAt))
  return {
    over,
    suggestCap: Math.min(500, Math.ceil((cap + over) / 10) * 10),
    suggestNewPerDay: newPerDay > fits ? fits : null,
  }
}
