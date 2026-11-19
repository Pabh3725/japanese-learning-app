// V12 §4–6: dựng câu cho từng loại thẻ và Card Review gom chung; chấm. Pure.
import { isHanVietAnswerCorrect, isKanaAnswerCorrect } from '../exercise/answer-normalize'
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
}
export interface WordKanjiItem {
  id: string
  expression: string
  kana: string
  hanViet: string
  meaning: string
}

/** Kho đáp án nhiễu: các mục cùng loại (cùng cấp, không chỉ mục đã học — kế hoạch §6). */
export interface Pools {
  kana: readonly KanaWordItem[]
  radical: readonly RadicalItem[]
  kanji: readonly KanjiItem[]
  word_kanji: readonly WordKanjiItem[]
}

export type PromptKind = 'kana' | 'kanji' | 'meaning' | 'hanviet' | 'listen'

export type Question =
  | { kind: 'choice'; prompt: string; promptKind: PromptKind; speak?: string; options: string[]; optionKind: PromptKind; answer: string }
  | { kind: 'typing'; prompt: string; promptKind: PromptKind; speak?: string; input: 'hiragana' | 'katakana' | 'text'; answer: string }
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

const isKatakana = (s: string) => /^[ァ-ヺー]+$/.test(s)
const choice = (prompt: string, promptKind: PromptKind, answer: string, options: string[], optionKind: PromptKind, speak?: string): Question => ({ kind: 'choice', prompt, promptKind, options, optionKind, answer, ...(speak ? { speak } : {}) })

