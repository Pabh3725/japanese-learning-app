// Grammar (docs/grammar-rules.md, GRAMMAR_V1): định dạng nội dung và dạng bài. Pure, dùng chung cho seed và engine.

/** Một mảnh của câu: chữ như viết, và cách đọc khi có Kanji (để hiện furigana). */
export interface GrammarPiece {
  t: string
  r?: string
}

export type GrammarSlotKind = 'particle' | 'word' | 'form'

/**
 * Chỗ được hỏi trong câu. Đáp án đúng là chữ của mảnh `piece`.
 * - particle: trợ từ / từ chức năng (dạng 1, 8, 13)
 * - word: từ nội dung chủ chốt (dạng 2)
 * - form: động/tính từ đã chia, có thể (`form`) và dạng từ điển (`dict`) (dạng 4, 8, 11, 13)
 */
export interface GrammarSlot {
  kind: GrammarSlotKind
  piece: number
  /** Cách viết khác cũng đúng ở chỗ này (không được làm đáp án nhiễu). */
  accepted?: string[]
  /** Đáp án nhiễu có chủ đích: sai chắc chắn ở chỗ này. */
  distractors: string[]
  form?: string
  dict?: string
}

export interface GrammarSentenceData {
  /** g01-01-s01 */
  code: string
  level: 1 | 2 | 3
  pieces: GrammarPiece[]
  meaning: string
  /** Mẫu dùng trong câu ngoài mẫu chính (code của mẫu bài trước hoặc mẫu trước trong cùng bài). */
  uses?: string[]
  slots?: GrammarSlot[]
  /** Chỉ số mảnh đầu tiên của vế sau (dạng ghép hai vế). */
  split?: number
  /** Câu hỏi / lời nói đi trước, câu này là câu đáp (dạng chọn câu đáp). */
  prompt?: { pieces: GrammarPiece[]; meaning: string }
  /** Một trong 5 câu tiêu biểu chủ dự án duyệt. */
  sample?: boolean
  /** Ẩn khỏi người học (câu bị báo lỗi). */
  hidden?: boolean
}

export interface GrammarPointData {
  /** g01-01: bài 01, mẫu thứ 01 */
  code: string
  order: number
  pattern: string
  meaning: string
  explanation: string
  notes?: string
  approved: boolean
  sentences: GrammarSentenceData[]
}

/** Một file data/grammar/lesson-NN.json */
export interface GrammarLessonFile {
  lesson: number
  points: GrammarPointData[]
}

/** 13 dạng bài (§5), theo thứ tự trong tài liệu. */
export const GRAMMAR_EXERCISES = [
  'particle_choice',
  'word_choice',
  'order',
  'form_choice',
  'meaning_choice',
  'translate_build',
  'star',
  'find_error',
  'clause_match',
  'listening',
  'form_typing',
  'reply_choice',
  'true_false',
] as const
export type GrammarExercise = (typeof GRAMMAR_EXERCISES)[number]

/** Bậc của giai đoạn Học (§6.2): dạng được hỏi lần đầu ở bậc nào. */
export const EXERCISE_TIER: Record<GrammarExercise, 1 | 2 | 3> = {
  meaning_choice: 1,
  true_false: 1,
  listening: 1,
  particle_choice: 1,
  form_choice: 2,
  clause_match: 2,
  reply_choice: 2,
  order: 2,
  find_error: 2,
  word_choice: 2,
  translate_build: 3,
  form_typing: 3,
  star: 3,
}

/** Số mảnh tối thiểu cho dạng sắp xếp, ★ và tìm chỗ sai. */
export const MIN_PIECES_ORDER = 4
export const MIN_PIECES_TRANSLATE = 3

/** Các dạng một câu gốc làm được, suy từ đánh dấu của câu (§4.2). */
export function exercisesFor(s: Pick<GrammarSentenceData, 'pieces' | 'slots' | 'split' | 'prompt'>): GrammarExercise[] {
  const kinds = new Set((s.slots ?? []).map((slot) => slot.kind))
  const n = s.pieces.length
  const out: GrammarExercise[] = ['meaning_choice', 'listening']
  if (kinds.has('particle')) out.push('particle_choice')
  if (kinds.has('word')) out.push('word_choice')
  if (kinds.has('form')) out.push('form_choice', 'form_typing')
  if (kinds.has('particle') || kinds.has('form')) out.push('true_false')
  if ((kinds.has('particle') || kinds.has('form')) && n >= MIN_PIECES_ORDER) out.push('find_error')
  if (n >= MIN_PIECES_ORDER) out.push('order', 'star')
  if (n >= MIN_PIECES_TRANSLATE) out.push('translate_build')
  if (s.split !== undefined) out.push('clause_match')
  if (s.prompt) out.push('reply_choice')
  return GRAMMAR_EXERCISES.filter((e) => out.includes(e))
}

export const KANJI_CHAR = /[一-鿿㐀-䶿々〆]/
export const KANA_ONLY = /^[ぁ-ゖァ-ヺー・ 　]+$/

export const sentenceText = (pieces: readonly GrammarPiece[]) => pieces.map((p) => p.t).join('')
