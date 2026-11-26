// V12 §3: điểm theo loại thẻ, số lần gặp mỗi ngày, chuyển Stage. Pure.
import { addStudyDays } from '../learning/time'
import type { StudyDate } from '../learning/types'
import { lastStage, passFor, reviewCardsFor, stage2SameDay, typesFor, type Area, type CardType, type ReviewCardType, type Stage } from './card-types'
import { RULES_V12 } from './rules'

export interface TypeState {
  points: number
  /** Ngày học của lần gặp gần nhất; khác hôm nay thì các bộ đếm trong ngày coi như 0. */
  seenDate: StudyDate | null
  seenToday: number
  wrongToday: number
}

export interface ItemState {
  area: Area
  /** Stage đang học; 'review' khi đã có Card. */
  stage: Stage | 'review'
  /** Ngày học bắt đầu Stage này (Stage sau bắt đầu từ ngày học kế tiếp). */
  stageFrom: StudyDate
  /** Điểm từng loại thẻ của Stage hiện tại. */
  types: Partial<Record<CardType, TypeState>>
  /** Chữ có cặp gần giống đã duyệt (thêm loại thẻ phân biệt ở Stage 3). */
  hasSimilar?: boolean
}

const emptyType = (): TypeState => ({ points: 0, seenDate: null, seenToday: 0, wrongToday: 0 })

/** Trạng thái một mục vừa mở: Stage 1 từ hôm nay. */
export function newItem(area: Area, today: StudyDate, hasSimilar = false): ItemState {
  return { area, stage: 1, stageFrom: today, types: startTypes(area, 1, hasSimilar), hasSimilar }
}

function startTypes(area: Area, stage: Stage, hasSimilar: boolean): Partial<Record<CardType, TypeState>> {
  return Object.fromEntries(typesFor(area, stage, { hasSimilar }).map((t) => [t, emptyType()]))
}

/** Điểm cần của loại thẻ ở Stage hiện tại của mục. */
export const passPoints = (item: Pick<ItemState, 'area'>, stage: Stage, type: CardType) => passFor(item.area, stage, type)

/** Bộ đếm trong ngày của loại thẻ, tính theo hôm nay. */
function today(t: TypeState, date: StudyDate): TypeState {
  return t.seenDate === date ? t : { ...t, seenDate: date, seenToday: 0, wrongToday: 0 }
}

export const isTypeDone = (item: ItemState, type: CardType) => item.stage !== 'review' && (item.types[type]?.points ?? 0) >= passPoints(item, item.stage, type)

/** Stage đang chạy hôm nay (Stage mới chỉ chạy từ `stageFrom`). */
export const isActive = (item: ItemState, date: StudyDate) => item.stage !== 'review' && item.stageFrom <= date

/**
 * Loại thẻ còn được hỏi hôm nay không (§3.1): đúng thì tối đa 2 lần/ngày (không quá số điểm cần); đã có lần sai thì hỏi lại
 * tới khi đủ điểm trong ngày (chủ dự án chốt 2026-11-26, bỏ trần 3 lần); đủ điểm thì thôi.
 */
export function canShow(item: ItemState, type: CardType, date: StudyDate): boolean {
  if (!isActive(item, date) || item.stage === 'review') return false
  const raw = item.types[type]
  if (!raw || isTypeDone(item, type)) return false
  const t = today(raw, date)
  return t.wrongToday > 0 || t.seenToday < RULES_V12.perDay.shows
}

/**
 * Số lần dự kiến gặp loại thẻ hôm nay khi trả lời đúng hết (để dựng bộ thẻ): không quá số điểm còn thiếu.
 * Lượt hỏi lại sau khi sai được chèn khi trả lời.
 */
export function plannedShows(item: ItemState, type: CardType, date: StudyDate): number {
  if (!canShow(item, type, date) || item.stage === 'review') return 0
  const t = today(item.types[type]!, date)
  return Math.max(0, Math.min(RULES_V12.perDay.shows - t.seenToday, passPoints(item, item.stage, type) - t.points))
}

export interface AnswerResult {
  item: ItemState
  /** Trạng thái của loại thẻ vừa trả lời (của Stage vừa hỏi, kể cả khi đã chuyển sang Stage sau). */
  typeState: TypeState
  /** Điểm thay đổi (sau sàn 0). */
  delta: number
  typeDone: boolean
  /** Xong Stage hiện tại: Stage sau (hoặc Card) bắt đầu từ ngày học kế tiếp. */
  stageDone: boolean
  /** Card cần tạo khi vừa xong Stage cuối. */
  cardsCreated: ReviewCardType[]
  /** Sai và còn được hỏi lại hôm nay: chèn lại sau `RULES_V12.retryAfter` thẻ. */
  retry: boolean
}

/** Áp một câu trả lời (§3.1–3.2). Ném lỗi nếu loại thẻ không được hỏi hôm nay (tầng trên phải kiểm tra trước). */
export function applyAnswer(item: ItemState, type: CardType, correct: boolean, date: StudyDate): AnswerResult {
  if (!canShow(item, type, date) || item.stage === 'review') throw new Error(`Loại thẻ ${type} không được hỏi hôm nay`)
  const stage = item.stage
  const before = today(item.types[type]!, date)
  const { correct: plus, wrong: minus, floor } = RULES_V12.points
  const points = Math.min(passPoints(item, stage, type), Math.max(floor, before.points + (correct ? plus : minus)))
  const t: TypeState = { points, seenDate: date, seenToday: before.seenToday + 1, wrongToday: before.wrongToday + (correct ? 0 : 1) }
  let next: ItemState = { ...item, types: { ...item.types, [type]: t } }
  const typeDone = points >= passPoints(item, stage, type)
  const stageDone = Object.keys(next.types).every((k) => isTypeDone(next, k as CardType))
  let cardsCreated: ReviewCardType[] = []
  if (stageDone) {
    const from = addStudyDays(date, 1)
    if (stage === lastStage(item.area)) {
      next = { ...next, stage: 'review', stageFrom: from, types: {} }
      cardsCreated = reviewCardsFor(item.area)
    } else {
      // Stage sau từ ngày học kế tiếp; riêng bộ thủ xong Stage 1 thì Stage 2 ngay trong ngày (stage2SameDay)
      const s = (stage + 1) as Stage
      next = { ...next, stage: s, stageFrom: stage === 1 && stage2SameDay(item.area) ? date : from, types: startTypes(item.area, s, item.hasSimilar === true) }
    }
  }
  return { item: next, typeState: t, delta: points - before.points, typeDone, stageDone, cardsCreated, retry: !correct && !stageDone && canShow(next, type, date) }
}

/** Loại thẻ còn thiếu điểm của Stage hiện tại (để hiện tiến độ). */
export function remainingTypes(item: ItemState): CardType[] {
  if (item.stage === 'review') return []
  return (Object.keys(item.types) as CardType[]).filter((t) => !isTypeDone(item, t))
}