/** Câu của một loại thẻ Stage (§4–6). */
export function buildStageQuestion(type: CardType, item: KanaWordItem | RadicalItem | KanjiItem | WordKanjiItem, pools: Pools, rng: Rng): Question {
  switch (type) {
    // Từ vựng Kana
    case 'kana_meaning': {
      const w = item as KanaWordItem
      return choice(w.kana, 'kana', w.meaning, choices(w.meaning, pools.kana.map((x) => x.meaning), rng), 'meaning', w.kana)
    }
    case 'meaning_kana': {
      const w = item as KanaWordItem
      return choice(w.meaning, 'meaning', w.kana, choices(w.kana, pools.kana.map((x) => x.kana), rng, pools.kana.filter((x) => Math.abs(x.kana.length - w.kana.length) <= 1).map((x) => x.kana)), 'kana')
    }
    case 'listen_kana': {
      const w = item as KanaWordItem
      return choice('', 'listen', w.kana, choices(w.kana, pools.kana.map((x) => x.kana), rng, pools.kana.filter((x) => x.kana[0] === w.kana[0]).map((x) => x.kana)), 'kana', w.kana)
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
      return choice(r.char, 'kanji', r.name, choices(r.name, pools.radical.map((x) => x.name), rng), 'hanviet')
    }
    case 'radical_meaning': {
      const r = item as RadicalItem
      return choice(r.char, 'kanji', r.meaning, choices(r.meaning, pools.radical.map((x) => x.meaning), rng), 'meaning')
    }
    case 'hanviet_radical': {
      const r = item as RadicalItem
      return choice(r.name, 'hanviet', r.char, choices(r.char, pools.radical.map((x) => x.char), rng), 'kanji')
    }
    case 'meaning_radical': {
      const r = item as RadicalItem
      return choice(r.meaning, 'meaning', r.char, choices(r.char, pools.radical.map((x) => x.char), rng), 'kanji')
    }
    // Chữ Kanji
    case 'kanji_hanviet': {
      const k = item as KanjiItem
      return choice(k.char, 'kanji', k.hanViet, choices(k.hanViet, pools.kanji.map((x) => x.hanViet), rng), 'hanviet')
    }
    case 'kanji_meaning': {
      const k = item as KanjiItem
      return choice(k.char, 'kanji', k.meaning, choices(k.meaning, pools.kanji.map((x) => x.meaning), rng), 'meaning')
    }
    case 'hanviet_kanji': {
      const k = item as KanjiItem
      return choice(k.hanViet, 'hanviet', k.char, choices(k.char, pools.kanji.filter((x) => x.hanViet !== k.hanViet).map((x) => x.char), rng, k.similar), 'kanji')
    }
    case 'meaning_kanji': {
      const k = item as KanjiItem
      return choice(k.meaning, 'meaning', k.char, choices(k.char, pools.kanji.filter((x) => x.meaning !== k.meaning).map((x) => x.char), rng, k.similar), 'kanji')
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
      return choice(w.expression, 'kanji', w.hanViet, choices(w.hanViet, pools.word_kanji.map((x) => x.hanViet), rng), 'hanviet', w.kana)
    }
    case 'word_meaning': {
      const w = item as WordKanjiItem
      return choice(w.expression, 'kanji', w.meaning, choices(w.meaning, pools.word_kanji.map((x) => x.meaning), rng), 'meaning', w.kana)
    }
    case 'hanviet_word': {
      const w = item as WordKanjiItem
      return choice(w.hanViet, 'hanviet', w.expression, choices(w.expression, pools.word_kanji.filter((x) => x.hanViet !== w.hanViet).map((x) => x.expression), rng), 'kanji')
    }
    case 'meaning_word': {
      const w = item as WordKanjiItem
      return choice(w.meaning, 'meaning', w.expression, choices(w.expression, pools.word_kanji.filter((x) => x.meaning !== w.meaning).map((x) => x.expression), rng), 'kanji')
    }
    case 'word_type_hanviet': {
      const w = item as WordKanjiItem
      return { kind: 'typing', prompt: w.expression, promptKind: 'kanji', speak: w.kana, input: 'text', answer: w.hanViet }
    }
    case 'word_assembly': {
      // Nghĩa → chọn từng chữ (Kanji và Kana đi kèm) theo thứ tự để viết từ; thêm chữ Kanji nhiễu cùng cấp
      const w = item as WordKanjiItem
      const pieces = Array.from(w.expression)
      const own = new Set(pieces)
      const distractors = shuffle(pools.kanji.map((k) => k.char).filter((c) => !own.has(c)), rng).slice(0, Math.max(3, 6 - pieces.length))
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
export function buildReviewCard(card: ReviewCardType, item: KanaWordItem | RadicalItem | KanjiItem | WordKanjiItem, pools: Pools, rng: Rng): { prompt: string; promptKind: PromptKind; speak?: string; parts: CardPart[] } {
  const parts = (q: Record<ReviewPart, () => Question>) => REVIEW_CARDS[card].parts.map((part) => ({ part, question: q[part]() }))
  const never = () => {
    throw new Error(`${card}: phần không dùng`)
  }
  switch (card) {
    case 'kana_type': {
      // ① nghĩa → gõ Kana; đúng hay sai đều phát âm thanh (trình học đọc `speak` sau khi chấm)
      const w = item as KanaWordItem
      return { prompt: w.meaning, promptKind: 'meaning', speak: w.kana, parts: parts({ type_kana: () => buildStageQuestion('meaning_type_kana', w, pools, rng), choose_meaning: never, choose_hanviet: never, type_hanviet: never }) }
    }
    case 'kana_choose': {
      const w = item as KanaWordItem
      return { prompt: w.kana, promptKind: 'kana', speak: w.kana, parts: parts({ choose_meaning: () => buildStageQuestion('kana_meaning', w, pools, rng), type_kana: never, choose_hanviet: never, type_hanviet: never }) }
    }
    case 'radical': {
      const r = item as RadicalItem
      return {
        prompt: r.char,
        promptKind: 'kanji',
        parts: parts({ choose_hanviet: () => buildStageQuestion('radical_hanviet', r, pools, rng), choose_meaning: () => buildStageQuestion('radical_meaning', r, pools, rng), type_kana: never, type_hanviet: never }),
      }
    }
    case 'kanji': {
      const k = item as KanjiItem
      return {
        prompt: k.char,
        promptKind: 'kanji',
        parts: parts({ type_hanviet: () => buildStageQuestion('kanji_type_hanviet', k, pools, rng), choose_meaning: () => buildStageQuestion('kanji_meaning', k, pools, rng), type_kana: never, choose_hanviet: never }),
      }
    }
    case 'word_kanji': {
      const w = item as WordKanjiItem
      return {
        prompt: w.expression,
        promptKind: 'kanji',
        speak: w.kana,
        parts: parts({
          type_kana: never,
          type_hanviet: () => buildStageQuestion('word_type_hanviet', w, pools, rng),
          choose_meaning: () => buildStageQuestion('word_meaning', w, pools, rng),
          choose_hanviet: never,
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
