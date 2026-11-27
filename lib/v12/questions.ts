// V12 §4–6: dựng câu cho từng loại thẻ và Card Review gom chung; chấm. Pure.
import { toRomaji } from 'wanakana'
import { isHanVietAnswerCorrect, isKanaAnswerCorrect } from '../exercise/answer-normalize'
import { kanaSimilarity, lookalikeKanji } from '../exercise/similarity'
import { REVIEW_CARDS, type CardType, type ReviewCardType, type ReviewPart } from './card-types'

type Rng = () => number

export interface KanaWordItem {
  id: string
  kana: string
  meaning: string
  hanViet: string | null
}
export interface RadicalItem {
  id: string
  /** Hình bộ (có thể kèm biến thể, vd. 水 · 氵). */
  char: string
  name: string
  meaning: string
}
export interface KanjiItem {
  id: string
  char: string
  hanViet: string
  meaning: string
  /** Chữ gần giống đã duyệt (loại thẻ phân biệt chữ). */
  similar: readonly string[]
  /** Chữ Kanji thành phần (để tìm chữ chung thành phần làm đáp án nhiễu). */
  components?: readonly string[]
}
export interface WordKanjiItem {
  id: string
  expression: string
  kana: string
  hanViet: string
  meaning: string
}

/**
 * Kho đáp án nhiễu: các mục cùng loại (N5–N2). `recent`: id các mục người học vừa mở gần đây, mới nhất trước
 * (đáp án nhiễu tầng 2, chủ dự án chốt 2026-11-24).
 */
export interface Pools {
  kana: readonly KanaWordItem[]
  radical: readonly RadicalItem[]
  kanji: readonly KanjiItem[]
  word_kanji: readonly WordKanjiItem[]
  recent?: { kana?: readonly string[]; radical?: readonly string[]; kanji?: readonly string[]; word_kanji?: readonly string[] }
}

export type PromptKind = 'kana' | 'kanji' | 'meaning' | 'hanviet' | 'listen'

export type Question =
  /**
   * `hint`: dòng gợi ý nhỏ dưới đề (vd. nghĩa dưới âm Hán Việt, vì nhiều chữ cùng âm).
   * `reading`: cách đọc Kana hiện dưới đề của Từ vựng Kanji — chỉ để nhắc lại, không hỏi (chủ dự án chốt 2026-11-26).
   * `romaji`: phiên âm romaji dưới đề Kana ở Intro 1 (chủ dự án yêu cầu 2026-11-26).
   */
  | { kind: 'choice'; prompt: string; promptKind: PromptKind; hint?: string; reading?: string; romaji?: string; speak?: string; options: string[]; optionKind: PromptKind; answer: string }
  | { kind: 'typing'; prompt: string; promptKind: PromptKind; hint?: string; reading?: string; speak?: string; input: 'hiragana' | 'katakana' | 'text'; answer: string }
  | { kind: 'assembly'; prompt: string; promptKind: PromptKind; speak?: string; pieces: string[]; answer: string[] }

const OPTIONS = 4

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** 4 lựa chọn: đáp án + 3 giá trị khác nhau lấy ngẫu nhiên từ kho (không trùng đáp án). */
function choices(answer: string, pool: readonly string[], rng: Rng, preferred: readonly string[] = []): string[] {
  const picked: string[] = []
  for (const v of [...preferred, ...shuffle(pool, rng)]) {
    if (picked.length === OPTIONS - 1) break
    if (v && v !== answer && !picked.includes(v)) picked.push(v)
  }
  if (picked.length < OPTIONS - 1) throw new Error(`Không đủ đáp án nhiễu cho "${answer}"`)
  return shuffle([answer, ...picked], rng)
}

/** Số mục gần giống / vừa học xem xét (lấy ngẫu nhiên trong nhóm đầu để câu không lặp y hệt). */
const SIMILAR_TOP = 6
const RECENT_TOP = 15

