// V12 §2–3: bộ thẻ trong ngày — trộn ngẫu nhiên, giữ các khoảng cách bắt buộc, áp trần, chia set. Pure.
import type { Area, CardType, ReviewCardType, Stage, Zone } from './card-types'
import { zoneOf } from './card-types'
import { RULES_V12 } from './rules'

type Rng = () => number

export type DeckCard =
  | { kind: 'intro'; key: string; area: Area; itemId: string }
  | { kind: 'stage'; key: string; area: Area; itemId: string; type: CardType; stage: Stage; retry?: boolean }
  | { kind: 'review'; key: string; area: Area; itemId: string; card: ReviewCardType; cardId: string; retry?: boolean }
  | { kind: 'star'; key: string; area: Area; itemId: string; type: CardType }

export interface NewItemInput {
  area: Area
  itemId: string
  /** Loại thẻ Stage 1, theo thứ tự hỏi. */
  stage1Types: readonly CardType[]
}

export interface StageItemInput {
  area: Area
  itemId: string
  stage: Stage
  /** Số lần dự kiến gặp hôm nay của từng loại thẻ (plannedShows). Stage 1 dở dang từ hôm trước cũng nằm ở đây. */
  types: readonly { type: CardType; shows: number }[]
}

export interface ReviewInput {
  area: Area
  itemId: string
  card: ReviewCardType
  cardId: string
  due: Date
}

export interface StarInput {
  area: Area
  itemId: string
  type: CardType
}

export interface DeckInput {
  newItems: readonly NewItemInput[]
  stageItems: readonly StageItemInput[]
  reviews: readonly ReviewInput[]
  stars?: readonly StarInput[]
}

const itemKey = (c: { area: Area; itemId: string }) => `${c.area}:${c.itemId}`

/** Số câu (không tính thẻ giới thiệu, câu sao) của phần đầu vào — đơn vị của trần (§2). */
export function countQuestions(input: DeckInput): number {
  return (
    input.newItems.reduce((n, i) => n + i.stage1Types.length, 0) +
    input.stageItems.reduce((n, i) => n + i.types.reduce((m, t) => m + t.shows, 0), 0) +
    input.reviews.length
  )
}

export interface CappedInput {
  input: DeckInput
  /** Phần chuyển sang hôm sau. */
  deferred: { newItems: number; stageItems: number; reviews: number }
}

/**
 * Áp trần một khu (§2): giữ trước mục đang học Stage (để không đứt mạch), rồi Card đến hạn sớm nhất, rồi mục mới.
 * Phần vượt trần chuyển sang hôm sau.
 */
export function applyCap(input: DeckInput, cap: number): CappedInput {
  let room = cap
  const take = <T>(list: readonly T[], cost: (x: T) => number): [T[], number] => {
    const kept: T[] = []
    let dropped = 0
    for (const x of list) {
      const c = cost(x)
      if (c <= room) {
        kept.push(x)
        room -= c
      } else dropped++
    }
    return [kept, dropped]
  }
  const [stageItems, ds] = take(input.stageItems, (i) => i.types.reduce((m, t) => m + t.shows, 0))
  const [reviews, dr] = take([...input.reviews].sort((a, b) => a.due.getTime() - b.due.getTime()), () => 1)
  const [newItems, dn] = take(input.newItems, (i) => i.stage1Types.length)
  return { input: { ...input, newItems, stageItems, reviews }, deferred: { newItems: dn, stageItems: ds, reviews: dr } }
}

/** Trần của bộ thẻ: một khu dùng trần của khu đó, "Học tất cả" dùng tổng (§2). */
export const capFor = (zones: readonly Zone[], caps: Record<Zone, number>) => zones.reduce((n, z) => n + caps[z], 0)

/** Chia đầu vào theo khu (để áp trần từng khu trước khi trộn "Học tất cả"). */
export function splitByZone(input: DeckInput): Record<Zone, DeckInput> {
  const of = (z: Zone): DeckInput => ({
    newItems: input.newItems.filter((i) => zoneOf(i.area) === z),
    stageItems: input.stageItems.filter((i) => zoneOf(i.area) === z),
    reviews: input.reviews.filter((i) => zoneOf(i.area) === z),
    stars: (input.stars ?? []).filter((i) => zoneOf(i.area) === z),
  })
  return { kana: of('kana'), kanji: of('kanji'), word_kanji: of('word_kanji') }
}

