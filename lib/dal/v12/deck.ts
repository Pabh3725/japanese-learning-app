// V12 §2: bộ thẻ trong ngày — mở mục mới, dựng / lưu bộ thẻ, phục vụ từng thẻ, chấm ở server, hỏi lại. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readAllKanjiCached, readKanjiVisuals } from '@/lib/dal/kanji-content'
import { revealOf, type KanjiReveal } from '@/lib/kanji/questions'
import { nextStudyDayStart, studyDate } from '@/lib/learning/time'
import { STAGE_TYPES, typesFor, ZONES, zoneOf, type Area, type CardType, type ReviewCardType, type Zone } from '@/lib/v12/card-types'
import { applyCap, buildDeck, countQuestions, insertRetry, reviewRetryGap, splitByZone, type DeckCard, type DeckInput } from '@/lib/v12/deck'
import { balanceTarget } from '@/lib/v12/balance'
import { forecast, overflowDays, type ForecastDay } from '@/lib/v12/forecast'
import type { Progress } from '@/lib/v12/order'
import { key, pausedZones, planNewItems, type PlanResult } from '@/lib/v12/plan'
import { buildReviewCard, buildStageQuestion, gradeCard, gradeQuestion, type Pools, type Question } from '@/lib/v12/questions'
import { canShow, isActive, plannedShows, remainingTypes } from '@/lib/v12/stage'
import { readV12Content, type V12Content } from './content'
import { readV12Settings, type V12Settings } from './settings'
import { readV12State, type CardRow, type ItemRow } from './state'
import { markIntroSeen, openItem, saveCardReview, saveStageAnswer, saveStarAnswer, setRadicalsKnown } from './write'

type Supabase = Awaited<ReturnType<typeof createClient>>
export type Scope = Zone | 'all'
export const isScope = (v: unknown): v is Scope => v === 'all' || ZONES.includes(v as Zone)
const zonesOf = (scope: Scope): readonly Zone[] => (scope === 'all' ? ZONES : [scope])

interface Loaded {
  content: V12Content
  items: ItemRow[]
  cards: CardRow[]
  knownWords: Set<string>
  knownKanji: Set<string>
  starred: Set<string>
  settings: V12Settings
}

async function load(supabase: Supabase, userId: string): Promise<Loaded> {
  const [content, state, settings] = await Promise.all([readV12Content(supabase), readV12State(supabase, userId), readV12Settings(supabase, userId)])
  return { content, ...state, settings }
}

/** Tiến độ theo khoá `${area}:${ref}`. Mục "đã biết" (kể cả từ / chữ chưa mở) coi như đã học xong. */
function progressOf(l: Pick<Loaded, 'items' | 'knownWords' | 'knownKanji'>): Map<string, Progress> {
  const p = new Map<string, Progress>()
  for (const id of l.knownWords) {
    p.set(key('kana', id), 'review')
    p.set(key('word_kanji', id), 'review')
  }
  for (const id of l.knownKanji) p.set(key('kanji', id), 'review')
  for (const i of l.items) p.set(key(i.area, i.ref), i.known ? 'review' : i.stage)
  return p
}

/** Số câu tồn của từng khu hôm nay: câu Stage đến lượt + Card đến hạn (không tính mục mới). */
function zoneLoad(l: Loaded, now: Date): Record<Zone, number> {
  const split = splitByZone(deckInput(l, ZONES, now))
  return { kana: countQuestions({ ...split.kana, newItems: [] }), kanji: countQuestions({ ...split.kanji, newItems: [] }), word_kanji: countQuestions({ ...split.word_kanji, newItems: [] }) }
}

function plan(l: Loaded, now: Date): PlanResult & { paused: Record<Zone, boolean> } {
  const today = studyDate(now)
  const paused = pausedZones(zoneLoad(l, now), l.settings.caps)
  const openedToday: Record<Area, number> = { kana: 0, radical: 0, kanji: 0, word_kanji: 0 }
  for (const i of l.items) if (i.createdOn === today) openedToday[i.area]++
  const carry = (l.settings.balanceCarry as { date?: string; in?: Record<string, number> }).date === today ? (l.settings.balanceCarry as { in?: Record<string, number> }).in : (l.settings.balanceCarry as { out?: Record<string, number> }).out
  const result = planNewItems({
    today,
    words: l.content.words,
    radicals: l.content.radicals.map((r) => r.number),
    kanji: l.content.kanji.map((k) => ({ ...k, character: k.char })),
    wordKanji: l.content.wordKanji.map((w) => ({ id: w.id, level: w.level, sortOrder: l.content.words.find((x) => x.id === w.id)?.sortOrder ?? 0, kanaOnly: false, kanji: w.kanji })),
    progress: progressOf(l),
    openedToday,
    balanceOn: l.settings.balanceOn,
    target: balanceTarget(l.settings.balanceTarget, l.settings.balanceDate, l.settings.balanceMinutes, today),
    manual: l.settings.newPerDay,
    carry: carry ?? {},
    paused,
  })
  return { ...result, paused }
}

