import { kanjiDistractorComponents, kanjiList, vocabulary } from './mock-data'
import type { KanjiItem, LearningStep, ReviewRating, VocabItem } from './types'

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
export function shuffle<T>(items: T[], seed: string): T[] {
  const random = seededRandom(hashString(seed))
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickDistinct(pool: string[], exclude: string[], count: number, seed: string) {
  const unique = Array.from(new Set(pool)).filter((v) => !exclude.includes(v))
  return shuffle(unique, seed).slice(0, count)
}

function buildOptions(answer: string, pool: string[], seed: string) {
  return shuffle([answer, ...pickDistinct(pool, [answer], 3, seed)], `${seed}-opts`)
}

export function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
}

export function isRecallCorrect(input: string, accepted: string[]) {
  const value = normalizeAnswer(input)
  return value.length > 0 && accepted.some((a) => normalizeAnswer(a) === value)
}

export const VOCAB_STAGES = [
  'Introduction',
  'Hiragana recognition',
  'Kana assembly',
  'Kanji introduction',
  'Kanji recognition',
  'Kanji assembly',
  'Recall',
] as const

export const KANJI_STAGES = [
  'Introduction',
  'Reading recognition',
  'Meaning recognition',
  'Component assembly',
  'Recall',
] as const

const kanaPool = vocabulary.flatMap((v) => v.kanaPieces)
const kanjiCharPool = kanjiList.map((k) => k.char)

function vocabSteps(word: VocabItem): LearningStep[] {
  const wordKanji = Array.from(word.word)
    .map((c) => kanjiList.find((k) => k.char === c))
    .filter((k): k is KanjiItem => Boolean(k))
  const s = (stage: string) => `${word.id}-${stage}`

  return [
    { id: s('intro'), type: 'flashcard', stage: VOCAB_STAGES[0], vocab: word },
    {
      id: s('kana-choice'),
      type: 'choice',
      stage: VOCAB_STAGES[1],
      prompt: { display: word.word, kind: 'vocab' },
      question: 'How is this word read?',
      options: buildOptions(word.kana, vocabulary.map((v) => v.kana), s('kana-choice')),
      answer: word.kana,
      optionKind: 'kana',
      explanation: `${word.word} is read ${word.kana} (${word.romaji}).`,
    },
    {
      id: s('kana-build'),
      type: 'assembly',
      stage: VOCAB_STAGES[2],
      prompt: { display: word.word, kind: 'vocab', hint: word.meaning },
      question: 'Build the reading from the pieces',
      pool: shuffle(
        [...word.kanaPieces, ...pickDistinct(kanaPool, word.kanaPieces, 3, s('kana-pool'))],
        s('kana-build'),
      ),
      answer: word.kanaPieces,
      pieceKind: 'kana',
      explanation: `${word.kana} · ${word.romaji}`,
    },
    {
      id: s('kanji-intro'),
      type: 'kanji-intro',
      stage: VOCAB_STAGES[3],
      kanji: wordKanji,
      word,
    },
    {
      id: s('kanji-choice'),
      type: 'choice',
      stage: VOCAB_STAGES[4],
      prompt: { display: word.kana, kind: 'kana', hint: word.meaning },
      question: 'Which spelling is correct?',
      options: buildOptions(
        word.word,
        vocabulary.filter((v) => v.word.length === word.word.length).map((v) => v.word),
        s('kanji-choice'),
      ),
      answer: word.word,
      optionKind: 'vocab',
      explanation: `${word.kana} is written ${word.word} — ${word.hanViet}.`,
    },
    {
      id: s('kanji-build'),
      type: 'assembly',
      stage: VOCAB_STAGES[5],
      prompt: { display: word.kana, kind: 'kana', hint: word.meaning },
      question: 'Assemble the word from Kanji',
      pool: shuffle(
        [...Array.from(word.word), ...pickDistinct(kanjiCharPool, Array.from(word.word), 4, s('kanji-pool'))],
        s('kanji-build'),
      ),
      answer: Array.from(word.word),
      pieceKind: 'kanji',
      explanation: `${word.word} · ${word.hanViet}`,
    },
    {
      id: s('recall'),
      type: 'recall',
      stage: VOCAB_STAGES[6],
      prompt: { display: word.meaning, kind: 'meaning' },
      question: 'Type the Japanese reading',
      placeholder: 'Hiragana or romaji, e.g. ' + word.romaji.slice(0, 3) + '…',
      accepted: [word.kana, word.romaji],
      displayAnswer: `${word.word} · ${word.kana}`,
      explanation: `${word.meaning} → ${word.word} (${word.romaji})`,
    },
  ]
}