/**
 * Đáp án nhiễu 3 tầng (chủ dự án chốt 2026-11-24): 1–2 mục **gần giống** (ít nhất 1 nếu có), phần còn lại là mục
 * **vừa học gần đây**, thiếu thì mục **cùng cấp**. `allowed`: loại các mục cũng đúng (trùng nghĩa / Hán Việt / Kana).
 * `similar` đã xếp giống nhất trước; `recent` mới nhất trước; `value` lấy giá trị hiện ở lựa chọn.
 */
function tiered<T>(answer: string, value: (x: T) => string, allowed: (x: T) => boolean, similar: readonly T[], recent: readonly T[], pool: readonly T[], rng: Rng): string[] {
  const picked: string[] = []
  const add = (x: T) => {
    const v = value(x)
    if (picked.length < OPTIONS - 1 && v && v !== answer && !picked.includes(v) && allowed(x)) picked.push(v)
  }
  const sim = shuffle(similar.filter(allowed).slice(0, SIMILAR_TOP), rng)
  const nSimilar = sim.length >= 2 ? (rng() < 0.5 ? 1 : 2) : sim.length
  for (const x of sim) if (picked.length < nSimilar) add(x)
  for (const x of shuffle(recent.slice(0, RECENT_TOP), rng)) add(x)
  for (const x of sim) add(x)
  for (const x of shuffle(pool, rng)) add(x)
  if (picked.length < OPTIONS - 1) throw new Error(`Không đủ đáp án nhiễu cho "${answer}"`)
  return shuffle([answer, ...picked], rng)
}

/** Mục vừa học gần đây trong kho, theo `pools.recent` (mới nhất trước). */
function recentOf<T extends { id: string }>(pool: readonly T[], ids: readonly string[] | undefined, self: string): T[] {
  if (!ids?.length) return []
  const by = new Map(pool.map((x) => [x.id, x]))
  return ids.filter((id) => id !== self).flatMap((id) => (by.has(id) ? [by.get(id)!] : []))
}

/** Số mục gần giống giữ lại cho mỗi mục (đủ cho SIMILAR_TOP sau khi lọc mục cũng đúng). */
const SIMILAR_KEEP = 12
/**
 * Bộ nhớ đệm danh sách gần giống theo mục (id → id các mục gần giống): so với cả kho tốn thời gian, nội dung lại ít đổi.
 * Khóa gồm loại kho và cỡ kho để kho khác (vd. dữ liệu test) không dùng nhầm.
 */
const similarCache = new Map<string, string[]>()
function cachedSimilar<T extends { id: string }>(kind: string, item: T, pool: readonly T[], compute: () => T[]): T[] {
  const k = `${kind}:${pool.length}:${item.id}`
  let ids = similarCache.get(k)
  if (!ids) {
    ids = compute().slice(0, SIMILAR_KEEP).map((x) => x.id)
    if (similarCache.size > 20_000) similarCache.clear()
    similarCache.set(k, ids)
  }
  const by = new Map(pool.map((x) => [x.id, x]))
  return ids.flatMap((id) => (by.has(id) ? [by.get(id)!] : []))
}

/** Từ Kana gần giống: Kana gần nhau (ít khác chữ, cùng đầu / cuối, chữ dễ nhầm). */
function similarKanaWords(w: KanaWordItem, pool: readonly KanaWordItem[]): KanaWordItem[] {
  return cachedSimilar('kana', w, pool, () =>
    pool
      .filter((x) => x.id !== w.id)
      .map((x) => ({ x, s: kanaSimilarity(w.kana, x.kana) }))
      .filter((r) => r.s >= 4.5)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.x),
  )
}

/** Chữ gần giống: cặp đã duyệt, chữ trông giống, rồi chữ chung thành phần. */
function similarKanji(k: KanjiItem, pool: readonly KanjiItem[]): KanjiItem[] {
  const by = new Map(pool.map((x) => [x.char, x]))
  const out: KanjiItem[] = []
  const push = (c: string) => {
    const x = by.get(c)
    if (x && x.char !== k.char && !out.includes(x)) out.push(x)
  }
  for (const c of k.similar) push(c)
  for (const c of lookalikeKanji(k.char)) push(c)
  const own = new Set([k.char, ...(k.components ?? [])])
  for (const x of pool) if (x.char !== k.char && (x.components ?? []).some((c) => own.has(c))) push(x.char)
  for (const c of k.components ?? []) push(c)
  return out
}