/** Mở các mục mới hôm nay của các khu trong phạm vi; lưu phần lẻ cân bằng của ngày. */
async function openNewItems(supabase: Supabase, userId: string, l: Loaded, scope: Scope, now: Date): Promise<boolean> {
  const today = studyDate(now)
  const p = plan(l, now)
  const zones = zonesOf(scope)
  const jobs: Promise<unknown>[] = []
  const similar = new Set(l.content.kanji.filter((k) => k.similar.length > 0).map((k) => k.id))
  if (zones.includes('kana')) for (const id of p.open.kana) jobs.push(openItem(supabase, 'kana', { vocabularyId: id }, now))
  if (zones.includes('kanji')) {
    for (const n of p.open.radical) jobs.push(openItem(supabase, 'radical', { radicalNumber: n }, now))
    for (const id of p.open.kanji) jobs.push(openItem(supabase, 'kanji', { kanjiId: id }, now, similar.has(id)))
  }
  if (zones.includes('word_kanji')) for (const id of p.open.word_kanji) jobs.push(openItem(supabase, 'word_kanji', { vocabularyId: id }, now))
  await Promise.all(jobs)
  const stored = l.settings.balanceCarry as { date?: string }
  if (p.balance && stored.date !== today) {
    const prevOut = (l.settings.balanceCarry as { out?: Record<string, number> }).out ?? {}
    await supabase.from('learner_settings').upsert({ user_id: userId, balance_carry: { date: today, in: prevOut, out: p.balance.carry } }, { onConflict: 'user_id' })
  }
  return jobs.length > 0
}

/** Đầu vào bộ thẻ hôm nay của các khu (§2): mục mới (thẻ giới thiệu + Stage 1), câu Stage đến lượt, Card đến hạn. */
function deckInput(l: Loaded, zones: readonly Zone[], now: Date): DeckInput {
  const today = studyDate(now)
  const dueBefore = nextStudyDayStart(now).getTime()
  const inZones = (area: Area) => zones.includes(zoneOf(area))
  const live = l.items.filter((i) => !i.known && inZones(i.area))
  const newItems = live
    .filter((i) => i.stage === 1 && !i.introSeen && isActive(i.state, today))
    .map((i) => ({ area: i.area, itemId: i.id, stage1Types: typesFor(i.area, 1, { hasSimilar: i.state.hasSimilar }).filter((t) => remainingTypes(i.state).includes(t)) }))
  const stageItems = live
    .filter((i) => i.stage !== 'review' && isActive(i.state, today) && (i.stage !== 1 || i.introSeen))
    .map((i) => ({ area: i.area, itemId: i.id, stage: i.stage as 1 | 2 | 3, types: (Object.keys(i.state.types) as CardType[]).map((type) => ({ type, shows: plannedShows(i.state, type, today) })).filter((t) => t.shows > 0) }))
    .filter((i) => i.types.length > 0)
  const byId = new Map(live.map((i) => [i.id, i]))
  const reviews = l.cards
    .filter((c) => !c.archived && c.schedule.due.getTime() < dueBefore && byId.has(c.itemId))
    .map((c) => ({ area: byId.get(c.itemId)!.area, itemId: c.itemId, card: c.type, cardId: c.id, due: c.schedule.due }))
  // Từ / chữ có sao đã gặp (qua thẻ giới thiệu): mỗi mục một câu học thêm mỗi ngày, loại thẻ Stage 2 ngẫu nhiên
  const stars = live
    .filter((i) => l.starred.has(i.ref) && (i.stage !== 1 || i.introSeen))
    .map((i) => {
      const types = STAGE_TYPES[i.area][2]
      return { area: i.area, itemId: i.id, type: types[Math.floor(Math.random() * types.length)] }
    })
  return { newItems, stageItems, reviews, stars }
}

