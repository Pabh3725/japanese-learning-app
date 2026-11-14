// JLPT_V1 (docs/jlpt-rules.md §2): mảng kiến thức và dạng bài. Pure, dùng chung server và trình duyệt.

export type JlptLevel = 'N5' | 'N4'
export const JLPT_LEVELS: readonly JlptLevel[] = ['N5', 'N4']

export type JlptArea = 'kanji' | 'vocabulary' | 'grammar' | 'reading' | 'listening'

export type JlptType =
  | 'kanji_reading'
  | 'orthography'
  | 'contextual'
  | 'paraphrase'
  | 'usage'
  | 'grammar_form'
  | 'sentence_order'
  | 'text_grammar'
  | 'reading'
  | 'quick_response'
  | 'listening_task'
  | 'verbal_expressions'

export interface JlptTypeInfo {
  id: JlptType
  area: JlptArea
  nameJa: string
  name: string
  description: string
  /** Đợt 1 làm được; đợt 2 hiện "Coming soon". */
  available: boolean
  /** Chỉ có ở các cấp này. */
  levels: readonly JlptLevel[]
}

export const JLPT_AREAS: { id: JlptArea; name: string; nameJa: string }[] = [
  { id: 'kanji', name: 'Kanji', nameJa: '漢字' },
  { id: 'vocabulary', name: 'Vocabulary', nameJa: '語彙' },
  { id: 'grammar', name: 'Grammar', nameJa: '文法' },
  { id: 'reading', name: 'Reading', nameJa: '読解' },
  { id: 'listening', name: 'Listening', nameJa: '聴解' },
]

const BOTH: readonly JlptLevel[] = ['N5', 'N4']

export const JLPT_TYPES: readonly JlptTypeInfo[] = [
  { id: 'kanji_reading', area: 'kanji', nameJa: '漢字読み', name: 'Kanji reading', description: 'Choose how the underlined Kanji word is read.', available: true, levels: BOTH },
  { id: 'orthography', area: 'kanji', nameJa: '表記', name: 'Writing in Kanji', description: 'Choose how the underlined hiragana word is written: in Kanji (N5 also Katakana).', available: true, levels: BOTH },
  { id: 'contextual', area: 'vocabulary', nameJa: '文脈規定', name: 'Word in context', description: 'Choose the word that fits the sentence.', available: false, levels: BOTH },
  { id: 'paraphrase', area: 'vocabulary', nameJa: '言い換え類義', name: 'Paraphrase', description: 'Choose the sentence with the closest meaning.', available: false, levels: BOTH },
  { id: 'usage', area: 'vocabulary', nameJa: '用法', name: 'Word usage', description: 'Choose the sentence that uses the word correctly.', available: false, levels: ['N4'] },
  { id: 'grammar_form', area: 'grammar', nameJa: '文法形式の判断', name: 'Grammar form', description: 'Choose the particle, word or form that fills the blank.', available: true, levels: BOTH },
  { id: 'sentence_order', area: 'grammar', nameJa: '文の組み立て', name: 'Sentence building ★', description: 'Put the pieces in order and choose the one for ★.', available: true, levels: BOTH },
  { id: 'text_grammar', area: 'grammar', nameJa: '文章の文法', name: 'Grammar in a passage', description: 'Choose what fits each blank in a short passage.', available: false, levels: BOTH },
  { id: 'reading', area: 'reading', nameJa: '読解', name: 'Reading comprehension', description: 'Short and mid-length passages, finding information.', available: false, levels: BOTH },
  { id: 'listening_task', area: 'listening', nameJa: '課題理解・ポイント理解', name: 'Listening to conversations', description: 'Listen to a conversation and answer the question.', available: false, levels: BOTH },
  { id: 'verbal_expressions', area: 'listening', nameJa: '発話表現', name: 'Verbal expressions', description: 'Look at a situation and choose what to say.', available: false, levels: BOTH },
  { id: 'quick_response', area: 'listening', nameJa: '即時応答', name: 'Quick response', description: 'Listen to what someone says and choose the best reply.', available: true, levels: BOTH },
]

export const isJlptType = (v: unknown): v is JlptType => typeof v === 'string' && JLPT_TYPES.some((t) => t.id === v)
export const isJlptLevel = (v: unknown): v is JlptLevel => v === 'N5' || v === 'N4'

/** Bài Minna của mỗi cấp (ngữ pháp). */
export const LESSONS_OF: Record<JlptLevel, readonly [number, number]> = { N5: [1, 25], N4: [26, 50] }
/** jlpt_level của từ vựng / Kanji. */
export const LEVEL_NUMBER: Record<JlptLevel, number> = { N5: 5, N4: 4 }

export const SESSION_SIZES = [10, 20, 30] as const
