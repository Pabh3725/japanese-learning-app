// VOC-01 — Stage 1: chọn từ mới để giới thiệu, đổi dòng DB thành DTO, tính stage sau khi xem xong.
// Pure: không gọi database, không đọc giờ hệ thống. lib/dal/intro.ts dùng các hàm này.

import { completeIntro } from '../learning/stage'
import type { Stage } from '../learning/types'

/** Số từ tối đa mỗi lần giới thiệu. Giới hạn trong ngày do lib/dal/intro.ts áp thêm. */
export const INTRO_WORDS_PER_SESSION = 10

/**
 * Thứ thẻ Stage 1 được phép hiện. Cố ý KHÔNG có `expression` và `han_viet`:
 * Kanji để đến Stage 4, nên không gửi xuống trình duyệt.
 */
export interface IntroWord {
  id: string
  /** Hiragana hoặc Katakana của từ: がっこう, テレビ. */
  reading: string
  /** null khi chưa có dữ liệu: thẻ ẩn dòng này. */
  romaji: string | null
  meaning: string
  /** Chú thích làm quen dưới nghĩa. */
  hanViet: string | null
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
  han_viet?: unknown
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
    hanViet: isNonEmptyString(row.han_viet) ? row.han_viet : null,
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
export function stageAfterIntro(): Stage {
  return completeIntro(1).openedStage
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_WORDS_PER_CHANGE = 200

/** Danh sách từ trình duyệt gửi lên. Sai dạng, rỗng hoặc quá dài trả null; từ trùng chỉ giữ một. */
export function parseVocabularyIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_WORDS_PER_CHANGE) return null
  if (!input.every(isVocabularyId)) return null
  return [...new Set(input as string[])]
}

/** Không tin trình duyệt: chỉ nhận chuỗi UUID. */
export function isVocabularyId(input: unknown): input is string {
  return typeof input === 'string' && UUID.test(input)
}
