// Lịch ôn dài hạn của khu Kanji: FSRS mặc định, không có Easy. Giai đoạn Học dùng lịch Stage (tối đa 2 ngày).
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs'
import { firstDueAt } from '../learning/cards'
import type { Outcome } from '../learning/types'
import { fromFsrs, toFsrs, type Schedule } from '../srs/scheduler'
import { kanjiRating } from './rules'

const withFuzz = fsrs(generatorParameters({ enable_fuzz: true }))
const noFuzz = fsrs(generatorParameters({ enable_fuzz: false }))
const GRADE = { Again: Rating.Again, Hard: Rating.Hard, Good: Rating.Good } as const

/** Xong giai đoạn Học: lịch mới, lần ôn đầu lúc 00:00 giờ VN hôm sau. */
export function newLongTermSchedule(now: Date): Schedule {
  return { ...fromFsrs(createEmptyCard(now)), due: firstDueAt(now), lastReviewAt: null }
}

export function reviewLongTermSchedule(schedule: Schedule, outcome: Outcome, now: Date, fuzz = true): Schedule {
  const scheduler = fuzz ? withFuzz : noFuzz
  return fromFsrs(scheduler.next(toFsrs(schedule), now, GRADE[kanjiRating(outcome)]).card)
}