interface DeckRow {
  id: string
  cards: DeckCard[]
  position: number
  deferred: Record<string, number>
  version: number
}

async function readDeck(supabase: Supabase, userId: string, today: string, scope: Scope): Promise<DeckRow | null> {
  const { data, error } = await supabase.from('daily_decks').select('id, cards, position, deferred, version').eq('user_id', userId).eq('study_date', today).eq('scope', scope).maybeSingle()
  if (error) throw new Error(`Không đọc được daily_decks: ${error.message}`)
  return (data as DeckRow | null) ?? null
}

/** Bộ thẻ hôm nay của phạm vi: có thì dùng lại; chưa có thì mở mục mới, dựng, áp trần từng khu, lưu. */
async function ensureDeck(supabase: Supabase, userId: string, scope: Scope, now: Date): Promise<{ deck: DeckRow; loaded: Loaded }> {
  const today = studyDate(now)
  let loaded = await load(supabase, userId)
  const existing = await readDeck(supabase, userId, today, scope)
  if (existing) return { deck: existing, loaded }
  if (await openNewItems(supabase, userId, loaded, scope, now)) loaded = await load(supabase, userId)
  const zones = zonesOf(scope)
  const split = splitByZone(deckInput(loaded, zones, now))
  const merged: DeckInput = { newItems: [], stageItems: [], reviews: [], stars: [] }
  const deferred: Record<string, number> = {}
  for (const z of zones) {
    const capped = applyCap(split[z], loaded.settings.caps[z])
    merged.newItems = [...merged.newItems, ...capped.input.newItems]
    merged.stageItems = [...merged.stageItems, ...capped.input.stageItems]
    merged.reviews = [...merged.reviews, ...capped.input.reviews]
    merged.stars = [...merged.stars!, ...(split[z].stars ?? [])]
    deferred[z] = capped.deferred.newItems + capped.deferred.stageItems + capped.deferred.reviews
  }
  const cards = buildDeck(merged, Math.random, loaded.settings.setSize)
  const { error } = await supabase.from('daily_decks').insert({ user_id: userId, study_date: today, scope, cards, position: 0, deferred })
  if (error && error.code !== '23505') throw new Error(`Không tạo được daily_decks: ${error.message}`)
  return { deck: (await readDeck(supabase, userId, today, scope))!, loaded }
}

// ---------------------------------------------------------------------------
// Dữ liệu từng thẻ
// ---------------------------------------------------------------------------

function pools(c: V12Content): Pools {
  const n5n4 = (level: number | null) => level === 5 || level === 4
  return {
    kana: c.words.filter((w) => n5n4(w.level)),
    radical: c.radicals,
    kanji: c.kanji.filter((k) => n5n4(k.level)),
    word_kanji: c.wordKanji.filter((w) => n5n4(w.level)),
  }
}

function itemData(l: Loaded, item: ItemRow) {
  switch (item.area) {
    case 'kana':
      return l.content.words.find((w) => w.id === item.ref)
    case 'radical':
      return l.content.radicals.find((r) => r.id === item.ref)
    case 'kanji':
      return l.content.kanji.find((k) => k.id === item.ref)
    case 'word_kanji':
      return l.content.wordKanji.find((w) => w.id === item.ref)
  }
}

/** Thẻ còn hợp lệ không (đã trả lời ở bộ thẻ khác, đủ điểm, Card đã ôn hôm nay…). */
function isValid(l: Loaded, card: DeckCard, now: Date): boolean {
  const item = l.items.find((i) => i.id === card.itemId)
  if (!item || item.known) return false
  if (card.kind === 'intro') return item.stage === 1 && !item.introSeen
  if (card.kind === 'stage') return item.stage === card.stage && canShow(item.state, card.type, studyDate(now))
  if (card.kind === 'review') {
    const c = l.cards.find((x) => x.id === card.cardId)
    return !!c && !c.archived && (card.retry === true || c.schedule.due.getTime() < nextStudyDayStart(now).getTime())
  }
  if (card.kind === 'star') return l.starred.has(item.ref)
  return false
}

export type PublicQuestion = Question extends infer Q ? (Q extends { answer: unknown } ? Omit<Q, 'answer'> : never) : never
const strip = (q: Question): PublicQuestion => {
  const { answer: _a, ...rest } = q
  return rest as PublicQuestion
}