/** Từ có chung chữ Kanji (chung nhiều chữ hơn trước), rồi từ có chữ trông giống. */
function similarWords(w: WordKanjiItem, pool: readonly WordKanjiItem[]): WordKanjiItem[] {
  return cachedSimilar('word', w, pool, () => computeSimilarWords(w, pool))
}

function computeSimilarWords(w: WordKanjiItem, pool: readonly WordKanjiItem[]): WordKanjiItem[] {
  const chars = new Set(Array.from(w.expression))
  const looks = new Set([...chars].flatMap((c) => lookalikeKanji(c)))
  return pool
    .filter((x) => x.id !== w.id)
    .map((x) => {
      const xs = Array.from(x.expression)
      return { x, s: 3 * xs.filter((c) => chars.has(c) && /[一-鿿]/.test(c)).length + xs.filter((c) => looks.has(c)).length }
    })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.x)
}

/** Bộ thủ trông giống (bảng chữ dễ nhầm). */
function similarRadicals(r: RadicalItem, pool: readonly RadicalItem[]): RadicalItem[] {
  const looks = new Set(Array.from(r.char).flatMap((c) => lookalikeKanji(c)))
  return pool.filter((x) => x.id !== r.id && Array.from(x.char).some((c) => looks.has(c)))
}

const isKatakana = (s: string) => /^[ァ-ヺー]+$/.test(s)
const choice = (prompt: string, promptKind: PromptKind, answer: string, options: string[], optionKind: PromptKind, speak?: string): Question => ({ kind: 'choice', prompt, promptKind, options, optionKind, answer, ...(speak ? { speak } : {}) })

/** Phiên âm romaji của Kana (vd. コーヒー → koohii), hiện ở thẻ giới thiệu và câu Kana → nghĩa của Intro 1. */
export const romajiOf = (kana: string) => toRomaji(kana)

