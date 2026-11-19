
import { type KanjiVisualView } from './visual'

export interface KanjiRow {
  id: string
  character: string
  han_viet: string
  meaning_vi: string
  onyomi: string[]
  kunyomi: string[]
  jlpt_level?: number | null
  /** Số nét (KanjiVG); chỉ có khi đọc danh sách chữ để xếp thứ tự mở chữ mới. */
  stroke_count?: number | null
}

export interface KanjiReveal {
  character: string
  hanViet: string
  meaning: string
  onyomi: string[]
  kunyomi: string[]
  /** V9 R12: bộ thủ, thành phần, nét viết (KanjiVG). Chưa seed thì không có. */
  visual?: KanjiVisualView
}

/** ひと.つ → ひとつ: dấu chấm chỉ ngăn okurigana trong dữ liệu. */
export function showReading(reading: string): string {
  return reading.replace(/\./g, '')
}

/** `withReadings`: hiện âm On/Kun. Thẻ học chỉ hiện khi đã học một Từ Kanji có chữ này (chủ dự án chốt 2026-11-15). */
export function revealOf(kanji: KanjiRow, withReadings = true): KanjiReveal {
  return {
    character: kanji.character,
    hanViet: kanji.han_viet,
    meaning: kanji.meaning_vi,
    onyomi: withReadings ? kanji.onyomi.map(showReading) : [],
    kunyomi: withReadings ? kanji.kunyomi.map(showReading) : [],
  }
}
