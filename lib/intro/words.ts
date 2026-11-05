// VOC-01 — Stage 1: chọn từ mới để giới thiệu, đổi dòng DB thành DTO, tính stage sau khi xem xong.
// Pure: không gọi database, không đọc giờ hệ thống. lib/dal/intro.ts dùng các hàm này.

import { completeIntro, newWordState } from '../learning/stage'
import type { Stage } from '../learning/types'

/** Số từ mỗi lần giới thiệu. Tạm thời, chưa áp quota từ mới/ngày: SES-01 sẽ thay phần chọn từ. */
export const INTRO_WORDS_PER_SESSION = 10

/**
 * Thứ thẻ Stage 1 được phép hiện. Cố ý KHÔNG có `expression` và `han_viet`:
 * Kanji và Hán Việt để đến Stage 3, nên không gửi xuống trình duyệt.
 */
export interface IntroWord {
  id: string
  /** Hiragana hoặc Katakana của từ: がっこう, テレビ. */
  reading: string
  /** null khi chưa có dữ liệu: thẻ ẩn dòng này. */
  romaji: string | null
  meaning: string
  emoji: string | null
  jlpt: string
}

export interface IntroVocabRow {
  id: unknown
  reading_kana: unknown
  romaji?: unknown
  meaning_vi: unknown
  emoji?: unknown
  jlpt_level: unknown
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/** Dòng `vocabularies` → thẻ, hoặc null nếu thiếu trường bắt buộc. */
export function toIntroWord(row: IntroVocabRow): IntroWord | null {
  const level = row.jlpt_level
  if (
    !isNonEmptyString(row.id) ||
    !isNonEmptyString(row.reading_kana) ||
    !isNonEmptyString(row.meaning_vi) ||
    typeof level !== 'number' ||
    level < 1 ||
    level > 5
  ) {
    return null
  }
  return {
    id: row.id,
    reading: row.reading_kana,
    romaji: isNonEmptyString(row.romaji) ? row.romaji : null,
    meaning: row.meaning_vi,
    emoji: isNonEmptyString(row.emoji) ? row.emoji : null,
    jlpt: `N${level}`,
  }
}

/**
 * Lấy `limit` từ đầu tiên chưa học và chưa bị loại, giữ nguyên thứ tự lộ trình.
 * `rows` phải được sắp theo `sort_order` sẵn.
 */
export function pickNewWords<T extends { id: unknown }>(
  rows: readonly T[],
  startedIds: ReadonlySet<string>,
  excludedIds: ReadonlySet<string>,
  limit: number = INTRO_WORDS_PER_SESSION,
): T[] {
  const picked: T[] = []
  for (const row of rows) {
    if (picked.length >= limit) break
    if (typeof row.id !== 'string' || startedIds.has(row.id) || excludedIds.has(row.id)) continue
    picked.push(row)
  }
  return picked
}

/** Stage của từ ngay sau khi xem xong thẻ Stage 1. Luật nằm ở engine (R1), không viết lại ở đây. */
export function stageAfterIntro(isKanaOnly: boolean): Stage {
  const { stage } = completeIntro(newWordState(isKanaOnly)).state
  if (stage === 'complete') throw new Error('Stage 1 không thể dẫn tới hoàn thành')
  return stage
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Không tin trình duyệt: chỉ nhận chuỗi UUID. */
export function isVocabularyId(input: unknown): input is string {
  return typeof input === 'string' && UUID.test(input)
}
