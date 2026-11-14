// Kiểu và nhãn của kho lưu trữ Card (V9 R13), dùng được cả ở server và trình duyệt.
import { CARD_LABELS } from '@/lib/learning/card-labels'
import type { CardType } from '@/lib/learning/types'

/** vocab: review_cards (Từ vựng, Từ vựng Kanji, Card sao). kanji: learner_kanji_cards. */
export type CardKind = 'vocab' | 'kanji'
export type ArchiveCardType = CardType | 'kanji.meaning' | 'kanji.hanviet' | 'kanji.star'

export const ARCHIVE_TYPE_LABELS: Record<ArchiveCardType, string> = {
  ...CARD_LABELS,
  'kanji.meaning': 'Kanji meaning card',
  'kanji.hanviet': 'Kanji Sino-Vietnamese card',
  'kanji.star': 'Starred Kanji card',
}

export interface ArchivedCard {
  kind: CardKind
  id: string
  type: ArchiveCardType
  /** Từ (学校) hoặc chữ (学). */
  title: string
  /** Cách đọc của từ, hoặc Hán Việt của chữ. */
  subtitle: string
  meaning: string
  archivedAt: string
  /** Lịch lúc lưu trữ: Card vẫn giữ nguyên lịch này. */
  stability: number
  dueAt: string
  reps: number
  lapses: number
}
