
import type { Outcome, Rating } from './types'

/** Sai là Again, đúng nhờ gợi ý là Hard, đúng là Good. Không có Easy. */
export function ratingOf(outcome: Outcome): Rating {
  if (outcome === 'wrong') return 'Again'
  return outcome === 'hint' ? 'Hard' : 'Good'
}
