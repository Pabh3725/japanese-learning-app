// Khu Kanji: giới thiệu → học 12 câu trong 4 buổi → 2 Card ôn dài hạn. Pure. Luật: docs/learning-rules.md §12 (RULES_V9 R10).
import { RULES_V9 } from '../learning/rules'
import { nextStudyDayStart, studyDate } from '../learning/time'
import type { Outcome, StudyDate } from '../learning/types'

export const KANJI_EXERCISES = [
  'kanji_to_meaning',
  'kanji_to_hanviet',
  /** Nghĩa → chọn chữ. */
  'pick_kanji',
  /** Hán Việt → chọn chữ. */
  'hanviet_to_kanji',
  'kanji_reading',
  'hanviet_typing',
  'reading_typing',
  'word_meaning',
  'kanji_write',
  /** Card kanji.meaning: nhìn chữ → nhớ nghĩa, lật thẻ rồi tự chấm. */
  'meaning_self',
  /** V9 R12 dạng E: nghĩa + Hán Việt → chọn đúng chữ giữa các chữ gần giống đã duyệt. */
  'similar_kanji',
] as const
export type KanjiExercise = (typeof KANJI_EXERCISES)[number]

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
// V9: bốn hướng bắt buộc. Không hỏi âm On/Kun (chủ dự án bỏ 2026-11-15): cách đọc học qua Từ Kanji.
// kanji_reading, reading_typing giữ trong KANJI_EXERCISES để đọc dữ liệu cũ.
const meaningDone = (c: KanjiCounts) => count(c, 'kanji_to_meaning') + count(c, 'word_meaning')
const toKanjiFromMeaningDone = (c: KanjiCounts) => count(c, 'pick_kanji')
const hanVietDone = (c: KanjiCounts) => count(c, 'kanji_to_hanviet') + count(c, 'hanviet_typing')
const toKanjiFromHanVietDone = (c: KanjiCounts) => count(c, 'hanviet_to_kanji')
// Chữ có cặp gần giống đã duyệt: phải đúng câu phân biệt ít nhất một lần (chủ dự án chốt 2026-11-14)
const similarDone = (c: KanjiCounts) => count(c, 'similar_kanji')

function leastDone(list: readonly KanjiExercise[], counts: KanjiCounts, rng: Rng): KanjiExercise {
  const lowest = Math.min(...list.map((code) => count(counts, code)))
  const candidates = list.filter((code) => count(counts, code) === lowest)
  return candidates[Math.floor(rng() * candidates.length)]
}

/**
 * Đi từ dễ tới khó theo điểm. Bước cuối ưu tiên mặt còn thiếu để đủ điều kiện hoàn tất.
 * `hasSimilar`: chữ có cặp gần giống đã duyệt, nên có câu phân biệt (bắt buộc đúng một lần).
 */
export function chooseLearningExercise(points: number, counts: KanjiCounts, hasWord: boolean, rng: Rng = Math.random, hasSimilar = false): KanjiExercise {
  const { middleFrom, recallFrom } = RULES_V9.kanji
  if (points < middleFrom) return leastDone(['kanji_to_meaning', 'kanji_to_hanviet'], counts, rng)
  if (points < recallFrom) return leastDone(['pick_kanji', 'hanviet_to_kanji', ...(hasSimilar ? (['similar_kanji'] as const) : [])], counts, rng)

  const needs: KanjiExercise[] = []
  if (hasSimilar && similarDone(counts) < 1) needs.push('similar_kanji')
  if (count(counts, 'hanviet_typing') === 0 || hanVietDone(counts) < REQUIRED_PER_FACET) needs.push('hanviet_typing')
  if (toKanjiFromMeaningDone(counts) < REQUIRED_PER_FACET) needs.push('pick_kanji')
  if (toKanjiFromHanVietDone(counts) < REQUIRED_PER_FACET) needs.push('hanviet_to_kanji')
  if (meaningDone(counts) < REQUIRED_PER_FACET) needs.push(hasWord ? 'word_meaning' : 'kanji_to_meaning')
  if (needs.length > 0) return leastDone(needs, counts, rng)
  return leastDone(['hanviet_typing', hasWord ? 'word_meaning' : 'kanji_to_meaning', 'pick_kanji', 'hanviet_to_kanji'], counts, rng)
}