interface Pending {
  card: DeckCard
  /** Vị trí sớm nhất được đặt. */
  notBefore: number
  /** Vị trí bắt buộc (thẻ Stage 1 sau thẻ giới thiệu): tới vị trí này thì phải đặt. */
  due?: number
}

/**
 * Dựng bộ thẻ: trộn ngẫu nhiên các thẻ tự do; thẻ Stage 1 đi theo thẻ giới thiệu ở khoảng 0 / 5 / 10…;
 * hai lần gặp cùng loại thẻ trong ngày cách ít nhất 5 thẻ; tránh hai thẻ cùng mục đứng liền nhau khi có thể.
 * Câu từ có sao chèn tối đa `starPerSet` câu mỗi set.
 */
export function buildDeck(input: DeckInput, rng: Rng, setSize: number = RULES_V12.set.default): DeckCard[] {
  const gap = RULES_V12.retryAfter
  const { first, second, rest } = RULES_V12.stage1Gaps
  const free: Pending[] = []
  /** Lần gặp sau của cùng loại thẻ: mở khi lần trước đã đặt. */
  const followers = new Map<string, DeckCard[]>()
  /** Thẻ Stage 1 đi sau thẻ giới thiệu, theo thứ tự hỏi. */
  const chains = new Map<string, DeckCard[]>()

  for (const it of input.newItems) {
    const k = itemKey(it)
    free.push({ card: { kind: 'intro', key: `intro:${k}`, area: it.area, itemId: it.itemId }, notBefore: 0 })
    chains.set(
      `intro:${k}`,
      it.stage1Types.map((type) => ({ kind: 'stage', key: `s1:${k}:${type}`, area: it.area, itemId: it.itemId, type, stage: 1 })),
    )
  }
  for (const it of input.stageItems) {
    const k = itemKey(it)
    for (const { type, shows } of it.types) {
      const cards: DeckCard[] = Array.from({ length: shows }, (_, n) => ({ kind: 'stage', key: `s${it.stage}:${k}:${type}:${n}`, area: it.area, itemId: it.itemId, type, stage: it.stage }))
      if (cards.length === 0) continue
      free.push({ card: cards[0], notBefore: 0 })
      if (cards.length > 1) followers.set(cards[0].key, cards.slice(1))
    }
  }
  for (const r of input.reviews) free.push({ card: { kind: 'review', key: `rv:${r.cardId}`, area: r.area, itemId: r.itemId, card: r.card, cardId: r.cardId }, notBefore: 0 })

  // Thẻ giới thiệu có hạn chót: sau nó phải còn đủ chỗ cho chuỗi Stage 1 (khoảng 0 / 5 / 10…)
  const total = free.length + [...followers.values()].reduce((n, l) => n + l.length, 0) + [...chains.values()].reduce((n, l) => n + l.length, 0)
  const span = (n: number) => Array.from({ length: n }, (_, k) => 1 + (k === 0 ? first : k === 1 ? second : rest)).reduce((a, b) => a + b, 0)
  for (const p of free) {
    const chain = chains.get(p.card.key)
    if (chain) p.due = Math.max(0, total - 1 - span(chain.length))
  }

  const scheduled: Pending[] = []
  /** Vị trí trong chuỗi Stage 1 của thẻ vừa hẹn (−1: thẻ giới thiệu). */
  const chainIndex = new Map<string, number>()
  const out: DeckCard[] = []
  let lastItem = ''
  const place = (p: Pending) => {
    const i = out.length
    out.push(p.card)
    lastItem = itemKey(p.card)
    const chain = chains.get(p.card.key)
    if (chain && chain.length > 0) {
      // Thẻ giới thiệu → loại thứ nhất ngay sau, loại thứ hai sau 5 thẻ, các loại sau cách 10 thẻ.
      // Mỗi thẻ hẹn theo vị trí thật của thẻ trước nó (thẻ trước có thể bị lùi khi trùng chỗ).
      const n = chainIndex.get(p.card.key) ?? -1
      const offset = n === -1 ? first : n === 0 ? second : rest
      const [card, ...later] = chain
      chainIndex.set(card.key, n + 1)
      if (later.length > 0) chains.set(card.key, later)
      scheduled.push({ card, notBefore: i + 1 + offset, due: i + 1 + offset })
    }
    const next = followers.get(p.card.key)
    if (next && next.length > 0) {
      free.push({ card: next[0], notBefore: i + 1 + gap })
      if (next.length > 1) followers.set(next[0].key, next.slice(1))
    }
  }

  while (free.length > 0 || scheduled.length > 0) {
    const idx = out.length
    // Thẻ tới hạn bắt buộc (thẻ Stage 1 sau giới thiệu, hoặc thẻ giới thiệu tới hạn chót): đặt ngay, sớm nhất trước
    const forced = [...scheduled, ...free].filter((p) => p.due !== undefined && p.due <= idx).sort((a, b) => a.due! - b.due!)[0]
    if (forced) {
      const list = scheduled.includes(forced) ? scheduled : free
      list.splice(list.indexOf(forced), 1)
      place(forced)
      continue
    }
    const ready = free.filter((p) => p.notBefore <= idx)
    if (ready.length > 0) {
      const other = ready.filter((p) => itemKey(p.card) !== lastItem)
      const pool = other.length > 0 ? other : ready
      // Thẻ còn lượt gặp sau trong ngày được chọn sớm hơn, để lượt sau còn chỗ cách đủ 5 thẻ
      const weight = (p: Pending) => 1 + 3 * (followers.get(p.card.key)?.length ?? 0)
      let roll = rng() * pool.reduce((s, p) => s + weight(p), 0)
      const pick = pool.find((p) => (roll -= weight(p)) < 0) ?? pool[pool.length - 1]
      free.splice(free.indexOf(pick), 1)
      place(pick)
      continue
    }
    // Không còn thẻ tự do sẵn sàng: đặt thẻ bắt buộc sớm nhất, hoặc thẻ tự do mở sớm nhất (khoảng cách cuối bộ có thể ngắn lại)
    const candidates = [...scheduled.map((p) => ({ p, at: p.due!, list: scheduled })), ...free.map((p) => ({ p, at: p.notBefore, list: free }))].sort((a, b) => a.at - b.at)
    const { p, list } = candidates[0]
    list.splice(list.indexOf(p), 1)
    place(p)
  }

  return insertStars(out, input.stars ?? [], rng, setSize)
}