/** Câu của một loại thẻ Stage (§4–6). */
export function buildStageQuestion(type: CardType, item: KanaWordItem | RadicalItem | KanjiItem | WordKanjiItem, pools: Pools, rng: Rng): Question {
  switch (type) {
    // Từ vựng Kana
    case 'kana_meaning': {
      const w = item as KanaWordItem
      const opts = tiered(w.meaning, (x: KanaWordItem) => x.meaning, (x) => x.meaning !== w.meaning, similarKanaWords(w, pools.kana), recentOf(pools.kana, pools.recent?.kana, w.id), pools.kana, rng)
      return { ...choice(w.kana, 'kana', w.meaning, opts, 'meaning', w.kana), romaji: romajiOf(w.kana) } as Question
    }
    case 'meaning_kana': {
      const w = item as KanaWordItem
      const opts = tiered(w.kana, (x: KanaWordItem) => x.kana, (x) => x.kana !== w.kana && x.meaning !== w.meaning, similarKanaWords(w, pools.kana), recentOf(pools.kana, pools.recent?.kana, w.id), pools.kana, rng)
      return choice(w.meaning, 'meaning', w.kana, opts, 'kana')
    }
    case 'listen_kana': {
      const w = item as KanaWordItem
      const opts = tiered(w.kana, (x: KanaWordItem) => x.kana, (x) => x.kana !== w.kana, similarKanaWords(w, pools.kana), recentOf(pools.kana, pools.recent?.kana, w.id), pools.kana, rng)
      return choice('', 'listen', w.kana, opts, 'kana', w.kana)
    }
    case 'meaning_type_kana': {
      const w = item as KanaWordItem
      return { kind: 'typing', prompt: w.meaning, promptKind: 'meaning', input: isKatakana(w.kana) ? 'katakana' : 'hiragana', answer: w.kana }
    }
    case 'listen_type_kana': {
      const w = item as KanaWordItem
      return { kind: 'typing', prompt: '', promptKind: 'listen', speak: w.kana, input: isKatakana(w.kana) ? 'katakana' : 'hiragana', answer: w.kana }
    }
    // Bộ thủ
    case 'radical_hanviet': {
      const r = item as RadicalItem
      const opts = tiered(r.name, (x: RadicalItem) => x.name, (x) => x.name !== r.name, similarRadicals(r, pools.radical), recentOf(pools.radical, pools.recent?.radical, r.id), pools.radical, rng)
      return choice(r.char, 'kanji', r.name, opts, 'hanviet')
    }
    case 'radical_meaning': {
      const r = item as RadicalItem
      const opts = tiered(r.meaning, (x: RadicalItem) => x.meaning, (x) => x.meaning !== r.meaning, similarRadicals(r, pools.radical), recentOf(pools.radical, pools.recent?.radical, r.id), pools.radical, rng)
      return choice(r.char, 'kanji', r.meaning, opts, 'meaning')
    }
    case 'hanviet_radical': {
      const r = item as RadicalItem
      const opts = tiered(r.char, (x: RadicalItem) => x.char, (x) => x.name !== r.name, similarRadicals(r, pools.radical), recentOf(pools.radical, pools.recent?.radical, r.id), pools.radical, rng)
      return choice(r.name, 'hanviet', r.char, opts, 'kanji')
    }
    case 'meaning_radical': {
      const r = item as RadicalItem
      const opts = tiered(r.char, (x: RadicalItem) => x.char, (x) => x.meaning !== r.meaning, similarRadicals(r, pools.radical), recentOf(pools.radical, pools.recent?.radical, r.id), pools.radical, rng)
      return choice(r.meaning, 'meaning', r.char, opts, 'kanji')
    }
    // Chữ Kanji
    case 'kanji_hanviet': {
      const k = item as KanjiItem
      const opts = tiered(k.hanViet, (x: KanjiItem) => x.hanViet, (x) => x.hanViet !== k.hanViet, similarKanji(k, pools.kanji), recentOf(pools.kanji, pools.recent?.kanji, k.id), pools.kanji, rng)
      return choice(k.char, 'kanji', k.hanViet, opts, 'hanviet')
    }
    case 'kanji_meaning': {
      const k = item as KanjiItem
      const opts = tiered(k.meaning, (x: KanjiItem) => x.meaning, (x) => x.meaning !== k.meaning, similarKanji(k, pools.kanji), recentOf(pools.kanji, pools.recent?.kanji, k.id), pools.kanji, rng)
      return choice(k.char, 'kanji', k.meaning, opts, 'meaning')
    }
    case 'hanviet_kanji': {
      const k = item as KanjiItem
      // Nhiều chữ cùng âm Hán Việt: hiện thêm nghĩa dưới âm để không chọn nhầm chữ (chủ dự án yêu cầu 2026-11-24)
      const options = tiered(k.char, (x: KanjiItem) => x.char, (x) => x.hanViet !== k.hanViet, similarKanji(k, pools.kanji), recentOf(pools.kanji, pools.recent?.kanji, k.id), pools.kanji, rng)
      return { kind: 'choice', prompt: k.hanViet, promptKind: 'hanviet', hint: k.meaning, options, optionKind: 'kanji', answer: k.char }
    }
    case 'meaning_kanji': {
      const k = item as KanjiItem
      const opts = tiered(k.char, (x: KanjiItem) => x.char, (x) => x.meaning !== k.meaning, similarKanji(k, pools.kanji), recentOf(pools.kanji, pools.recent?.kanji, k.id), pools.kanji, rng)
      return choice(k.meaning, 'meaning', k.char, opts, 'kanji')
    }
    case 'kanji_type_hanviet': {
      const k = item as KanjiItem
      return { kind: 'typing', prompt: k.char, promptKind: 'kanji', input: 'text', answer: k.hanViet }
    }
    case 'kanji_similar': {
      const k = item as KanjiItem
      if (k.similar.length === 0) throw new Error(`${k.char} không có chữ gần giống đã duyệt`)
      return choice(`${k.meaning} · ${k.hanViet}`, 'meaning', k.char, choices(k.char, pools.kanji.map((x) => x.char), rng, k.similar), 'kanji')
    }
    // Từ vựng Kanji
    case 'word_hanviet': {
      const w = item as WordKanjiItem
      const opts = tiered(w.hanViet, (x: WordKanjiItem) => x.hanViet, (x) => x.hanViet !== w.hanViet, similarWords(w, pools.word_kanji), recentOf(pools.word_kanji, pools.recent?.word_kanji, w.id), pools.word_kanji, rng)
      return { ...choice(w.expression, 'kanji', w.hanViet, opts, 'hanviet', w.kana), reading: w.kana } as Question
    }
    case 'word_meaning': {
      const w = item as WordKanjiItem
      const opts = tiered(w.meaning, (x: WordKanjiItem) => x.meaning, (x) => x.meaning !== w.meaning, similarWords(w, pools.word_kanji), recentOf(pools.word_kanji, pools.recent?.word_kanji, w.id), pools.word_kanji, rng)
      return { ...choice(w.expression, 'kanji', w.meaning, opts, 'meaning', w.kana), reading: w.kana } as Question
    }
    case 'hanviet_word': {
      const w = item as WordKanjiItem
      // Hiện thêm nghĩa dưới âm Hán Việt như câu Hán Việt → chọn chữ (chủ dự án yêu cầu 2026-11-24)
      const options = tiered(w.expression, (x: WordKanjiItem) => x.expression, (x) => x.hanViet !== w.hanViet, similarWords(w, pools.word_kanji), recentOf(pools.word_kanji, pools.recent?.word_kanji, w.id), pools.word_kanji, rng)
      return { kind: 'choice', prompt: w.hanViet, promptKind: 'hanviet', hint: w.meaning, options, optionKind: 'kanji', answer: w.expression }
    }
    case 'meaning_word': {
      const w = item as WordKanjiItem
      const opts = tiered(w.expression, (x: WordKanjiItem) => x.expression, (x) => x.meaning !== w.meaning, similarWords(w, pools.word_kanji), recentOf(pools.word_kanji, pools.recent?.word_kanji, w.id), pools.word_kanji, rng)
      return choice(w.meaning, 'meaning', w.expression, opts, 'kanji')
    }
    case 'word_type_hanviet': {
      const w = item as WordKanjiItem
      return { kind: 'typing', prompt: w.expression, promptKind: 'kanji', speak: w.kana, input: 'text', answer: w.hanViet }
    }
    case 'meaning_hanviet': {
      // Đáp án nhiễu không trùng Hán Việt hay trùng nghĩa (vd. 社員 / 会社員 cùng "nhân viên công ty")
      const w = item as WordKanjiItem
      const opts = tiered(w.hanViet, (x: WordKanjiItem) => x.hanViet, (x) => x.hanViet !== w.hanViet && x.meaning !== w.meaning, similarWords(w, pools.word_kanji), recentOf(pools.word_kanji, pools.recent?.word_kanji, w.id), pools.word_kanji, rng)
      return { ...choice(w.meaning, 'meaning', w.hanViet, opts, 'hanviet'), reading: w.kana } as Question
    }
    case 'meaning_type_hanviet': {
      // Cách đọc Kana hiện dưới nghĩa để câu chỉ có một đáp án khi nhiều từ trùng nghĩa
      const w = item as WordKanjiItem
      return { kind: 'typing', prompt: w.meaning, promptKind: 'meaning', reading: w.kana, input: 'text', answer: w.hanViet }
    }
    case 'word_assembly': {
      // Nghĩa → chọn từng chữ (Kanji và Kana đi kèm) theo thứ tự để viết từ; thêm chữ Kanji nhiễu cùng cấp
      const w = item as WordKanjiItem
      const pieces = Array.from(w.expression)
      const own = new Set(pieces)
      // Chữ nhiễu: chữ trông giống các chữ trong từ trước, rồi chữ vừa học, rồi chữ cùng cấp
      const n = Math.max(3, 6 - pieces.length)
      const looks = shuffle([...new Set(pieces.flatMap((c) => lookalikeKanji(c)))].filter((c) => !own.has(c)), rng)
      const recentChars = shuffle(recentOf(pools.kanji, pools.recent?.kanji, '').slice(0, RECENT_TOP).map((k) => k.char), rng)
      const distractors = [...new Set([...looks.slice(0, 2), ...recentChars, ...looks, ...shuffle(pools.kanji.map((k) => k.char), rng)])].filter((c) => !own.has(c)).slice(0, n)
      return { kind: 'assembly', prompt: w.meaning, promptKind: 'meaning', speak: w.kana, pieces: shuffle([...pieces, ...distractors], rng), answer: pieces }
    }
  }
}

