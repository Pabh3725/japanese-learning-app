// R1, R3, R4 — Stage, giãn cách, điểm stage, mở stage sau, hoàn tất. docs/learning-rules.md §3, §5, §6.
// V8: mỗi từ × mỗi Stage tính điểm có điểm và lịch riêng, nên một từ có thể chạy nhiều stage cùng lúc.

import { CARDS_ON_PASS, EXERCISES, REQUIRED_EXERCISES, REQUIRED_SKILLS, RULES_V9, STAGE_EXERCISES } from './rules'
import type { CardType, ExerciseCode, Outcome, ScoredStage, Stage, StudyDate } from './types'

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

export function newStageState(stage: ScoredStage): StageState {
  return {
    stage,
    points: 0,
    plusToday: 0,
    plusDate: null,
    earned: [],
    unlockedNext: false,
    lastSeq: null,
    lastSeqDate: null,
    correctStreak: 0,
  }
}

/** R1 — Stage kế tiếp. Từ vựng Kana: 1 → 2 → 3. Từ vựng Kanji: 4 → 5 → 6. */
export function nextStage(stage: Stage): Stage | 'complete' {
  switch (stage) {
    case 1:
      return 2
    case 2:
      return 3
    case 4:
      return 5
    case 5:
      return 6
    case 3:
    case 6:
      return 'complete'
  }
}

/** Điểm cần để hoàn tất stage. */
export function completeAt(stage: ScoredStage): number {
  return RULES_V9.stageThresholds[stage].completeAt
}

/**
 * R3 — Câu được giãn cách khi từ chưa có câu nào hôm nay,
 * hoặc có ≥ 4 câu khác xen giữa (gap = seq − lastSeq − 1).
 */
export function isSpaced(state: Pick<StageState, 'lastSeq' | 'lastSeqDate'>, seq: number, today: StudyDate): boolean {
  if (state.lastSeq === null || state.lastSeqDate !== today) return true
  return seq - state.lastSeq - 1 >= RULES_V9.spacing.minGap
}

function hasRequiredEarned({ stage, earned }: StageState): boolean {
  if (stage === 3 || stage === 6) {
    const skills = new Set(earned.map((code) => EXERCISES[code].skill))
    return REQUIRED_SKILLS[stage].every((s) => skills.has(s))
  }
  return REQUIRED_EXERCISES[stage].every((code) => earned.includes(code))
}

/** R4 — Đủ điều kiện mở stage sau chưa. Stage 3 và 6 không có stage sau. */
export function canUnlockNext(state: StageState): boolean {
  if (state.stage === 3 || state.stage === 6) return false
  return state.points >= RULES_V9.stageThresholds[state.stage].unlockNextAt && hasRequiredEarned(state)
}

/** R4 — Đủ điều kiện hoàn tất stage chưa. Stage 2, 5 phải mở stage sau trước. */
export function canComplete(state: StageState): boolean {
  if (state.points < completeAt(state.stage)) return false
  if (state.correctStreak < RULES_V9.completion.correctStreak) return false
  return state.stage === 3 || state.stage === 6 ? hasRequiredEarned(state) : state.unlockedNext
}

export interface StageAttempt {
  exercise: ExerciseCode
  outcome: Outcome
  /** Số thứ tự câu trong ngày học (không tính câu Review, câu vòng boss). */
  seq: number
  now: Date
}

export interface StageAttemptResult {
  state: StageState
  /** Điểm thực sự cộng/trừ vào điểm stage. */
  delta: number
  /** Câu thỏa giãn cách và không bị trần chặn (cột `counted`). */
  counted: boolean
  /** Stage vừa được mở nhờ câu này. */
  unlockedStage: Stage | null
  /** Stage này vừa hoàn tất. */
  completed: boolean
  cardsCreated: CardType[]
}

/** Các dạng bài hợp lệ cho một Stage. */
export function allowedExercises(stage: ScoredStage): readonly ExerciseCode[] {
  return STAGE_EXERCISES[stage]
}

/** Stage 1 và 4: xem xong là qua, mở stage kế tiếp ngay. Không tạo Card. */
export function completeIntro(stage: 1 | 4): { openedStage: Stage } {
  return { openedStage: nextStage(stage) as Stage }
}

/** Bước hiện tại của từ trong một stage. Stage 3 và 6 không chia bước. */
export type StageStep = 'choice' | 'mixed' | 'assembly'

export function stageStep(stage: ScoredStage, points: number): StageStep {
  if (stage === 2) return points < RULES_V9.stageSteps[2].assemblyFrom ? 'choice' : 'assembly'
  if (stage === 5) {
    const { mixedFrom, assemblyFrom } = RULES_V9.stageSteps[5]
    if (points < mixedFrom) return 'choice'
    return points < assemblyFrom ? 'mixed' : 'assembly'
  }
  return 'assembly'
}

/** R5 — Card tạo ra khi hoàn tất `stage`. */
export function cardsToCreate(stage: Stage): CardType[] {
  return [...CARDS_ON_PASS[stage]]
}
