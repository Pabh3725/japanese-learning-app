// R1, R3, R4 — Stage, giãn cách, điểm stage, mở stage sau, hoàn tất. docs/learning-rules.md §3, §5, §6.
// V8: mỗi từ × mỗi Stage tính điểm có điểm và lịch riêng, nên một từ có thể chạy nhiều stage cùng lúc.

import {
  CARDS_ON_PASS,
  EXERCISES,
  REQUIRED_EXERCISES,
  REQUIRED_SKILLS_STAGE5,
  RULES_V3,
  STAGE_EXERCISES,
} from './rules'
import { scoreExercise } from './scoring'
import { studyDate } from './time'
import type { CardType, ExerciseCode, Outcome, ScoredStage, Stage, StudyDate } from './types'

/** Trạng thái của một từ ở một Stage tính điểm. Tương ứng một dòng `learner_stage_schedules`. */
export interface StageState {
  isKanaOnly: boolean
  stage: ScoredStage
  /** Điểm của stage này; có thể âm. Giữ nguyên sau khi đã mở stage sau. */
  points: number
  /** Số lần được +1 trong ngày `plusDate` ở stage này. */
  plusToday: number
  plusDate: StudyDate | null
  /** Dạng bài đã từng được +1 ở stage này. */
  earned: readonly ExerciseCode[]
  /** Đã mở stage sau (Stage 5 không có stage sau nên luôn false). Không bao giờ đóng lại. */
  unlockedNext: boolean
  /** Số thứ tự (trong ngày, trong khu Learn) của câu gần nhất thuộc từ này, ở bất kỳ stage nào. */
  lastSeq: number | null
  lastSeqDate: StudyDate | null
}

export function newStageState(stage: ScoredStage, isKanaOnly: boolean): StageState {
  return {
    isKanaOnly,
    stage,
    points: 0,
    plusToday: 0,
    plusDate: null,
    earned: [],
    unlockedNext: false,
    lastSeq: null,
    lastSeqDate: null,
  }
}

/** R1 — Stage kế tiếp. Từ chỉ Kana: 2 → 5. */
export function nextStage(stage: Stage, isKanaOnly: boolean): Stage | 'complete' {
  switch (stage) {
    case 1:
      return 2
    case 2:
      return isKanaOnly ? 5 : 3
    case 3:
      return 4
    case 4:
      return 5
    case 5:
      return 'complete'
  }
}

/** Các stage phải hoàn tất thì từ mới hoàn thành vòng học ban đầu. */
export function requiredScoredStages(isKanaOnly: boolean): ScoredStage[] {
  return isKanaOnly ? [2, 5] : [2, 4, 5]
}

/** R5 — Card tạo ra khi hoàn tất `stage`. */
export function cardsToCreate(stage: Stage, isKanaOnly: boolean): CardType[] {
  if (isKanaOnly && stage !== 2) return []
  return [...CARDS_ON_PASS[stage]]
}

/** Điểm cần để hoàn tất stage. */
export function completeAt(stage: ScoredStage, isKanaOnly: boolean): number {
  if (stage === 5) {
    const { withKanji, kanaOnly } = RULES_V3.stageThresholds[5].completeAt
    return isKanaOnly ? kanaOnly : withKanji
  }
  return RULES_V3.stageThresholds[stage].completeAt
}

/**
 * R3 — Câu được giãn cách khi từ chưa có câu nào hôm nay,
 * hoặc có ≥ 4 câu khác xen giữa (gap = seq − lastSeq − 1).
 */
export function isSpaced(state: Pick<StageState, 'lastSeq' | 'lastSeqDate'>, seq: number, today: StudyDate): boolean {
  if (state.lastSeq === null || state.lastSeqDate !== today) return true
  return seq - state.lastSeq - 1 >= RULES_V3.spacing.minGap
}

