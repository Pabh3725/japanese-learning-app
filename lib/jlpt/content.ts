// JLPT đợt 2 (docs/jlpt-rules.md §3b): nội dung soạn sẵn (data/jlpt/*.json, sinh bằng scripts/jlpt-content) → câu hỏi. Pure.
import type { JlptLevel, JlptType } from './catalog'
import type { JlptQuestion, StemPiece } from './questions'
import { shuffle } from './reading'

type Rng = () => number

/** Mảnh đã soạn: chữ, cách đọc, gạch chân, ô trống. */
export interface AuthoredPiece {
  t: string
  r?: string
  u?: boolean
  blank?: boolean
}

interface Base {
  code: string
  approved?: boolean
}
export interface ContextualItem extends Base {
  stem: AuthoredPiece[]
  options: string[]
  answer: number
  explanation: string
}
export interface UsageItem extends Base {
  word: string
  options: AuthoredPiece[][]
  answer: number
  explanation: string
}
export interface PassageQuestion {
  q?: AuthoredPiece[]
  blank?: number
  options: string[]
  answer: number
  explanation: string
}
export interface PassageItem extends Base {
  kind?: 'short' | 'mid' | 'info'
  title?: AuthoredPiece[]
  passage: AuthoredPiece[][]
  questions: PassageQuestion[]
}
export interface ListeningItem extends Base {
  kind: 'task' | 'point'
  question: AuthoredPiece[]
  script: { sp: 'M' | 'F' | 'N'; text: AuthoredPiece[] }[]
  options: string[]
  answer: number
  explanation: string
}
export interface VerbalItem extends Base {
  situation: string
  emoji: string
  options: string[]
  answer: number
  explanation: string
}

/** Nội dung soạn sẵn của một cấp, theo dạng. */
export interface LevelContent {
  contextual?: ContextualItem[]
  paraphrase?: ContextualItem[]
  usage?: UsageItem[]
  text_grammar?: PassageItem[]
  reading?: PassageItem[]
  listening_task?: ListeningItem[]
  verbal_expressions?: VerbalItem[]
}

export const CONTENT_TYPES = ['contextual', 'paraphrase', 'usage', 'text_grammar', 'reading', 'listening_task', 'verbal_expressions'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]
export const isContentType = (t: JlptType): t is ContentType => (CONTENT_TYPES as readonly string[]).includes(t)

const toStem = (pieces: readonly AuthoredPiece[]): StemPiece[] =>
  pieces.map((p) => (p.blank ? { t: p.t, mark: 'blank' as const } : { t: p.t, ...(p.r ? { r: p.r } : {}), ...(p.u ? { mark: 'underline' as const } : {}) }))
const textOf = (pieces: readonly AuthoredPiece[]) => pieces.map((p) => p.t).join('')
const kanaOf = (pieces: readonly AuthoredPiece[]) => pieces.map((p) => p.r ?? p.t).join('')

/** Xáo lựa chọn, đổi theo chỉ số đáp án. */
function shuffled<T>(options: readonly T[], answer: number, rng: Rng): { options: T[]; answer: number } {
  const order = shuffle(options.map((_, i) => i), rng)
  return { options: order.map((i) => options[i]), answer: order.indexOf(answer) }
}

const INSTRUCTION: Record<ContentType, string> = {
  contextual: 'Choose the word that fits in the blank.',
  paraphrase: 'Choose the sentence closest in meaning to the underlined part.',
  usage: 'Choose the sentence that uses the word correctly.',
  text_grammar: 'Read the passage. Choose what fits in the numbered blank.',
  reading: 'Read the text and answer the question.',
  listening_task: 'Listen and choose the answer.',
  verbal_expressions: 'Read the situation, listen, and choose what to say.',
}

/**
 * Câu hỏi từ một mục đã soạn. Mục có đoạn văn (文章の文法, 読解) cho ra nhiều câu, mỗi câu kèm đoạn văn.
 * `ref` = mã mục (và số câu), để không lặp trong một phiên.
 */
export function contentQuestions(type: ContentType, item: ContextualItem | UsageItem | PassageItem | ListeningItem | VerbalItem, rng: Rng): JlptQuestion[] {
  const base = { type: type as JlptType, instruction: INSTRUCTION[type] }
  switch (type) {
    case 'contextual':
    case 'paraphrase': {
      const it = item as ContextualItem
      return [{ ...base, ref: it.code, stem: toStem(it.stem), ...shuffled(it.options, it.answer, rng), explanation: it.explanation }]
    }
    case 'usage': {
      const it = item as UsageItem
      const s = shuffled(it.options, it.answer, rng)
      return [{ ...base, ref: it.code, stem: [{ t: it.word, mark: 'underline' }], options: s.options.map(textOf), optionStems: s.options.map(toStem), answer: s.answer, explanation: it.explanation }]
    }
    case 'text_grammar':
    case 'reading': {
      const it = item as PassageItem
      const passage = it.passage.map(toStem)
      return it.questions.map((q, i) => {
        const mark = type === 'text_grammar' ? '①②③④⑤'[(q.blank ?? i + 1) - 1] : undefined
        return {
          ...base,
          instruction: mark ? `Read the passage. Choose what fits in blank ${mark}.` : base.instruction,
          blankMark: mark,
          ref: `${it.code}#${i + 1}`,
          title: it.title ? toStem(it.title) : undefined,
          passage,
          stem: q.q ? toStem(q.q) : null,
          ...shuffled(q.options, q.answer, rng),
          explanation: q.explanation,
        }
      })
    }
    case 'listening_task': {
      const it = item as ListeningItem
      return [
        {
          ...base,
          ref: it.code,
          stem: toStem(it.question),
          ...shuffled(it.options, it.answer, rng),
          explanation: `${it.explanation}\n\n${it.script.map((l) => `${l.sp === 'N' ? '' : l.sp === 'M' ? '男：' : '女：'}${textOf(l.text)}`).join('\n')}`,
          // Câu hỏi đọc trước, rồi hội thoại, rồi đọc lại câu hỏi (như đề thật)
          script: [{ sp: 'N', text: kanaOf(it.question) }, ...it.script.map((l) => ({ sp: l.sp, text: kanaOf(l.text) })), { sp: 'N', text: kanaOf(it.question) }],
        },
      ]
    }
    case 'verbal_expressions': {
      const it = item as VerbalItem
      const s = shuffled(it.options, it.answer, rng)
      return [
        {
          ...base,
          ref: it.code,
          stem: null,
          situation: `${it.emoji} ${it.situation}`,
          ...s,
          explanation: it.explanation,
          // Đọc lần lượt 3 câu nói, đánh số như đề thật
          script: s.options.map((o, i) => ({ sp: 'N' as const, text: `${i + 1}。${o}` })),
        },
      ]
    }
  }
}

/** Mục đã duyệt của một dạng. */
export function approvedItems(content: LevelContent, type: ContentType) {
  return ((content[type] ?? []) as Base[]).filter((i) => i.approved === true)
}

export type { JlptLevel }