export type IntroView =
  | { area: 'kana'; kana: string; meaning: string; hanViet: string | null }
  | { area: 'radical'; char: string; name: string; meaning: string; examples: string }
  | { area: 'kanji'; reveal: KanjiReveal }
  | { area: 'word_kanji'; expression: string; kana: string; hanViet: string; meaning: string }

export type CardView =
  | { kind: 'intro'; position: number; area: Area; intro: IntroView }
  | { kind: 'stage'; position: number; area: Area; type: CardType; stage: 1 | 2 | 3; retry: boolean; question: PublicQuestion }
  | { kind: 'star'; position: number; area: Area; type: CardType; question: PublicQuestion }
  | { kind: 'review'; position: number; area: Area; card: ReviewCardType; cardId: string; retry: boolean; prompt: string; promptKind: string; speak?: string; parts: { part: string; question: PublicQuestion }[] }

export interface DeckView {
  scope: Scope
  total: number
  position: number
  setSize: number
  deferred: Record<string, number>
  card: CardView | null
}

async function viewOf(supabase: Supabase, l: Loaded, card: DeckCard, position: number): Promise<CardView | null> {
  const item = l.items.find((i) => i.id === card.itemId)!
  const data = itemData(l, item)
  if (!data) return null
  const p = pools(l.content)
  if (card.kind === 'intro') {
    let intro: IntroView
    if (item.area === 'kana') {
      const w = data as V12Content['words'][number]
      intro = { area: 'kana', kana: w.kana, meaning: w.meaning, hanViet: w.hanViet }
    } else if (item.area === 'radical') {
      const r = data as V12Content['radicals'][number]
      const examples = l.content.kanji.filter((k) => k.radicals.includes(r.number) && (k.level === 5 || k.level === 4)).slice(0, 3).map((k) => k.char).join('')
      intro = { area: 'radical', char: r.char, name: r.name, meaning: r.meaning, examples }
    } else if (item.area === 'kanji') {
      const row = (await readAllKanjiCached(supabase)).find((k) => k.id === item.ref)!
      const visual = (await readKanjiVisuals(supabase, [item.ref])).get(item.ref)
      intro = { area: 'kanji', reveal: { ...revealOf(row, true), ...(visual ? { visual } : {}) } }
    } else {
      const w = data as V12Content['wordKanji'][number]
      intro = { area: 'word_kanji', expression: w.expression, kana: w.kana, hanViet: w.hanViet, meaning: w.meaning }
    }
    return { kind: 'intro', position, area: item.area, intro }
  }
  if (card.kind === 'stage') return { kind: 'stage', position, area: item.area, type: card.type, stage: card.stage, retry: card.retry === true, question: strip(buildStageQuestion(card.type, data, p, Math.random)) }
  if (card.kind === 'star') return { kind: 'star', position, area: item.area, type: card.type, question: strip(buildStageQuestion(card.type, data, p, Math.random)) }
  if (card.kind === 'review') {
    const built = buildReviewCard(card.card, data, p, Math.random)
    return { kind: 'review', position, area: item.area, card: card.card, cardId: card.cardId, retry: card.retry === true, prompt: built.prompt, promptKind: built.promptKind, speak: built.speak, parts: built.parts.map((x) => ({ part: x.part, question: strip(x.question) })) }
  }
  return null
}

/** Thẻ hiện tại của bộ thẻ (bỏ qua thẻ không còn hợp lệ, lưu vị trí mới). */
export async function getDeck(scope: unknown): Promise<DeckView | null> {
  if (!isScope(scope)) return null
  const user = await requireUser()
  const supabase = await createClient()
  const now = new Date()
  const { deck, loaded } = await ensureDeck(supabase, user.id, scope, now)
  let position = deck.position
  while (position < deck.cards.length && !isValid(loaded, deck.cards[position], now)) position++
  if (position !== deck.position) await supabase.from('daily_decks').update({ position, version: deck.version + 1 }).eq('id', deck.id).eq('version', deck.version)
  const card = position < deck.cards.length ? await viewOf(supabase, loaded, deck.cards[position], position) : null
  return { scope, total: deck.cards.length, position, setSize: loaded.settings.setSize, deferred: deck.deferred, card }
}

export interface AnswerView {
  status: 'graded' | 'conflict' | 'invalid'
  correct?: boolean
  /** Đáp án đúng (một hoặc nhiều phần). */
  answers?: string[]
  /** Kana để đọc lại sau khi chấm. */
  speak?: string
  stageDone?: boolean
  cardsCreated?: number
  retry?: boolean
}

