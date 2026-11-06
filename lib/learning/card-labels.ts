import type { CardType } from './types'

/** Tên hiển thị của từng loại Card. */
export const CARD_LABELS: Record<CardType, string> = {
  'vocab.meaning_kana': 'Meaning ↔ Kana',
  'vocab.kana_hanviet': 'Kana ↔ Sino-Vietnamese',
  'vocab.meaning_kanji': 'Meaning → Kanji',
  'vocab.kanji_meaning_hanviet': 'Kanji → Meaning, Sino-Vietnamese',
  'vocab.meaning_hanviet': 'Meaning ↔ Sino-Vietnamese',
  'vocab.star_recall': 'Starred recall',
}
