function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic shuffle so server and client renders match. */
function shuffle<T>(items: T[], seed: string): T[] {
  const random = seededRandom(hashString(seed))
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Lưới 4×4: 8 cặp, 16 ô. */
export const PAIRS_PER_BOARD = 8
/** Mỗi bàn cần 8 từ khác nhau. */
export const MIN_SPEED_WORDS = PAIRS_PER_BOARD

export interface SpeedWord {
  id: string
  word: string
  meaning: string
}

export interface SpeedTile {
  /** Duy nhất trên bàn. */
  key: string
  wordId: string
  kind: 'word' | 'meaning'
  label: string
}

export interface MatchBoard {
  tiles: SpeedTile[]
  /** Từ chưa ra, dùng cho các bàn sau. */
  deck: string[]
  round: number
}

/** Bỏ từ trùng chữ hoặc trùng nghĩa, vì hai ô giống nhau thì người chơi không thể biết ô nào đúng. */
export function uniqueSpeedWords(words: readonly SpeedWord[]): SpeedWord[] {
  const seen = new Set<string>()
  return words.filter((w) => {
    const keys = [`w:${w.word}`, `m:${w.meaning}`]
    if (keys.some((k) => seen.has(k))) return false
    keys.forEach((k) => seen.add(k))
    return true
  })
}

function deal(words: readonly SpeedWord[], deck: readonly string[], seed: string, round: number): MatchBoard {
  const taken = deck.slice(0, PAIRS_PER_BOARD)
  let rest = deck.slice(PAIRS_PER_BOARD)
  // Hết từ thì trộn lại cả bộ, bỏ các từ đang có trên bàn để một bàn không có từ lặp
  if (taken.length < PAIRS_PER_BOARD) {
    const reshuffled = shuffle(words.map((w) => w.id).filter((id) => !taken.includes(id)), `deck-${seed}-${round}`)
    const missing = PAIRS_PER_BOARD - taken.length
    taken.push(...reshuffled.slice(0, missing))
    rest = [...reshuffled.slice(missing), ...shuffle(words.map((w) => w.id).filter((id) => deck.includes(id)), `tail-${seed}-${round}`)]
  }
  const byId = new Map(words.map((w) => [w.id, w]))
  const tiles = taken.flatMap((id): SpeedTile[] => {
    const word = byId.get(id)!
    return [
      { key: `w-${id}`, wordId: id, kind: 'word', label: word.word },
      { key: `m-${id}`, wordId: id, kind: 'meaning', label: word.meaning },
    ]
  })
  return { tiles: shuffle(tiles, `tiles-${seed}-${round}`), deck: rest, round }
}

export function createBoard(words: readonly SpeedWord[], seed = 'start'): MatchBoard {
  return deal(words, shuffle(words.map((w) => w.id), `order-${seed}`), seed, 1)
}

/** Bàn tiếp theo, sau khi đã ghép hết bàn hiện tại. */
export function nextBoard(words: readonly SpeedWord[], board: MatchBoard, seed = 'start'): MatchBoard {
  return deal(words, board.deck, seed, board.round + 1)
}
