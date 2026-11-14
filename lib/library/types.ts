// DTO cho trang Library (API-01). Chỉ chứa đúng thứ UI cần; component không biết tên bảng hay cột DB.
import type { LibraryStatus } from './status'

/** Tiến độ một từ của người đang đăng nhập. */
export type VocabProgress =
  | { kind: 'not_started' }
  /** Stage của nhánh Từ vựng Kana (1–3). */
  | { kind: 'learning'; stage: 1 | 2 | 3 }
  | { kind: 'complete' }

export interface VocabListItem {
  id: string
  code: string
  /** Vị trí trong lộ trình cố định. */
  sortOrder: number
  /** Cách viết thông dụng: 学校 hoặc これ. */
  expression: string
  /** Cách đọc kana: がっこう. */
  reading: string
  meaning: string
  /** null với từ chỉ có kana. */
  hanViet: string | null
  isKanaOnly: boolean
  jlpt: string
  progress: VocabProgress
  /** Bài trong giáo trình. */
  lesson: number | null
  /** Người học đã đánh dấu là đã biết: không còn trong lộ trình. */
  known?: boolean
  /** V10: Learning → Reviewing → Learned. */
  status: LibraryStatus
  /** V10: đang được đánh dấu "đã học" (hoàn tác được). */
  marked?: boolean
}

export interface KanjiListItem {
  id: string
  character: string
  hanViet: string
  meaning: string
  onyomi: string[]
  kunyomi: string[]
  /** Đã đánh dấu là đã biết: không còn trong khu Kanji. */
  known?: boolean
  /** null khi chưa có dữ liệu (hiện là toàn bộ chữ). */
  strokes: number | null
  /** null với các chữ bổ sung chưa xác định cấp. */
  jlpt: string | null
  /** V10: Learning → Reviewing → Learned. */
  status: LibraryStatus
}

export interface LibraryData {
  vocabulary: VocabListItem[]
  kanji: KanjiListItem[]
  starredIds: string[]
  /** V10: chữ Kanji có sao. */
  starredKanjiIds: string[]
}
