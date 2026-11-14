// V11 — Số câu Stage mỗi ngày theo độ chắc của từ (docs/learning-rules.md §0c). Pure.
// Độ chắc = stability của lịch Stage (FSRS): trả lời sai thì giảm, đúng liên tục thì tăng.
import { RULES_V9 } from '../learning/rules'

/** Từ yếu: hỏi đủ 3 câu và được ưu tiên trong bài. */
export function isWeak(stability: number): boolean {
  return stability < RULES_V9.ais.strength.weakBelow
}

/** Số câu tính điểm tối đa trong ngày: yếu 3, vừa 2, chắc 1. */
export function stagePerDayFor(stability: number): number {
  const { weakBelow, strongFrom } = RULES_V9.ais.strength
  if (stability < weakBelow) return RULES_V9.ais.stagePerDay
  return stability < strongFrom ? 2 : 1
}
