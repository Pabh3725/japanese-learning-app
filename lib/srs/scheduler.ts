// SRS-02 — Bộ tính lịch ôn. Ghép 2 nửa của một card:
//   - nửa LỊCH: ts-fsrs tính lần ôn tới (state, due, stability, difficulty…)
//   - nửa ĐIỂM: luật Projap ở lib/learning (điểm card, bỏ card giàn giáo)
// Pure: không đọc/ghi database, không tự đọc đồng hồ — `now` luôn được truyền vào.
// Ghi xuống database là việc của SRS-03.

import { createEmptyCard, fsrs, generatorParameters, Rating as FsrsRating, type Card, type Grade } from 'ts-fsrs'
import { applyReviewToCard, firstDueAt, newCardState, type CardPointsState } from '../learning/cards'
import type { ReviewAnswer } from '../learning/scoring'
import { cardsToCreate } from '../learning/stage'
import type { CardType, Rating, Stage } from '../learning/types'

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
  points: CardPointsState
  schedule: Schedule
}

/** Nhật ký một lần ôn — SRS-03 ghi vào review_logs. */
export interface ReviewLogEntry {
  rating: Rating
  /** 1 Again, 2 Hard, 3 Good, 4 Easy — khớp cột review_logs.rating. */
  ratingNumber: 1 | 2 | 3 | 4
  cardPointsDelta: number
  retiredNow: boolean
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

const RATING_TO_FSRS: Record<Rating, Grade> = {
  Again: FsrsRating.Again,
  Hard: FsrsRating.Hard,
  Good: FsrsRating.Good,
  Easy: FsrsRating.Easy,
}

const RATING_NUMBER: Record<Rating, ReviewLogEntry['ratingNumber']> = { Again: 1, Hard: 2, Good: 3, Easy: 4 }

export function createScheduler({ enableFuzz = true }: SchedulerOptions = {}) {
  const f = fsrs(generatorParameters({ enable_fuzz: enableFuzz }))

  /** R5 — Card mới khi một từ vừa qua `stage`. Hạn đầu tiên: 00:00 (giờ VN) ngày học hôm sau. */
  function createCardsForStage(stage: Stage, isKanaOnly: boolean, now: Date): ReviewCard[] {
    return cardsToCreate(stage, isKanaOnly).map((type) => newCard(type, isKanaOnly, now))
  }

  function newCard(type: CardType, isKanaOnly: boolean, now: Date): ReviewCard {
    const empty = createEmptyCard(now)
    return {
      points: newCardState(type, isKanaOnly),
      schedule: { ...fromFsrs(empty), due: firstDueAt(now), lastReviewAt: null },
    }
  }

  /** Một lần ôn: chấm → rating + điểm (ENG-02) → lịch mới (ts-fsrs) → xét bỏ card. */
  function reviewCard(card: ReviewCard, answer: ReviewAnswer, now: Date): ReviewResult {
    if (card.points.status !== 'active') {
      // Card đã bỏ / tạm dừng không được đưa vào bài học → gặp ở đây là có bug chỗ khác.
      throw new Error(`Cannot review a ${card.points.status} card (${card.points.type})`)
    }
    const last = card.schedule.lastReviewAt
    if (last && now.getTime() < last.getTime()) {
      throw new Error('Review time is earlier than the previous review')
    }

    const pointsResult = applyReviewToCard(card.points, answer)
    const { card: next } = f.next(toFsrs(card.schedule), now, RATING_TO_FSRS[pointsResult.rating])
    const schedule = fromFsrs(next)

    return {
      card: { points: pointsResult.card, schedule },
      log: {
        rating: pointsResult.rating,
        ratingNumber: RATING_NUMBER[pointsResult.rating],
        cardPointsDelta: pointsResult.delta,
        retiredNow: pointsResult.retiredNow,
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

function fromFsrs(c: Card): Schedule {
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

function toFsrs(s: Schedule): Card {
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
