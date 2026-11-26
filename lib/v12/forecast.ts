// V12 §2: dự báo số câu mỗi ngày của từng khu trong 7 ngày tới (trả lời đúng hết) và cảnh báo vượt trần. Pure.
import { addStudyDays } from '../learning/time'
import type { StudyDate } from '../learning/types'
import { reviewCardsFor, zoneOf, type Area, type Zone } from './card-types'
import { applyAnswer, canShow, newItem, plannedShows, type ItemState } from './stage'
import { RULES_V12 } from './rules'

/** Số câu mỗi ngày của một mục từ `from` tới hết `days` ngày, khi trả lời đúng hết. */
export function simulateItem(item: ItemState, from: StudyDate, days: number): { counts: number[]; cardsFrom: number | null } {
  const counts = new Array<number>(days).fill(0)
  let state = item
  let cardsFrom: number | null = null
  for (let d = 0; d < days && state.stage !== 'review'; d++) {
    const date = addStudyDays(from, d)
    // Xong Stage 1 thì Stage 2 chạy luôn trong ngày (2026-11-26): lặp tới khi Stage không đổi nữa
    let stage: ItemState['stage']
    do {
      stage = state.stage
      for (const type of Object.keys(state.types) as (keyof ItemState['types'])[]) {
        const shows = plannedShows(state, type, date)
        for (let n = 0; n < shows && canShow(state, type, date); n++) {
          const r = applyAnswer(state, type, true, date)
          state = r.item
          counts[d]++
          if (r.cardsCreated.length > 0) cardsFrom = d + 1
          if (r.stageDone) break
        }
        if (state.stage !== stage) break
      }
    } while (state.stage !== stage && state.stage !== 'review' && state.stageFrom <= date)
  }
  return { counts, cardsFrom }
}

export interface ForecastInput {
  today: StudyDate
  /** Mục đang học Stage. */
  items: readonly ItemState[]
  /** Card FSRS đến hạn theo ngày (chỉ số 0 = hôm nay, gồm cả Card quá hạn), theo khu. */
  reviewsByDay: Record<Zone, readonly number[]>
  /** Số mục mới mở mỗi ngày, theo loại mục. */
  newPerDay: Partial<Record<Area, number>>
  caps: Record<Zone, number>
  days?: number
}

export interface ForecastDay {
  date: StudyDate
  counts: Record<Zone, number>
  /** Khu vượt trần ngày này và số câu vượt. */
  over: Partial<Record<Zone, number>>
}

/** §2: dự báo 7 ngày; mục mới hôm nay cũng tính (Stage 1 = số loại thẻ Stage 1). */
export function forecast(input: ForecastInput): ForecastDay[] {
  const days = input.days ?? RULES_V12.forecastDays
  const counts: Record<Zone, number[]> = { kana: new Array(days).fill(0), kanji: new Array(days).fill(0), word_kanji: new Array(days).fill(0) }
  const add = (area: Area, sim: { counts: number[]; cardsFrom: number | null }, offset: number) => {
    const z = zoneOf(area)
    sim.counts.forEach((n, d) => {
      if (offset + d < days) counts[z][offset + d] += n
    })
    // Card mới đến hạn lần đầu ngày học sau ngày xong
    if (sim.cardsFrom !== null && offset + sim.cardsFrom < days) counts[z][offset + sim.cardsFrom] += reviewCardsFor(area).length
  }
  for (const item of input.items) add(item.area, simulateItem(item, input.today, days), 0)
  for (const [area, n] of Object.entries(input.newPerDay) as [Area, number][]) {
    for (let d = 0; d < days; d++) {
      const date = addStudyDays(input.today, d)
      const sim = simulateItem(newItem(area, date), date, days - d)
      for (let k = 0; k < n; k++) add(area, sim, d)
    }
  }
  for (const z of ['kana', 'kanji', 'word_kanji'] as const) input.reviewsByDay[z].forEach((n, d) => d < days && (counts[z][d] += n))
  return Array.from({ length: days }, (_, d) => {
    const c = { kana: counts.kana[d], kanji: counts.kanji[d], word_kanji: counts.word_kanji[d] }
    const over: Partial<Record<Zone, number>> = {}
    for (const z of ['kana', 'kanji', 'word_kanji'] as const) if (c[z] > input.caps[z]) over[z] = c[z] - input.caps[z]
    return { date: addStudyDays(input.today, d), counts: c, over }
  })
}

/** Những ngày vượt trần (để hiện cảnh báo). */
export const overflowDays = (days: readonly ForecastDay[]) => days.filter((d) => Object.keys(d.over).length > 0)
