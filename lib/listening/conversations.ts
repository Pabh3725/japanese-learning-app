// Luyện nghe đợt B (docs/listening-rules.md §V2.3, §V2.4): hội thoại theo bài — nghe điền chỗ trống, chép chính tả theo đoạn.
// Nội dung soạn bằng scripts/listening-content (data/listening/conversations.json), chỉ dùng hội thoại đã duyệt. Pure.
import { shuffle } from '../jlpt/reading'
import type { StemPiece } from '../jlpt/questions'
import { PUNCT, withAnswer, type ListeningQuestion, type ScriptLine } from './questions'

type Rng = () => number

export interface ConvPiece {
  t: string
  r?: string
}
export interface ConvLine {
  sp: 'M' | 'F'
  pieces: ConvPiece[]
  meaning: string
}
export interface ConvBlank {
  line: number
  piece: number
  /** Đáp án ở vị trí `answer` (soạn ở đầu, app xáo khi dựng phiên). */
  options: string[]
  answer: number
}
export interface Conversation {
  code: string
  lesson: number
  kind: 'short' | 'long'
  title: string
  situation: string
  lines: ConvLine[]
  blanks: ConvBlank[]
  /** Mã mẫu ngữ pháp dùng trong hội thoại. */
  patterns: string[]
  approved?: boolean
}

export const CONVERSATION = {
  /** Dictation theo đoạn: lượt dài hơn chừng này chữ thì tách theo câu (。). */
  passageLineMaxChars: 24,
} as const

const kanaOf = (pieces: readonly ConvPiece[]) => pieces.map((p) => p.r ?? p.t).join('')
const textOf = (pieces: readonly ConvPiece[]) => pieces.map((p) => p.t).join('')
const toStem = (pieces: readonly ConvPiece[]): StemPiece[] => pieces.map((p) => (p.r ? { t: p.t, r: p.r } : { t: p.t }))

export const approvedConversations = (all: readonly Conversation[]) => all.filter((c) => c.approved === true)

/** Lời máy đọc của cả hội thoại (kana), mỗi lượt một dòng. */
export const conversationScript = (c: Conversation): ScriptLine[] => c.lines.map((l) => ({ sp: l.sp, text: kanaOf(l.pieces) }))

/** Phần lưu trong phiên: thứ tự lựa chọn đã xáo của từng ô (chấm ở server). */
export interface StoredConversation {
  code: string
  blanks: { options: string[]; answer: number }[]
}

export function buildConversationSession(c: Conversation, rng: Rng): StoredConversation {
  return { code: c.code, blanks: c.blanks.map((b) => withAnswer(b.options[b.answer], b.options.filter((_, i) => i !== b.answer), rng)) }
}

/** Lời có ô trống, gửi cho trình duyệt trước khi nộp (chưa có đáp án, chưa có nghĩa). */
export interface PublicConvLine {
  sp: 'M' | 'F'
  /** Mảnh chữ; ô trống là { t: '', blank: số thứ tự ô }. */
  pieces: (ConvPiece & { blank?: number })[]
}

export function publicLines(c: Conversation): PublicConvLine[] {
  return c.lines.map((l, li) => ({
    sp: l.sp,
    pieces: l.pieces.map((p, pi) => {
      const b = c.blanks.findIndex((x) => x.line === li && x.piece === pi)
      return b === -1 ? { t: p.t } : { t: '', blank: b }
    }),
  }))
}

/** Chấm: đúng / sai từng ô. Ô chưa chọn là sai. */
export function gradeConversation(stored: StoredConversation, given: readonly (number | null)[]): boolean[] {
  return stored.blanks.map((b, i) => given[i] === b.answer)
}

/**
 * Chép chính tả theo đoạn: mỗi lượt nói một câu gõ, theo thứ tự; lượt dài thì tách theo câu (。).
 * `before`: lời từ đầu đoạn tới trước câu này (để nghe lại cả đoạn tới câu đang chép).
 */
export function passageDictation(c: Conversation): ListeningQuestion[] {
  const parts: { sp: 'M' | 'F'; pieces: ConvPiece[]; line: number; part: number }[] = []
  c.lines.forEach((l, li) => {
    const chars = textOf(l.pieces).replace(PUNCT, '').length
    if (chars <= CONVERSATION.passageLineMaxChars) return parts.push({ sp: l.sp, pieces: l.pieces, line: li, part: 0 })
    let cur: ConvPiece[] = []
    let part = 0
    for (const p of l.pieces) {
      cur.push(p)
      if (p.t.includes('。')) {
        parts.push({ sp: l.sp, pieces: cur, line: li, part: part++ })
        cur = []
      }
    }
    if (cur.length > 0) parts.push({ sp: l.sp, pieces: cur, line: li, part })
  })
  const out: ListeningQuestion[] = []
  parts.forEach((p, i) => {
    const kana = kanaOf(p.pieces)
    // Chỉ chép được câu đọc ra toàn kana (không chữ số, không chữ Latin)
    if (!/^[ぁ-ゖァ-ヺー]+$/.test(kana.replace(PUNCT, ''))) return
    out.push({
      type: 'dictation',
      ref: `${c.code}@${p.line + 1}.${p.part}`,
      instruction: `Line ${p.line + 1}: type what you hear.`,
      script: [{ sp: p.sp, text: kana }],
      before: parts.slice(0, i).map((x) => ({ sp: x.sp, text: kanaOf(x.pieces) })),
      options: [],
      input: 'hiragana',
      answer: kana,
      explanation: `${textOf(p.pieces)} — ${c.lines[p.line].meaning}`,
      transcript: [{ sp: p.sp, pieces: toStem(p.pieces) }],
    })
  })
  return out
}

/** Dựng lại câu chép theo đoạn từ mã (danh sách câu nghe sai): `<mã hội thoại>@<lượt>.<phần>`. */
export function passageLineOf(all: readonly Conversation[], ref: string): ListeningQuestion | null {
  const code = ref.slice(0, ref.indexOf('@'))
  const c = all.find((x) => x.code === code)
  if (!c) return null
  const q = passageDictation(c).find((x) => x.ref === ref)
  return q ? { ...q, before: [] } : null
}

/** Ô trống của hội thoại thành câu nghe lẻ (danh sách câu nghe sai): nghe lượt đó, chọn từ nghe được. Mã: `<mã>#<số ô>`. */
export function blankQuestionOf(all: readonly Conversation[], ref: string, rng: Rng): ListeningQuestion | null {
  const [code, n] = ref.split('#')
  const c = all.find((x) => x.code === code)
  const b = c?.blanks[Number(n)]
  if (!c || !b) return null
  const line = c.lines[b.line]
  return {
    type: 'conversation_blank',
    ref,
    instruction: 'Listen to the line and choose the word you hear.',
    script: [{ sp: line.sp, text: kanaOf(line.pieces) }],
    stem: line.pieces.map((p, i) => (i === b.piece ? { t: '（　）' } : p.r ? { t: p.t, r: p.r } : { t: p.t })),
    ...withAnswer(b.options[b.answer], shuffle(b.options.filter((_, i) => i !== b.answer), rng), rng),
    explanation: `${textOf(line.pieces)} — ${line.meaning}`,
    transcript: [{ sp: line.sp, pieces: toStem(line.pieces) }],
  }
}