/** Một phần của Card Review gom chung. */
export interface CardPart {
  part: ReviewPart
  question: Question
}

/** Card Review (§3.3): các phần trên cùng một thẻ, cùng một đề. */
export function buildReviewCard(card: ReviewCardType, item: KanaWordItem | RadicalItem | KanjiItem | WordKanjiItem, pools: Pools, rng: Rng): { prompt: string; promptKind: PromptKind; reading?: string; speak?: string; parts: CardPart[] } {
  const parts = (q: Record<ReviewPart, () => Question>) => REVIEW_CARDS[card].parts.map((part) => ({ part, question: q[part]() }))
  const never = () => {
    throw new Error(`${card}: phần không dùng`)
  }
  switch (card) {
    case 'kana_type': {
      // ① nghĩa → gõ Kana; đúng hay sai đều phát âm thanh (trình học đọc `speak` sau khi chấm)
      const w = item as KanaWordItem
      return { prompt: w.meaning, promptKind: 'meaning', speak: w.kana, parts: parts({ type_kana: () => buildStageQuestion('meaning_type_kana', w, pools, rng), choose_meaning: never, type_hanviet: never }) }
    }
    case 'kanji': {
      const k = item as KanjiItem
      return {
        prompt: k.char,
        promptKind: 'kanji',
        parts: parts({ type_hanviet: () => buildStageQuestion('kanji_type_hanviet', k, pools, rng), choose_meaning: () => buildStageQuestion('kanji_meaning', k, pools, rng), type_kana: never }),
      }
    }
    case 'word_kanji': {
      const w = item as WordKanjiItem
      return {
        prompt: w.expression,
        promptKind: 'kanji',
        reading: w.kana,
        speak: w.kana,
        parts: parts({
          type_kana: never,
          type_hanviet: () => buildStageQuestion('word_type_hanviet', w, pools, rng),
          choose_meaning: () => buildStageQuestion('word_meaning', w, pools, rng),
        }),
      }
    }
  }
}

/** Chấm một câu theo đáp án thật. Gõ Kana: không phân biệt Hiragana/Katakana, ー; gõ Hán Việt: không cần dấu. */
export function gradeQuestion(q: Question, given: string | readonly string[]): boolean {
  if (q.kind === 'assembly') return Array.isArray(given) && given.join('') === q.answer.join('')
  if (typeof given !== 'string') return false
  if (q.kind === 'choice') return given === q.answer
  return q.input === 'text' ? isHanVietAnswerCorrect(given, q.answer) : isKanaAnswerCorrect(given, q.answer)
}

/** Card gom chung: sai một phần là sai cả Card (§3.3). */
export function gradeCard(parts: readonly CardPart[], given: readonly (string | readonly string[])[]): boolean {
  return parts.length === given.length && parts.every((p, i) => gradeQuestion(p.question, given[i]))
}
