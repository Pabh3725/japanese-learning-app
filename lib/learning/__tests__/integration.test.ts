// INT-01 — 学校 đi hai lộ trình và テレビ đi một lộ trình, qua engine và bộ lịch ghép lại.
// V9: Từ vựng Kana 1 → 2 → 3. Từ vựng Kanji 4 → 5 → 6. Phần lưu xuống database: supabase/tests/.
import { describe, expect, it } from 'vitest'
import { createScheduler } from '../../srs/scheduler'
import { newStageSchedule, reviewStageSchedule } from '../../srs/stage-scheduler'
import {
  addStudyDays,
  applyStageAttempt,
  completeIntro,
  firstDueAt,
  REQUIRED_EXERCISES,
  STAGE_EXERCISES,
  type CardType,
  type ExerciseCode,
  type ScoredStage,
  type Stage,
} from '../index'
import { vn, word } from './helpers'

const PER_DAY = 3
const GAP = 5

/** Trả lời đúng mỗi ngày tới khi hoàn tất, ghi lại điểm lúc mở stage sau và lúc xong. */
function runStage(stage: ScoredStage, startDay: string, exercises: readonly ExerciseCode[]) {
  let state = word({ stage })
  let schedule = newStageSchedule(vn(`${startDay} 20:00`))
  let day = startDay
  let unlocked: { stage: Stage; atPoints: number } | null = null
  let maxScheduledDays = 0
  for (let i = 0, seq = 1; i < 200; i++, seq += GAP) {
    if (i > 0 && i % PER_DAY === 0) {
      day = addStudyDays(day, 1)
      seq = 1
    }
    const now = vn(`${day} 20:00`)
    const result = applyStageAttempt(state, { exercise: exercises[i % exercises.length], outcome: 'correct', seq, now })
    state = result.state
    schedule = reviewStageSchedule(schedule, 'correct', now)
    maxScheduledDays = Math.max(maxScheduledDays, schedule.scheduledDays)
    if (result.unlockedStage) unlocked = { stage: result.unlockedStage, atPoints: state.points }
    if (result.completed) return { points: state.points, cards: result.cardsCreated, unlocked, maxScheduledDays }
  }
  throw new Error(`Stage ${stage} không hoàn tất`)
}

describe('INT-01 — 学校', () => {
  it('Từ vựng Kana: mở Stage 3 ở 6 điểm, Stage 2 xong ở 10 không tạo Card, Stage 3 xong ở 10 tạo Card Kana', () => {
    expect(completeIntro(1).openedStage).toBe(2)
    const s2 = runStage(2, '2026-11-01', REQUIRED_EXERCISES[2])
    expect(s2.unlocked).toEqual({ stage: 3, atPoints: 6 })
    expect(s2.points).toBe(10)
    expect(s2.cards).toEqual([])
    expect(s2.maxScheduledDays).toBeLessThanOrEqual(2)

    const s3 = runStage(3, '2026-11-03', STAGE_EXERCISES[3])
    expect(s3.points).toBe(10)
    expect(s3.cards).toEqual<CardType[]>(['vocab.kana'])
  })

  it('Từ vựng Kanji: thẻ Stage 4 mở Stage 5, mở Stage 6 ở 10 điểm, xong Stage 6 tạo Card Kanji', () => {
    expect(completeIntro(4).openedStage).toBe(5)
    const stage5List = [...REQUIRED_EXERCISES[5], ...STAGE_EXERCISES[5].filter((e) => !REQUIRED_EXERCISES[5].includes(e))]
    const s5 = runStage(5, '2026-11-05', stage5List)
    expect(s5.unlocked).toEqual({ stage: 6, atPoints: 10 })
    expect(s5.points).toBe(15)
    expect(s5.cards).toEqual([])

    const s6 = runStage(6, '2026-11-09', STAGE_EXERCISES[6])
    expect(s6.points).toBe(10)
    expect(s6.cards).toEqual<CardType[]>(['vocab.kanji'])
    expect(s6.maxScheduledDays).toBeLessThanOrEqual(2)
  })
})

describe('INT-01 — テレビ', () => {
  it('chỉ đi Từ vựng Kana, chỉ có Card Kana', () => {
    const s2 = runStage(2, '2026-11-01', REQUIRED_EXERCISES[2])
    expect(s2.cards).toEqual([])
    expect(runStage(3, '2026-11-03', ['meaning_assembly', 'kana_free_recall']).cards).toEqual<CardType[]>(['vocab.kana'])
  })
})

describe('Card trong Review', () => {
  const scheduler = createScheduler({ enableFuzz: false })
  const now = vn('2026-11-01 20:00')
  const answer = (outcome: 'correct' | 'wrong') => ({ outcome, exercise: 'kana_free_recall', responseMs: 500 })

  it('đến hạn 00:00 hôm sau', () => {
    const [card] = scheduler.createCardsForStage(3, now)
    expect(card.type).toBe('vocab.kana')
    expect(card.schedule.due).toEqual(firstDueAt(now))
  })

  it('đúng liên tục thì giãn 2, 11, 46 rồi dừng ở 90 ngày, không bao giờ bị bỏ', () => {
    let [card] = scheduler.createCardsForStage(3, now)
    const gaps: number[] = []
    let at = card.schedule.due
    for (let i = 0; i < 8; i++) {
      card = scheduler.reviewCard(card, answer('correct'), at).card
      gaps.push(Math.round((card.schedule.due.getTime() - at.getTime()) / 864e5))
      at = card.schedule.due
    }
    expect(gaps).toEqual([0, 2, 11, 46, 90, 90, 90, 90])
    expect(card.status).toBe('active')
  })

  it('trả lời nhanh cũng chỉ là Good, không có Easy', () => {
    const [card] = scheduler.createCardsForStage(3, now)
    expect(scheduler.reviewCard(card, answer('correct'), card.schedule.due).log.rating).toBe('Good')
    expect(scheduler.reviewCard(card, answer('wrong'), card.schedule.due).log.rating).toBe('Again')
  })
})
