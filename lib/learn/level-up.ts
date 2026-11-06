import type { WordReveal } from '../exercise/stage-questions'
import type { ScoredStage, Stage } from '../learning/types'

export interface LevelUp {
  title: string
  body: string
  reveal: WordReveal
}

/** Thẻ chúc mừng khi câu vừa trả lời hoàn tất stage hoặc mở stage sau. Không có mốc mới thì trả null. */
export function levelUpOf(
  stage: ScoredStage,
  result: { completed: boolean; unlockedStage: Stage | null; cardsCreated: readonly unknown[] } | undefined,
  reveal: WordReveal | undefined,
): LevelUp | null {
  if (!result || !reveal) return null
  const cards = result.cardsCreated.length
  const cardsNote = cards > 0 ? ` ${cards} new review ${cards === 1 ? 'card' : 'cards'} added.` : ''
  if (result.completed) return { title: `Stage ${stage} complete!`, body: `Great work on this word.${cardsNote}`, reveal }
  if (result.unlockedStage) return { title: `Stage ${result.unlockedStage} unlocked!`, body: `This word moves on, and Stage ${stage} continues.${cardsNote}`, reveal }
  return null
}
