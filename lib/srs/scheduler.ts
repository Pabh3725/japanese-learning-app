// SRS-02 — Bộ tính lịch ôn: ts-fsrs tính lần ôn tới, tối đa 90 ngày. Không có Easy.
// Pure: không đọc/ghi database, không tự đọc đồng hồ — `now` luôn được truyền vào.
// Ghi xuống database là việc của SRS-03.

import { createEmptyCard, fsrs, generatorParameters, Rating as FsrsRating, type Card, type Grade } from 'ts-fsrs'
import { firstDueAt } from '../learning/cards'
import { RULES_V4 } from '../learning/rules'
import { ratingOf } from '../learning/scoring'
import { cardsToCreate } from '../learning/stage'
import type { CardStatus, CardType, ExerciseCode, Outcome, Rating, Stage } from '../learning/types'

/** Trạng thái FSRS. Số khớp cột review_cards.state (0 New, 1 Learning, 2 Review, 3 Relearning). */
export type ScheduleState = 0 | 1 | 2 | 3

/** Nửa lịch của card. Tên trường theo kiểu Projap, không phụ thuộc tên của ts-fsrs. */
export interface Schedule {
  state: ScheduleState
  due: Date
  stability: number
  difficulty: number
  /** Số ngày tới lần ôn sau (0 = trong ngày, bước học ngắn). */
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  lastReviewAt: Date | null
}

export interface ReviewCard {
  type: CardType
  status: CardStatus
  schedule: Schedule
}

export interface ReviewAnswer {
  outcome: Outcome
  exercise: ExerciseCode | string
  /** Thời gian từ lúc câu hiện ra tới lúc nộp. */
  responseMs: number
}

/** Nhật ký một lần ôn — SRS-03 ghi vào review_logs. */
export interface ReviewLogEntry {
  rating: Rating
  /** 1 Again, 2 Hard, 3 Good — khớp cột review_logs.rating. */
  ratingNumber: 1 | 2 | 3
  stateBefore: ScheduleState
  dueBefore: Date
  stateAfter: ScheduleState
  dueAfter: Date
  stabilityAfter: number
  difficultyAfter: number
  scheduledDays: number
  reviewedAt: Date
}

export interface ReviewResult {
  card: ReviewCard
  log: ReviewLogEntry
}

export interface SchedulerOptions {
  /** Lệch ngẫu nhiên nhỏ để card không dồn cùng một ngày. Production: true. Test: false. */
  enableFuzz?: boolean
}

export const RATING_TO_FSRS: Record<Rating, Grade> = {
  Again: FsrsRating.Again,
  Hard: FsrsRating.Hard,
  Good: FsrsRating.Good,
}

const RATING_NUMBER: Record<Rating, ReviewLogEntry['ratingNumber']> = { Again: 1, Hard: 2, Good: 3 }
const DAY_MS = 86_400_000

/** ts-fsrs không áp maximum_interval khi card từ Learning sang Review, nên chặn lại ở đây. */
export function capInterval(schedule: Schedule, now: Date, maxDays: number): Schedule {
  if (schedule.scheduledDays <= maxDays) return schedule
  return { ...schedule, scheduledDays: maxDays, due: new Date(now.getTime() + maxDays * DAY_MS) }
}

export function createScheduler({ enableFuzz = true }: SchedulerOptions = {}) {
  const maxDays = RULES_V4.reviewSchedule.maximumIntervalDays
  const f = fsrs(generatorParameters({ enable_fuzz: enableFuzz, maximum_interval: maxDays }))

  /** R5 — Card mới khi một từ vừa qua `stage`. Hạn đầu tiên: 00:00 (giờ VN) ngày học hôm sau. */
  function createCardsForStage(stage: Stage, now: Date): ReviewCard[] {
    return cardsToCreate(stage).map((type) => newCard(type, now))
  }

  function newCard(type: CardType, now: Date): ReviewCard {
    return { type, status: 'active', schedule: { ...fromFsrs(createEmptyCard(now)), due: firstDueAt(now), lastReviewAt: null } }
  }

  /** Một lần ôn: kết quả → rating → lịch mới (ts-fsrs). */
  function reviewCard(card: ReviewCard, answer: ReviewAnswer, now: Date): ReviewResult {
    if (card.status !== 'active') {
      // Card tạm dừng không được đưa vào bài học → gặp ở đây là có bug ở tầng trên
      throw new Error(`Cannot review a ${card.status} card (${card.type})`)
    }
    const last = card.schedule.lastReviewAt
    if (last && now.getTime() < last.getTime()) {
      throw new Error('Review time is earlier than the previous review')
    }
    const rating = ratingOf(answer.outcome)
    const { card: next } = f.next(toFsrs(card.schedule), now, RATING_TO_FSRS[rating])
    const schedule = capInterval(fromFsrs(next), now, maxDays)
    return {
      card: { ...card, schedule },
      log: {
        rating,
        ratingNumber: RATING_NUMBER[rating],
        stateBefore: card.schedule.state,
        dueBefore: card.schedule.due,
        stateAfter: schedule.state,
        dueAfter: schedule.due,
        stabilityAfter: schedule.stability,
        difficultyAfter: schedule.difficulty,
        scheduledDays: schedule.scheduledDays,
        reviewedAt: now,
      },
    }
  }

  return { createCardsForStage, reviewCard }
}

export type Scheduler = ReturnType<typeof createScheduler>

// ---- Chuyển đổi giữa kiểu Projap và kiểu ts-fsrs ----

export function fromFsrs(c: Card): Schedule {
  return {
    state: c.state as number as ScheduleState,
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    lastReviewAt: c.last_review ?? null,
  }
}

export function toFsrs(s: Schedule): Card {
  // Không truyền elapsed_days: trường cũ, ts-fsrs tự tính từ last_review (bỏ hẳn ở bản 6).
  return {
    state: s.state,
    due: s.due,
    stability: s.stability,
    difficulty: s.difficulty,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    last_review: s.lastReviewAt ?? undefined,
  } as Card
}
