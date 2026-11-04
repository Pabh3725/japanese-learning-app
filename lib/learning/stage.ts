// R1, R3, R4 — Stage, giãn cách, điểm stage, qua Stage. docs/learning-rules.md §3, §5, §6.

import {
  CARDS_ON_PASS,
  EXERCISES,
  REQUIRED_EXERCISES,
  REQUIRED_SKILLS_STAGE5,
  RULES_V2,
  STAGE_EXERCISES,
} from './rules'
import { scoreExercise } from './scoring'
import { studyDate } from './time'
import type { CardType, ExerciseCode, Outcome, Stage, StudyDate } from './types'

/** Trạng thái học của một từ (một người học). Tương ứng một dòng `learner_vocabulary`. */
export interface WordState {
  isKanaOnly: boolean
  /** 'complete' = đã hoàn thành vòng học ban đầu. */
  stage: Stage | 'complete'
  /** Điểm stage hiện tại; có thể âm. */
  points: number
  /** Số lần được +1 trong ngày `plusDate` ở Stage hiện tại. */
  plusToday: number
  plusDate: StudyDate | null
  /** Dạng bài đã từng được +1 ở Stage hiện tại. */
  earned: readonly ExerciseCode[]
  /** Số thứ tự (trong ngày) của câu gần nhất thuộc từ này, kể cả câu review. */
  lastSeq: number | null
  lastSeqDate: StudyDate | null
}

export function newWordState(isKanaOnly: boolean): WordState {
  return {
    isKanaOnly,
    stage: 1,
    points: 0,
    plusToday: 0,
    plusDate: null,
    earned: [],
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

/** R5 — Card tạo ra khi vừa qua `stage`. */
export function cardsToCreate(stage: Stage, isKanaOnly: boolean): CardType[] {
  if (isKanaOnly && stage !== 2) return []
  return [...CARDS_ON_PASS[stage]]
}

/**
 * R3 — Câu được giãn cách khi từ chưa có câu nào hôm nay,
 * hoặc có ≥ 4 câu khác xen giữa (gap = seq − lastSeq − 1).
 */
export function isSpaced(state: Pick<WordState, 'lastSeq' | 'lastSeqDate'>, seq: number, today: StudyDate): boolean {
  if (state.lastSeq === null || state.lastSeqDate !== today) return true
  return seq - state.lastSeq - 1 >= RULES_V2.spacing.minGap
}

/**
 * Ghi nhận một câu review (hoặc câu bất kỳ không tính điểm stage) của từ này,
 * để luật giãn cách đo đúng khoảng cách. Câu vòng boss KHÔNG gọi hàm này.
 */
export function touchWord(state: WordState, seq: number, now: Date): WordState {
  return { ...state, lastSeq: seq, lastSeqDate: studyDate(now) }
}

/** R4 — Đã đủ điều kiện qua Stage chưa (chỉ Stage 2, 4, 5). */
export function hasPassedStage(state: WordState): boolean {
  const { stage, points, earned, isKanaOnly } = state
  if (stage !== 2 && stage !== 4 && stage !== 5) return false
  if (points < RULES_V2.stagePoints.passAt) return false
  if (stage === 5) {
    const required = isKanaOnly ? REQUIRED_SKILLS_STAGE5.kanaOnly : REQUIRED_SKILLS_STAGE5.withKanji
    const skills = new Set(earned.map((code) => EXERCISES[code].skill))
    return required.every((s) => skills.has(s))
  }
  return REQUIRED_EXERCISES[stage].every((code) => earned.includes(code))
}

export interface StageAttempt {
  exercise: ExerciseCode
  outcome: Outcome
  /** Số thứ tự câu trong ngày học (không tính câu vòng boss). */
  seq: number
  now: Date
}

export interface StageAttemptResult {
  state: WordState
  /** Điểm thực sự cộng/trừ vào điểm stage. */
  delta: number
  /** Câu thỏa giãn cách và không bị trần chặn (cột `counted`). */
  counted: boolean
  /** Stage vừa qua (nếu có). */
  passedStage: Stage | null
  cardsCreated: CardType[]
}

/** Các dạng bài hợp lệ cho Stage hiện tại của từ. */
export function allowedExercises(stage: 2 | 4 | 5, isKanaOnly: boolean): readonly ExerciseCode[] {
  const list = STAGE_EXERCISES[stage]
  if (stage === 5 && isKanaOnly) {
    return list.filter((code) => {
      const skill = EXERCISES[code].skill
      return skill === 'S1' || skill === 'S2'
    })
  }
  return list
}

/** R3 + R4 + R5 — Áp một câu học vào trạng thái của từ. */
export function applyStageAttempt(state: WordState, attempt: StageAttempt): StageAttemptResult {
  const { stage } = state
  if (stage !== 2 && stage !== 4 && stage !== 5) {
    throw new Error(`Stage ${stage} không có câu tính điểm`)
  }
  if (!allowedExercises(stage, state.isKanaOnly).includes(attempt.exercise)) {
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
      const underCap = plusToday < RULES_V2.stagePoints.maxPositivePerStagePerDay
      delta = underCap ? raw : 0
      counted = underCap
    } else {
      delta = raw // trừ điểm không có trần
      counted = true
    }
  }

  let next: WordState = {
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

  if (!hasPassedStage(next)) {
    return { state: next, delta, counted, passedStage: null, cardsCreated: [] }
  }

  next = advance(next, stage)
  return { state: next, delta, counted, passedStage: stage, cardsCreated: cardsToCreate(stage, state.isKanaOnly) }
}

/** Stage 1 và 3: xem xong là qua. */
export function completeIntro(state: WordState): {
  state: WordState
  passedStage: Stage
  cardsCreated: CardType[]
} {
  const { stage } = state
  if (stage !== 1 && stage !== 3) {
    throw new Error(`Stage ${stage} không phải Stage giới thiệu`)
  }
  return {
    state: advance(state, stage),
    passedStage: stage,
    cardsCreated: cardsToCreate(stage, state.isKanaOnly),
  }
}

function advance(state: WordState, passed: Stage): WordState {
  return {
    ...state,
    stage: nextStage(passed, state.isKanaOnly),
    points: 0,
    plusToday: 0,
    plusDate: null,
    earned: [],
  }
}
