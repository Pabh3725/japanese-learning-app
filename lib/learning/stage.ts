// R1, R3, R4 — Stage, giãn cách, điểm stage, mở stage sau, hoàn tất. docs/learning-rules.md §3, §5, §6.
// V8: mỗi từ × mỗi Stage tính điểm có điểm và lịch riêng, nên một từ có thể chạy nhiều stage cùng lúc.

import { CARDS_ON_PASS, EXERCISES, REQUIRED_EXERCISES, REQUIRED_SKILLS, RULES_V9 } from './rules'
import type { CardType, ExerciseCode, ScoredStage, Stage, StudyDate } from './types'

/** Trạng thái của một từ ở một Stage tính điểm. Tương ứng một dòng `learner_stage_schedules`. */
export interface StageState {
  stage: ScoredStage
  /** Điểm của stage này; có thể âm. Giữ nguyên sau khi đã mở stage sau. */
  points: number
  /** Số lần được +1 trong ngày `plusDate` ở stage này. */
  plusToday: number
  plusDate: StudyDate | null
  /** Dạng bài đã từng được +1 ở stage này. */
  earned: readonly ExerciseCode[]
  /** Đã mở stage sau (Stage 3 và 6 không có stage sau nên luôn false). Không bao giờ đóng lại. */
  unlockedNext: boolean
  /** Số thứ tự (trong ngày, trong khu Learn) của câu gần nhất thuộc từ này, ở bất kỳ stage nào. */
  lastSeq: number | null
  lastSeqDate: StudyDate | null
  /** Số câu đúng liên tiếp gần nhất ở stage này, tính cả câu không được cộng điểm. */
  correctStreak: number
}

/** Điểm cần để hoàn tất stage. */
export function completeAt(stage: ScoredStage): number {
  return RULES_V9.stageThresholds[stage].completeAt
}

function hasRequiredEarned({ stage, earned }: StageState): boolean {
  if (stage === 3 || stage === 6) {
    const skills = new Set(earned.map((code) => EXERCISES[code].skill))
    return REQUIRED_SKILLS[stage].every((s) => skills.has(s))
  }
  return REQUIRED_EXERCISES[stage].every((code) => earned.includes(code))
}

/** R4 — Đủ điều kiện hoàn tất stage chưa. Stage 2, 5 phải mở stage sau trước. */
export function canComplete(state: StageState): boolean {
  if (state.points < completeAt(state.stage)) return false
  if (state.correctStreak < RULES_V9.completion.correctStreak) return false
  return state.stage === 3 || state.stage === 6 ? hasRequiredEarned(state) : state.unlockedNext
}

/** R5 — Card tạo ra khi hoàn tất `stage`. */
export function cardsToCreate(stage: Stage): CardType[] {
  return [...CARDS_ON_PASS[stage]]
}