/** Hai Card tạo khi chữ hoàn tất giai đoạn Học. */
export const KANJI_CARD_TYPES = ['kanji.meaning', 'kanji.hanviet'] as const
/** V10: Card riêng của chữ có sao (như vocab.star_recall), tạo khi đánh sao chữ đã mở. */
export const KANJI_STAR_CARD = 'kanji.star'
export type KanjiCardType = (typeof KANJI_CARD_TYPES)[number] | typeof KANJI_STAR_CARD

/** Dạng bài của từng Card khi ôn dài hạn. Chọn chữ trong 6 là câu trắc nghiệm duy nhất được phép khi ôn (R5). */
export const KANJI_CARD_EXERCISES: Record<KanjiCardType, readonly KanjiExercise[]> = {
  'kanji.meaning': ['meaning_self', 'pick_kanji'],
  'kanji.hanviet': ['hanviet_typing', 'hanviet_to_kanji'],
  // Nhớ lại từ trí nhớ: gõ Hán Việt, nhìn nghĩa chọn chữ
  'kanji.star': ['hanviet_typing', 'pick_kanji'],
}

/** V10: số câu của vòng học thêm mỗi chữ có sao (như từ vựng). */
export const KANJI_STAR_ROUND = 4

export function canCompleteLearning(state: Pick<KanjiLearningState, 'points' | 'counts' | 'correctStreak'>, hasSimilar = false): boolean {
  const c = state.counts
  return (
    (!hasSimilar || similarDone(c) >= 1) &&
    state.points >= RULES_V9.kanji.completeAt &&
    state.correctStreak >= RULES_V9.completion.correctStreak &&
    meaningDone(c) >= REQUIRED_PER_FACET &&
    toKanjiFromMeaningDone(c) >= REQUIRED_PER_FACET &&
    hanVietDone(c) >= REQUIRED_PER_FACET &&
    toKanjiFromHanVietDone(c) >= REQUIRED_PER_FACET &&
    count(c, 'hanviet_typing') >= 1
  )
}

export interface KanjiLearningResult {
  state: KanjiLearningState
  delta: number
  completed: boolean
}

/** Đúng +1, tối đa 3 điểm cộng mỗi ngày; đúng nhờ gợi ý 0; sai −2, không xuống dưới 0. */
export function applyLearningAnswer(state: KanjiLearningState, exercise: KanjiExercise, outcome: Outcome, now: Date, hasSimilar = false): KanjiLearningResult {
  const today = studyDate(now)
  const plusToday = state.pointsDate === today ? state.pointsToday : 0
  const { maxPositivePerDay, wrong } = RULES_V9.kanji
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
  return { state: next, delta: points - state.points, completed: canCompleteLearning(next, hasSimilar) }
}

/** Buổi kế tiếp bắt đầu 00:00 giờ VN. Lịch khi đúng hết: ngày 1, 2, 3, 5; học thêm thì mỗi ngày một buổi. */
export function nextSittingAt(now: Date, sittingsDone: number): { due: Date; days: number } {
  const days = RULES_V9.kanji.sittingGaps[sittingsDone - 1] ?? 1
  return { due: new Date(nextStudyDayStart(now).getTime() + (days - 1) * DAY_MS), days }
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

export interface KanjiLoadAdvice {
  /** Số câu đến hạn vượt phần còn lại của trần hôm nay. */
  over: number
  suggestCap: number
  /** Null khi số chữ mới đang đặt đã vừa với trần. */
  suggestNewPerDay: number | null
}