/** Chấm một thẻ ở server rồi lưu; sai thì chèn lượt hỏi lại; tiến vị trí. Thẻ giới thiệu: đánh dấu đã xem. */
export async function answerDeck(input: unknown): Promise<AnswerView> {
  const v = (input ?? {}) as { scope?: unknown; position?: unknown; given?: unknown; elapsedMs?: unknown; clientEventId?: unknown }
  if (!isScope(v.scope) || !Number.isInteger(v.position) || typeof v.clientEventId !== 'string') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const now = new Date()
  const deck = await readDeck(supabase, user.id, studyDate(now), v.scope)
  if (!deck || deck.position !== v.position || (v.position as number) >= deck.cards.length) return { status: 'conflict' }
  const loaded = await load(supabase, user.id)
  const card = deck.cards[deck.position]
  if (!isValid(loaded, card, now)) return { status: 'conflict' }
  const item = loaded.items.find((i) => i.id === card.itemId)!
  const data = itemData(loaded, item)!
  const elapsedMs = typeof v.elapsedMs === 'number' ? v.elapsedMs : 0
  let cards = deck.cards
  let out: AnswerView = { status: 'graded' }

  if (card.kind === 'intro') {
    await markIntroSeen(supabase, user.id, item.id, now)
  } else if (card.kind === 'stage') {
    const q = buildStageQuestion(card.type, data, pools(loaded.content), Math.random)
    const correct = gradeQuestion(q, v.given as string | string[])
    const saved = await saveStageAnswer(supabase, user.id, { itemId: item.id, type: card.type, correct, elapsedMs, clientEventId: v.clientEventId }, now)
    if (saved.status !== 'saved' && saved.status !== 'duplicate') return { status: 'conflict' }
    if (saved.result?.retry) cards = insertRetry(cards, deck.position, card)
    out = { status: 'graded', correct, answers: [Array.isArray(q.answer) ? q.answer.join('') : q.answer], speak: q.speak ?? (item.area === 'kana' ? (data as { kana: string }).kana : undefined), stageDone: saved.result?.stageDone, cardsCreated: saved.result?.cardsCreated.length, retry: saved.result?.retry }
  } else if (card.kind === 'star') {
    const q = buildStageQuestion(card.type, data, pools(loaded.content), Math.random)
    const correct = gradeQuestion(q, v.given as string | string[])
    await saveStarAnswer(supabase, user.id, { itemId: item.id, area: item.area, type: card.type, correct, elapsedMs, clientEventId: v.clientEventId }, now)
    out = { status: 'graded', correct, answers: [Array.isArray(q.answer) ? q.answer.join('') : q.answer], speak: q.speak ?? (item.area === 'kana' ? (data as { kana: string }).kana : undefined) }
  } else if (card.kind === 'review') {
    const built = buildReviewCard(card.card, data, pools(loaded.content), Math.random)
    const given = Array.isArray(v.given) ? (v.given as string[]) : []
    const correct = gradeCard(built.parts, given)
    const saved = await saveCardReview(supabase, user.id, { cardId: card.cardId, correct, elapsedMs, clientEventId: v.clientEventId }, now)
    if (saved.status !== 'saved' && saved.status !== 'duplicate') return { status: 'conflict' }
    const retries = cards.filter((c) => c.key.startsWith(`rv:${card.cardId}:r`)).length
    if (!correct && retries < 3) cards = insertRetry(cards, deck.position, { ...card, key: `rv:${card.cardId}` }, reviewRetryGap(Math.random))
    out = { status: 'graded', correct, answers: built.parts.map((x) => (Array.isArray(x.question.answer) ? x.question.answer.join('') : x.question.answer)), speak: built.speak, retry: !correct && retries < 3 }
  }
  const { error } = await supabase.from('daily_decks').update({ cards, position: deck.position + 1, version: deck.version + 1 }).eq('id', deck.id).eq('version', deck.version)
  if (error) throw new Error(`Không lưu được daily_decks: ${error.message}`)
  return out
}

// ---------------------------------------------------------------------------
// Trang ba khu
// ---------------------------------------------------------------------------

export interface ZoneSummary {
  zone: Zone
  /** Mục mới hôm nay (chưa xem thẻ giới thiệu, kể cả mục sẽ mở). */
  newItems: number
  /** Câu Stage và Card hôm nay, đã áp trần của khu. */
  stageQuestions: number
  reviews: number
  /** Câu Stage và Card vượt trần, chờ các ngày sau. */
  waiting: number
  /** Bộ thẻ đã dựng: đã làm / tổng. */
  deck: { position: number; total: number } | null
  remaining: number
  /** Tồn quá trần: hôm nay không mở mục mới (luật dừng mục mới). */
  paused: boolean
}