function hasRequiredEarned({ stage, earned, isKanaOnly }: StageState): boolean {
  if (stage === 5) {
    const required = isKanaOnly ? REQUIRED_SKILLS_STAGE5.kanaOnly : REQUIRED_SKILLS_STAGE5.withKanji
    const skills = new Set(earned.map((code) => EXERCISES[code].skill))
    return required.every((s) => skills.has(s))
  }
  return REQUIRED_EXERCISES[stage].every((code) => earned.includes(code))
}

/** R4 — Đủ điều kiện mở stage sau chưa. Stage 5 không có stage sau. */
export function canUnlockNext(state: StageState): boolean {
  if (state.stage === 5) return false
  return state.points >= RULES_V3.stageThresholds[state.stage].unlockNextAt && hasRequiredEarned(state)
}

/** R4 — Đủ điều kiện hoàn tất stage chưa. Stage 2, 4 phải mở stage sau trước. */
export function canComplete(state: StageState): boolean {
  if (state.points < completeAt(state.stage, state.isKanaOnly)) return false
  return state.stage === 5 ? hasRequiredEarned(state) : state.unlockedNext
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
  /** Stage vừa được mở nhờ câu này (có thể là Stage 3, chỉ có xem). */
  unlockedStage: Stage | null
  /** Stage này vừa hoàn tất. */
  completed: boolean
  cardsCreated: CardType[]
}

/** Các dạng bài hợp lệ cho một Stage của từ. */
export function allowedExercises(stage: ScoredStage, isKanaOnly: boolean): readonly ExerciseCode[] {
  const list = STAGE_EXERCISES[stage]
  if (stage === 5 && isKanaOnly) {
    return list.filter((code) => {
      const skill = EXERCISES[code].skill
      return skill === 'S1' || skill === 'S2'
    })
  }
  return list
}

/** R3 + R4 + R5 — Áp một câu học vào trạng thái của từ ở stage này. */
export function applyStageAttempt(state: StageState, attempt: StageAttempt): StageAttemptResult {
  const { stage, isKanaOnly } = state
  if (!allowedExercises(stage, isKanaOnly).includes(attempt.exercise)) {
    throw new Error(`Dạng bài ${attempt.exercise} không thuộc Stage ${stage}`)
  }

  const today = studyDate(attempt.now)
  const plusToday = state.plusDate === today ? state.plusToday : 0
  const spaced = isSpaced(state, attempt.seq, today)
  const raw = scoreExercise(attempt.outcome)

  let delta = 0
  let counted = false
  if (spaced) {
    if (raw > 0) {
      const underCap = plusToday < RULES_V3.stagePoints.maxPositivePerStagePerDay
      delta = underCap ? raw : 0
      counted = underCap
    } else {
      delta = raw // trừ điểm không có trần
      counted = true
    }
  }

  const next: StageState = {
    ...state,
    points: state.points + delta,
    plusToday: delta > 0 ? plusToday + 1 : plusToday,
    plusDate: today,
    earned:
      delta > 0 && !state.earned.includes(attempt.exercise)
        ? [...state.earned, attempt.exercise]
        : state.earned,
    lastSeq: attempt.seq,
    lastSeqDate: today,
  }

  const unlockedNow = !state.unlockedNext && canUnlockNext(next)
  if (unlockedNow) next.unlockedNext = true
  const completed = canComplete(next)

  return {
    state: next,
    delta,
    counted,
    unlockedStage: unlockedNow ? (nextStage(stage, isKanaOnly) as Stage) : null,
    completed,
    cardsCreated: completed ? cardsToCreate(stage, isKanaOnly) : [],
  }
}

/** Stage 1 và 3: xem xong là qua, mở stage kế tiếp ngay. */
export function completeIntro(
  stage: 1 | 3,
  isKanaOnly: boolean,
): { openedStage: Stage; cardsCreated: CardType[] } {
  return {
    openedStage: nextStage(stage, isKanaOnly) as Stage,
    cardsCreated: cardsToCreate(stage, isKanaOnly),
  }
}
