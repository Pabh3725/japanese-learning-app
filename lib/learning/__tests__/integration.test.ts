// INT-01 — 学校 đi trọn 1 → 5 và テレビ đi 1 → 2 → 5 qua engine, bộ lịch và Review ghép lại.
// Mốc theo luật V4: Stage 2 mở ở 6, xong ở 10; Stage 4 mở ở 10, xong ở 15; Stage 5 xong ở 10.
// Phần lưu xuống database: supabase/tests/gd4_checks.sql.
import { describe, expect, it } from 'vitest'
import { createScheduler, type ReviewCard } from '../../srs/scheduler'
import { newStageSchedule, reviewStageSchedule } from '../../srs/stage-scheduler'
import {
  addStudyDays,
  applyStageAttempt,
  completeIntro,
  firstDueAt,
  REQUIRED_EXERCISES,
  shouldRetire,
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
function runStage(stage: ScoredStage, isKanaOnly: boolean, startDay: string, exercises: readonly ExerciseCode[]) {
  let state = word({ stage, isKanaOnly })
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
    if (result.completed) return { points: state.points, cards: result.cardsCreated, unlocked, maxScheduledDays, day }
  }
  throw new Error(`Stage ${stage} không hoàn tất`)
}

describe('INT-01 — 学校 đi trọn 1 → 5', () => {
  const cards: CardType[] = []
  const stage4List = [...REQUIRED_EXERCISES[4], ...STAGE_EXERCISES[4].filter((e) => !REQUIRED_EXERCISES[4].includes(e))]

  it('mỗi stage mở và hoàn tất đúng mốc, gom đủ 5 loại Card', () => {
    expect(completeIntro(1, false).openedStage).toBe(2)

    const s2 = runStage(2, false, '2026-11-01', REQUIRED_EXERCISES[2])
    expect(s2.unlocked).toEqual({ stage: 3, atPoints: 6 })
    expect(s2.points).toBe(10)
    expect(s2.cards).toEqual(['vocab.meaning_kana'])
    cards.push(...s2.cards)

    // Stage 3 chỉ xem: xem xong là có Card, mở Stage 4
    const s3 = completeIntro(3, false)
    expect(s3.openedStage).toBe(4)
    expect(s3.cardsCreated).toEqual(['vocab.kana_hanviet'])
    cards.push(...s3.cardsCreated)

    const s4 = runStage(4, false, '2026-11-03', stage4List)
    expect(s4.unlocked).toEqual({ stage: 5, atPoints: 10 })
    expect(s4.points).toBe(15)
    expect(s4.cards).toEqual(['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet'])
    cards.push(...s4.cards)

    const s5 = runStage(5, false, '2026-11-08', STAGE_EXERCISES[5])
    expect(s5.points).toBe(10)
    expect(s5.cards).toEqual(['vocab.meaning_hanviet'])
    cards.push(...s5.cards)

    expect(new Set(cards).size).toBe(5)
    // Lịch Stage không vượt 2 ngày ở mọi stage
    for (const stage of [s2, s4, s5]) expect(stage.maxScheduledDays).toBeLessThanOrEqual(2)
  })

  it('Card mới đến hạn 00:00 hôm sau, ôn đúng thì lịch giãn ra và điểm tăng', () => {
    const scheduler = createScheduler({ enableFuzz: false })
    const now = vn('2026-11-01 20:00')
    const [card] = scheduler.createCardsForStage(2, false, now)
    expect(card.schedule.due).toEqual(firstDueAt(now))
    const { card: next } = scheduler.reviewCard(card, { outcome: 'correct', exercise: 'meaning_to_kana', responseMs: 5000 }, card.schedule.due)
    expect(next.points.points).toBe(1)
    expect(next.schedule.due.getTime()).toBeGreaterThan(card.schedule.due.getTime())
  })

  it('Card giàn giáo bị bỏ khi đủ điểm, Card giữ lâu dài thì không', () => {
    const scheduler = createScheduler({ enableFuzz: false })
    const now = vn('2026-11-01 20:00')
    const [meaningKana] = scheduler.createCardsForStage(2, false, now)
    const nearRetire: ReviewCard = { ...meaningKana, points: { ...meaningKana.points, points: 29 } }
    const { card } = scheduler.reviewCard(nearRetire, { outcome: 'correct', exercise: 'meaning_to_kana', responseMs: 5000 }, nearRetire.schedule.due)
    expect(card.points.points).toBe(30)
    expect(card.points.status).toBe('retired')

    expect(shouldRetire({ type: 'vocab.kana_hanviet', points: 39, wordIsKanaOnly: false })).toBe(false)
    expect(shouldRetire({ type: 'vocab.kana_hanviet', points: 40, wordIsKanaOnly: false })).toBe(true)
    for (const type of ['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet', 'vocab.meaning_hanviet', 'vocab.star_recall'] as const) {
      expect(shouldRetire({ type, points: 1000, wordIsKanaOnly: false })).toBe(false)
    }
  })
})

describe('INT-01 — テレビ đi 1 → 2 → 5', () => {
  it('bỏ qua Stage 3, 4; chỉ có Card nghĩa–Kana và không bao giờ bị bỏ', () => {
    expect(completeIntro(1, true).openedStage).toBe(2)
    const s2 = runStage(2, true, '2026-11-01', REQUIRED_EXERCISES[2])
    expect(s2.unlocked).toEqual({ stage: 5, atPoints: 6 })
    expect(s2.cards).toEqual(['vocab.meaning_kana'])
    expect(s2.maxScheduledDays).toBeLessThanOrEqual(2)

    const s5 = runStage(5, true, '2026-11-03', ['meaning_assembly', 'kana_free_recall'])
    expect(s5.points).toBe(10)
    expect(s5.cards).toEqual([])
    expect(shouldRetire({ type: 'vocab.meaning_kana', points: 1000, wordIsKanaOnly: true })).toBe(false)
  })
})