export interface HubView {
  /** Bộ thủ trong phạm vi: tổng và số đã đánh dấu "đã biết" (nút cả nhóm). */
  radicals: { total: number; known: number }
  level: number | null
  zones: ZoneSummary[]
  all: { position: number; total: number } | null
  balance: { finishDate: string; minutes: number; days: number } | null
  warnings: ForecastDay[]
  caps: Record<Zone, number>
}

export async function getHub(): Promise<HubView> {
  const user = await requireUser()
  const supabase = await createClient()
  const now = new Date()
  const today = studyDate(now)
  const l = await load(supabase, user.id)
  const p = plan(l, now)
  const input = deckInput(l, ZONES, now)
  const split = splitByZone(input)
  const decks = await Promise.all([...ZONES, 'all' as const].map((s) => readDeck(supabase, user.id, today, s)))
  const willOpen: Record<Zone, number> = { kana: p.open.kana.length, kanji: p.open.radical.length + p.open.kanji.length, word_kanji: p.open.word_kanji.length }
  const zones = ZONES.map((zone, i) => {
    // Số thật hôm nay sau trần của khu (như khi dựng bộ thẻ); phần vượt trần là "waiting"
    const capped = applyCap(split[zone], l.settings.caps[zone]).input
    const stageAll = countQuestions({ ...split[zone], reviews: [], newItems: [] })
    const stageQuestions = countQuestions({ ...capped, reviews: [], newItems: [] })
    return {
      zone,
      newItems: capped.newItems.length + willOpen[zone],
      stageQuestions,
      reviews: capped.reviews.length,
      waiting: stageAll - stageQuestions + split[zone].reviews.length - capped.reviews.length,
      deck: decks[i] ? { position: decks[i]!.position, total: decks[i]!.cards.length } : null,
      remaining: zone === 'kanji' ? p.remaining.radical + p.remaining.kanji : p.remaining[zone],
      paused: p.paused[zone],
    }
  })
  // Dự báo 7 ngày: Card đến hạn theo ngày, mục đang học, mục mới mỗi ngày như hôm nay
  const reviewsByDay: Record<Zone, number[]> = { kana: new Array(7).fill(0), kanji: new Array(7).fill(0), word_kanji: new Array(7).fill(0) }
  const itemById = new Map(l.items.map((i) => [i.id, i]))
  const dayStart = nextStudyDayStart(now).getTime()
  for (const c of l.cards) {
    const it = itemById.get(c.itemId)
    if (!it || it.known || c.archived) continue
    const d = Math.max(0, Math.floor((c.schedule.due.getTime() - dayStart) / 86_400_000) + 1)
    if (d < 7) reviewsByDay[zoneOf(it.area)][d]++
  }
  const days = forecast({
    today,
    items: l.items.filter((i) => !i.known && i.stage !== 'review').map((i) => i.state),
    reviewsByDay,
    newPerDay: p.balance ? p.balance.today : { kana: l.settings.newPerDay.kana, kanji: l.settings.newPerDay.kanji, word_kanji: l.settings.newPerDay.word_kanji },
    caps: l.settings.caps,
  })
  return {
    radicals: { total: l.content.radicals.length, known: l.items.filter((i) => i.area === 'radical' && i.known).length },
    level: p.level,
    zones,
    all: decks[3] ? { position: decks[3]!.position, total: decks[3]!.cards.length } : null,
    balance: p.balance ? { finishDate: p.balance.finishDate, minutes: Math.round(p.balance.minutes.kana + p.balance.minutes.kanji + p.balance.minutes.word_kanji), days: p.balance.days } : null,
    warnings: overflowDays(days),
    caps: l.settings.caps,
  }
}

/** Nút "đã biết cả nhóm" của bộ thủ. Bộ thẻ hôm nay đã dựng vẫn giữ; thẻ của bộ đã biết bị bỏ qua khi tới lượt. */
export async function markRadicalsKnown(known: unknown): Promise<{ status: 'saved' | 'invalid'; count?: number }> {
  if (typeof known !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const content = await readV12Content(supabase)
  const count = await setRadicalsKnown(supabase, user.id, content.radicals.map((r) => r.number), known, new Date())
  return { status: 'saved', count }
}
