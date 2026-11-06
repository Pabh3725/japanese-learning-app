import type { CardType } from './learning/types'

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
/** Số từ gửi xuống mỗi chế độ, đủ cho một lượt chơi rất nhanh. */
const WORDS_PER_MODE = 100

/** Hỗn hợp: Kana hoặc Kanji tùy từ đã học tới đâu. Còn lại là luyện đúng một loại Card. */
export type SpeedMode = 'mixed' | CardType

export const SPEED_MODES: readonly SpeedMode[] = [
  'mixed',
  'vocab.meaning_kana',
  'vocab.meaning_kanji',
  'vocab.kana_hanviet',
  'vocab.meaning_hanviet',
  'vocab.kanji_meaning_hanviet',
]

export function isSpeedMode(value: unknown): value is SpeedMode {
  return SPEED_MODES.includes(value as SpeedMode)
}

/** Card nhận điểm của một từ trong chế độ này. */
export function cardTypeFor(mode: SpeedMode, showsKanji: boolean): CardType {
  if (mode !== 'mixed') return mode
  return showsKanji ? 'vocab.meaning_kanji' : 'vocab.meaning_kana'
}

const SKILL_OF: Record<CardType, 'kana' | 'kanji' | 'han_viet'> = {
  'vocab.meaning_kana': 'kana',
  'vocab.meaning_kanji': 'kanji',
  'vocab.kana_hanviet': 'han_viet',
  'vocab.meaning_hanviet': 'han_viet',
  'vocab.kanji_meaning_hanviet': 'kanji',
}

export function skillOf(type: CardType) {
  return SKILL_OF[type]
}

export interface SpeedWord {
  id: string
  word: string
  meaning: string
  /** Ô "word" là chữ Nhật. Chế độ nghĩa ↔ Hán Việt thì không. */
  wordIsJapanese: boolean
}

export interface SpeedTile {
  /** Duy nhất trên bàn. */
  key: string
  wordId: string
  kind: 'word' | 'meaning'
  label: string
  isJapanese: boolean
}

export interface MatchBoard {
  tiles: SpeedTile[]
  /** Từ chưa ra, dùng cho các bàn sau. */
  deck: string[]
  round: number
}

/** Dữ liệu một từ của người học, đọc từ database. */
export interface SpeedWordSource {
  id: string
  expression: string
  kana: string
  meaning: string
  hanViet: string | null
  isKanaOnly: boolean
  kanjiSeen: boolean
  cards: {
    type: CardType
    retired: boolean
    lastReviewAt: string | null
    practiceDate: string | null
    practiceToday: number
  }[]
}

export interface SpeedModeData {
  mode: SpeedMode
  /** Số từ chơi được, sau khi bỏ từ trùng. */
  total: number
  words: SpeedWord[]
}

function sidesFor(source: SpeedWordSource, mode: SpeedMode, showsKanji: boolean): Pick<SpeedWord, 'word' | 'meaning' | 'wordIsJapanese'> | null {
  const hanViet = source.hanViet
  switch (mode) {
    case 'mixed':
      return { word: showsKanji ? source.expression : source.kana, meaning: source.meaning, wordIsJapanese: true }
    case 'vocab.meaning_kana':
      return { word: source.kana, meaning: source.meaning, wordIsJapanese: true }
    case 'vocab.meaning_kanji':
      return { word: source.expression, meaning: source.meaning, wordIsJapanese: true }
    case 'vocab.kana_hanviet':
      return hanViet ? { word: source.kana, meaning: hanViet, wordIsJapanese: true } : null
    case 'vocab.meaning_hanviet':
      return hanViet ? { word: hanViet, meaning: source.meaning, wordIsJapanese: false } : null
    case 'vocab.kanji_meaning_hanviet':
      return hanViet ? { word: source.expression, meaning: `${source.meaning} · ${hanViet}`, wordIsJapanese: true } : null
  }
}

/**
 * Từ của một chế độ, theo thứ tự ra bàn: Card lâu chưa ôn nhất trước (chưa ôn lần nào coi như lâu nhất).
 * Card đã chạm trần điểm hôm nay xuống sau vì chơi tiếp không được thêm điểm;
 * từ không có Card xuống cuối, và chỉ chế độ Hỗn hợp mới có.
 */
export function wordsForMode(sources: readonly SpeedWordSource[], mode: SpeedMode, today: string, capPerDay: number): SpeedModeData {
  const ranked = sources.flatMap((source) => {
    const showsKanji = source.kanjiSeen && !source.isKanaOnly
    const usesKanji = mode === 'vocab.meaning_kanji' || mode === 'vocab.kanji_meaning_hanviet'
    if (usesKanji && !showsKanji) return []
    const sides = sidesFor(source, mode, showsKanji)
    if (!sides) return []
    const type = cardTypeFor(mode, showsKanji)
    const card = source.cards.find((c) => c.type === type && !c.retired)
    if (!card && mode !== 'mixed') return []
    const capped = card !== undefined && card.practiceDate === today && card.practiceToday >= capPerDay
    return [{
      word: { id: source.id, ...sides },
      rank: !card ? 2 : capped ? 1 : 0,
      lastReview: card?.lastReviewAt ?? '',
    }]
  })
  ranked.sort((a, b) => a.rank - b.rank || a.lastReview.localeCompare(b.lastReview))
  const words = uniqueSpeedWords(ranked.map((r) => r.word))
  return { mode, total: words.length, words: words.slice(0, WORDS_PER_MODE) }
}

/** Bỏ từ trùng chữ hoặc trùng nghĩa, vì hai ô giống nhau thì người chơi không thể biết ô nào đúng. */
export function uniqueSpeedWords<T extends Pick<SpeedWord, 'word' | 'meaning'>>(words: readonly T[]): T[] {
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
      { key: `w-${id}`, wordId: id, kind: 'word', label: word.word, isJapanese: word.wordIsJapanese },
      { key: `m-${id}`, wordId: id, kind: 'meaning', label: word.meaning, isJapanese: false },
    ]
  })
  return { tiles: shuffle(tiles, `tiles-${seed}-${round}`), deck: rest, round }
}

/** Bàn đầu lấy từ đầu danh sách, nên giữ đúng thứ tự ưu tiên của `words`. */
export function createBoard(words: readonly SpeedWord[], seed = 'start'): MatchBoard {
  return deal(words, words.map((w) => w.id), seed, 1)
}

/** Bàn tiếp theo, sau khi đã ghép hết bàn hiện tại. */
export function nextBoard(words: readonly SpeedWord[], board: MatchBoard, seed = 'start'): MatchBoard {
  return deal(words, board.deck, seed, board.round + 1)
}
