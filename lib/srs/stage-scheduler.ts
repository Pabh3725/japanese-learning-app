// SCH-01 — Bộ tính lịch của Stage (R9). Pure: `now` luôn được truyền vào.
// Dùng ts-fsrs như Card nhưng khác hai điểm: khoảng cách tối đa 2 ngày và không có Easy.

import { createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs'
import { RULES_V4 } from '../learning/rules'
import { stageRating } from '../learning/scoring'
import type { Outcome } from '../learning/types'
import { fromFsrs, RATING_TO_FSRS, toFsrs, type Schedule } from './scheduler'

const MAX_DAYS = RULES_V4.stageSchedule.maximumIntervalDays
const DAY_MS = 86_400_000

// Fuzz của ts-fsrs chỉ tác động khoảng từ 2,5 ngày trở lên, nên với tối đa 2 ngày là không cần.
const f = fsrs(
  generatorParameters({ enable_fuzz: false, maximum_interval: MAX_DAYS }),
)

/** Lịch khi stage vừa mở: câu đầu đến hẹn ngay. */
export function newStageSchedule(now: Date): Schedule {
  return fromFsrs(createEmptyCard(now))
}

/** Một câu Stage → lịch mới. */
export function reviewStageSchedule(schedule: Schedule, outcome: Outcome, now: Date): Schedule {
  const next = fromFsrs(f.next(toFsrs(schedule), now, RATING_TO_FSRS[stageRating(outcome)]).card)
  // ts-fsrs 6.0.0 không áp maximum_interval khi card chuyển từ Learning sang Review và trả lời muộn
  // (đã gặp thật: hẹn 7 ngày). Vì vậy tự chặn ở đây, nếu không submit_stage_exercise sẽ từ chối.
  if (next.scheduledDays <= MAX_DAYS) return next
  return { ...next, scheduledDays: MAX_DAYS, due: new Date(now.getTime() + MAX_DAYS * DAY_MS) }
}
