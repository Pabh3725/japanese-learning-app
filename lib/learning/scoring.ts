// R2 — Chấm một câu. docs/learning-rules.md §4.

import { RULES_V4 } from './rules'
import type { Outcome, Rating } from './types'

/** R2.1 — Câu học → điểm stage thô (chưa xét giãn cách / trần ngày). */
export function scoreExercise(outcome: Outcome): number {
  return RULES_V4.stagePoints[outcome]
}

/** Sai là Again, đúng nhờ gợi ý là Hard, đúng là Good. Không có Easy. */
export function ratingOf(outcome: Outcome): Rating {
  if (outcome === 'wrong') return 'Again'
  return outcome === 'hint' ? 'Hard' : 'Good'
}
