// SES-01, SES-02 — Chia phiên và trộn câu của khu Learn. Pure.
import { RULES_V4 } from '../learning/rules'
import type { Rng } from '../exercise/questions'

/** Mỗi phiên khoảng 5 phút. */
export const QUESTIONS_PER_SESSION = 20
export const INTROS_PER_SESSION = 5

/** Số phiên cần để làm hết số câu còn lại. */
export function sessionsFor(questionCount: number): number {
  return Math.ceil(Math.max(0, questionCount) / QUESTIONS_PER_SESSION)
}

/** Cứ khoảng 25 câu thì có một vòng boss (R7). */
const QUESTIONS_PER_BOSS = 25
/** Vòng boss cần đủ từ khác nhau để ghép 6 cặp. */
const MIN_WORDS_FOR_BOSS = 6

/** Phiên này có đi qua mốc 25, 50, 75… câu trong ngày không. */
export function shouldAddBossRound(answeredToday: number, questionsInSession: number, wordsInSession: number): boolean {
  if (wordsInSession < MIN_WORDS_FOR_BOSS) return false
  return Math.floor((answeredToday + questionsInSession) / QUESTIONS_PER_BOSS) > Math.floor(answeredToday / QUESTIONS_PER_BOSS)
}

export type NewWordsBlock = 'cards' | 'stage' | null

/** Từ mới dừng khi Card đến hạn đạt ngưỡng, hoặc câu Stage đến hẹn đạt trần. */
export function newWordsBlockedBy(counts: { cardsDue: number; unlockThreshold: number; stageDue: number; stageCap: number }): NewWordsBlock {
  if (counts.cardsDue >= counts.unlockThreshold) return 'cards'
  return counts.stageDue >= counts.stageCap ? 'stage' : null
}

interface MixItem {
  wordId: string
  exercise: string
}

const MIX_ATTEMPTS = 30

/** Một lần xếp: giữ gần thứ tự ưu tiên, nhưng chọn câu không vi phạm luật nếu có thể. */
function arrange<T extends MixItem>(items: readonly T[], rng: Rng): T[] {
  const gap = RULES_V4.spacing.minGap
  // Xáo nhẹ để các phiên không lặp một nếp; câu ưu tiên vẫn nằm ở nửa đầu
  const left = items
    .map((item, i) => ({ item, order: i + rng() * 4 }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.item)
  const out: T[] = []
  while (left.length > 0) {
    const last = out[out.length - 1]
    const recent = new Set(out.slice(-gap).map((item) => item.wordId))
    const spaced = (item: T) => !recent.has(item.wordId)
    const differs = (item: T) => item.exercise !== last?.exercise
    let index = left.findIndex((item) => spaced(item) && differs(item))
    if (index === -1) index = left.findIndex(spaced)
    if (index === -1) index = left.findIndex(differs)
    if (index === -1) index = 0
    out.push(left.splice(index, 1)[0])
  }
  return out
}

/** Điểm phạt: gần nhau quá làm câu mất điểm nên nặng hơn hẳn 2 câu cùng dạng liền nhau. */
function violations(list: readonly MixItem[]): number {
  const gap = RULES_V4.spacing.minGap
  let total = 0
  list.forEach((item, i) => {
    if (i > 0 && list[i - 1].exercise === item.exercise) total += 1
    if (list.slice(Math.max(0, i - gap), i).some((other) => other.wordId === item.wordId)) total += 100
  })
  return total
}

/**
 * Trộn câu: cùng một từ cách ít nhất 4 câu (cách gần hơn sẽ không được điểm), không có 2 câu cùng dạng liền nhau.
 * Xếp tham lam có thể kẹt ở cuối danh sách nên thử nhiều lần và giữ cách tốt nhất.
 */
export function mixQuestions<T extends MixItem>(items: readonly T[], rng: Rng = Math.random): T[] {
  let best = arrange(items, rng)
  let bestScore = violations(best)
  for (let attempt = 1; attempt < MIX_ATTEMPTS && bestScore > 0; attempt++) {
    const next = arrange(items, rng)
    const score = violations(next)
    if (score < bestScore) {
      best = next
      bestScore = score
    }
  }
  return best
}