function kanjiSteps(kanji: KanjiItem): LearningStep[] {
  const s = (stage: string) => `${kanji.id}-${stage}`
  return [
    { id: s('intro'), type: 'kanji-intro', stage: KANJI_STAGES[0], kanji: [kanji] },
    {
      id: s('reading'),
      type: 'choice',
      stage: KANJI_STAGES[1],
      prompt: { display: kanji.char, kind: 'kanji' },
      question: 'What is its Sino-Vietnamese reading?',
      options: buildOptions(kanji.hanViet, kanjiList.map((k) => k.hanViet), s('reading')),
      answer: kanji.hanViet,
      optionKind: 'meaning',
      explanation: `${kanji.char} is read ${kanji.hanViet} in Sino-Vietnamese.`,
    },
    {
      id: s('meaning'),
      type: 'choice',
      stage: KANJI_STAGES[2],
      prompt: { display: kanji.char, kind: 'kanji' },
      question: 'What does it mean?',
      options: buildOptions(kanji.meaning, kanjiList.map((k) => k.meaning), s('meaning')),
      answer: kanji.meaning,
      optionKind: 'meaning',
      explanation: `${kanji.char} · ${kanji.hanViet} — ${kanji.meaning}.`,
    },
    {
      id: s('build'),
      type: 'assembly',
      stage: KANJI_STAGES[3],
      prompt: { display: kanji.meaning, kind: 'meaning', hint: kanji.hanViet },
      question: 'Assemble the Kanji from its components',
      pool: shuffle(
        [...kanji.components, ...pickDistinct(kanjiDistractorComponents, kanji.components, 4, s('pool'))],
        s('build'),
      ),
      answer: kanji.components,
      pieceKind: 'kanji',
      joiner: '+',
      explanation: `${kanji.components.join(' + ')} = ${kanji.char}`,
    },
    {
      id: s('recall'),
      type: 'recall',
      stage: KANJI_STAGES[4],
      prompt: { display: kanji.char, kind: 'kanji' },
      question: 'Type its Sino-Vietnamese reading',
      placeholder: 'e.g. ' + kanji.hanViet.toLowerCase(),
      accepted: [kanji.hanViet],
      displayAnswer: `${kanji.hanViet} · ${kanji.meaning}`,
      explanation: `${kanji.char} → ${kanji.hanViet}`,
    },
  ]
}

export type LearningMode = 'vocab' | 'kanji'

export function buildLearningSession(mode: LearningMode) {
  if (mode === 'kanji') {
    const items = ['k-gaku', 'k-yasu', 'k-mei'].map((id) => kanjiList.find((k) => k.id === id)!)
    return { stages: [...KANJI_STAGES], steps: items.flatMap(kanjiSteps), items: items.length }
  }
  const items = ['v-gakkou', 'v-jikan'].map((id) => vocabulary.find((v) => v.id === id)!)
  return { stages: [...VOCAB_STAGES], steps: items.flatMap(vocabSteps), items: items.length }
}

export const RATING_INTERVALS: Record<ReviewRating, string> = {
  again: '<1m',
  hard: '6m',
  good: '1d',
  easy: '4d',
}

/** Size class for Japanese text so long words stay on one line. */
export function jpSizeClass(text: string, kind: 'kanji' | 'vocab' | 'kana') {
  const len = Array.from(text).length
  if (kind === 'kanji' || (kind === 'vocab' && len === 1)) return 'text-[112px] md:text-[140px]'
  if (kind === 'vocab') {
    if (len <= 2) return 'text-[80px] md:text-[96px]'
    if (len <= 3) return 'text-[64px] md:text-[84px]'
    return 'text-[52px] md:text-[64px]'
  }
  if (len <= 4) return 'text-[40px] md:text-[48px]'
  return 'text-[32px] md:text-[40px]'
}
