import { shuffle } from './learning-engine'
import { vocabulary } from './mock-data'
import type { VocabItem } from './types'

export const BOARD_SIZE = 5

export interface MatchBoard {
  left: string[]
  right: string[]
  queue: string[]
  round: number
}

export function getVocab(id: string): VocabItem {
  return vocabulary.find((v) => v.id === id)!
}

export function createBoard(seed = 'start'): MatchBoard {
  const order = shuffle(vocabulary.map((v) => v.id), `match-${seed}`)
  const visible = order.slice(0, BOARD_SIZE)
  return {
    left: visible,
    right: shuffle(visible, `match-${seed}-right`),
    queue: order.slice(BOARD_SIZE),
    round: 0,
  }
}

/** Replaces a matched pair in place with the next word, keeping the columns stable. */
export function replacePair(board: MatchBoard, id: string): MatchBoard {
  let queue = board.queue
  if (queue.length === 0) {
    const onBoard = new Set(board.left)
    queue = shuffle(vocabulary.map((v) => v.id).filter((v) => !onBoard.has(v)), `refill-${board.round}`)
  }
  const [next, ...rest] = queue
  return {
    left: board.left.map((v) => (v === id ? next : v)),
    right: board.right.map((v) => (v === id ? next : v)),
    queue: [...rest, id],
    round: board.round + 1,
  }
}
