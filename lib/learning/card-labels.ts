import type { CardType } from './types'

/** Tên hiển thị của từng loại Card. */
export const CARD_LABELS: Record<CardType, string> = {
  'vocab.kana': 'Kana card',
  'vocab.kanji': 'Kanji word card',
  'vocab.star_recall': 'Starred recall',
}
