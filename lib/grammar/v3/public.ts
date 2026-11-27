// Grammar V3 — dữ liệu gửi xuống trình duyệt: câu hỏi không có đáp án, kết quả chấm. Dùng chung server và client.
import type { V3Piece } from './pieces'
import type { V3Type } from './rules'

export const V3_TYPE_LABEL: Record<V3Type | 'mix', string> = {
  G1: 'Choose the right form',
  G2: 'Right or wrong',
  G3: 'Listen and reply',
  G5: 'Choose the reply',
  G6: 'Find the mistake',
  G7: 'Tell similar patterns apart',
  G9: 'Type or choose the form',
  G10: '★ Sentence order',
  mix: 'Mixed',
}

export interface V3PublicQuestion {
  ref: string
  k: 'choice' | 'tf' | 'err' | 'star' | 'type'
  type: V3Type
  pointCode: string
  /** Nghĩa tiếng Việt (gợi ý); không có ở ★ khó, nghe. */
  vi?: string | null
  /** Câu có ô trống (choice, type) hoặc câu cần xét (tf). */
  text?: V3Piece[]
  /** Hội thoại A–B, ô trống ở lượt B. */
  lines?: { who: string; pieces: V3Piece[] }[]
  /** Chọn câu đáp: câu hỏi hiện bằng chữ. */
  prompt?: V3Piece[]
  promptVi?: string
  /** Nghe: kana để máy đọc, chữ để hiện khi bấm "Show text". */
  audioKana?: string
  audioText?: V3Piece[]
  /** Câu hỏi đi trước làm ngữ cảnh. */
  ctx?: V3Piece[]
  choices?: string[]
  segs?: { pieces: V3Piece[]; marked: boolean }[]
  pre?: V3Piece[]
  post?: V3Piece[]
  chips?: { id: number; text: string }[]
  /** Vị trí ô ★ trong 4 ô. */
  star?: number
  hint?: string
}

export interface V3Bai {
  key: string
  type: V3Type | 'mix'
  /** Intro: mã bài trong ngày ("1:0"), mẫu và tên giai đoạn. */
  dayKey?: string
  pointCode?: string
  pattern?: string
  stage: string
  level?: string
  guide: string
  fallbackFor?: string
  questions: V3PublicQuestion[]
  /** Câu dự phòng cùng mẫu, cùng dạng cho vòng làm lại câu sai. */
  spare: V3PublicQuestion[]
}

export interface V3Intro {
  code: string
  lesson: number
  pattern: string
  meaning: string
  explanation: string
  notes: string | null
  examples: { pieces: V3Piece[]; meaning: string; kana: string }[]
}

export type V3Step = { kind: 'intro'; intro: V3Intro } | { kind: 'bai'; bai: V3Bai }

export interface V3Session {
  mode: 'learn' | 'review'
  steps: V3Step[]
  furigana: boolean
  /** Ôn: lượt của từng mẫu (chấm lịch khi đủ số câu). */
  rounds: Record<string, { roundId: string; size: number }>
  patterns: Record<string, string>
}

export type V3Answer = string | boolean | number | number[]

export interface V3Graded {
  ref: string
  correct: boolean
  /** Đáp án đúng để hiện (chữ). */
  expected: string
  ex: string
  /** Câu đúng (Đúng/Sai, tìm chỗ sai). */
  fix?: string | null
  /** Vị trí đúng: lựa chọn (choice), phần sai (err), true/false (tf). */
  answer?: string | number | boolean
  /** ★: thứ tự đúng của 4 mảnh. */
  order?: string[]
}

export type V3SubmitResponse =
  | { status: 'saved'; results: V3Graded[]; passed?: boolean; completed?: boolean; correct: number }
  | { status: 'invalid' | 'not_found' | 'conflict' | 'not_active' | 'duplicate' }