/** Câu từ có sao: tối đa `starPerSet` câu mỗi set, chèn vào vị trí ngẫu nhiên trong set (kế hoạch §7.2). */
function insertStars(deck: DeckCard[], stars: readonly StarInput[], rng: Rng, setSize: number): DeckCard[] {
  if (stars.length === 0) return deck
  const queue = stars.map((s, n) => ({ kind: 'star' as const, key: `star:${itemKey(s)}:${s.type}:${n}`, area: s.area, itemId: s.itemId, type: s.type }))
  const out: DeckCard[] = []
  const sets = Math.max(1, Math.ceil(deck.length / setSize))
  for (let s = 0; s < sets; s++) {
    const chunk = deck.slice(s * setSize, (s + 1) * setSize)
    for (let n = 0; n < RULES_V12.starPerSet && queue.length > 0; n++) chunk.splice(Math.floor(rng() * (chunk.length + 1)), 0, queue.shift()!)
    out.push(...chunk)
  }
  return out
}

/**
 * Chèn lượt hỏi lại sau khi sai (§3.1, §3.3): sau `after` thẻ tính từ vị trí vừa trả lời; hết bộ thì đặt cuối.
 * Set chỉ là cửa sổ trên dãy thẻ, nên lượt hỏi lại vượt cuối set sẽ rơi sang set sau.
 */
export function insertRetry(deck: readonly DeckCard[], answeredAt: number, card: DeckCard, after: number = RULES_V12.retryAfter): DeckCard[] {
  const at = Math.min(deck.length, answeredAt + 1 + after)
  const retry = { ...card, key: `${card.key}:r${answeredAt}`, retry: true } as DeckCard
  return [...deck.slice(0, at), retry, ...deck.slice(at)]
}

/** Khoảng hỏi lại Card sai: 3–5 thẻ (§3.3). */
export const reviewRetryGap = (rng: Rng) => RULES_V12.reviewRetry.min + Math.floor(rng() * (RULES_V12.reviewRetry.max - RULES_V12.reviewRetry.min + 1))

/** Số set và set của một vị trí. */
export const setCount = (deckLength: number, setSize: number) => Math.ceil(deckLength / setSize)
export const setOf = (index: number, setSize: number) => Math.floor(index / setSize)
