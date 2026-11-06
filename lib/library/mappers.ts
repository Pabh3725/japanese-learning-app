// Đổi dòng dữ liệu thô từ database thành DTO, có kiểm tra (validation).
// Hàm thuần: không đọc DB, có unit test. Dòng sai dạng trả về null để một dòng hỏng
// không làm vỡ cả trang; DAL đếm và ghi cảnh báo.

import type { KanjiListItem, VocabListItem, VocabProgress } from './types'

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function optionalString(v: unknown): string | null {
  return isNonEmptyString(v) ? v : null
}

function jlptLabel(level: unknown): string | null {
  return typeof level === 'number' && level >= 1 && level <= 5 ? `N${level}` : null
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(isNonEmptyString) : []
}

/** Dòng `learner_vocabulary` → tiến độ. Không có dòng nghĩa là chưa học. */
export function toProgress(row: unknown): VocabProgress {
  if (!row || typeof row !== 'object') return { kind: 'not_started' }
  const r = row as Record<string, unknown>
  if (r.learning_status === 'initial_complete') return { kind: 'complete' }
  const stage = r.current_stage
  if (typeof stage === 'number' && Number.isInteger(stage) && stage >= 1 && stage <= 5) {
    return { kind: 'learning', stage: stage as 1 | 2 | 3 | 4 | 5 }
  }
  return { kind: 'not_started' }
}

/** Dòng `vocabularies` → item, hoặc null nếu thiếu trường bắt buộc. */
export function toVocabListItem(row: unknown, progressRow?: unknown): VocabListItem | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.code) ||
    typeof r.sort_order !== 'number' ||
    !isNonEmptyString(r.expression) ||
    !isNonEmptyString(r.reading_kana) ||
    !isNonEmptyString(r.meaning_vi)
  ) {
    return null
  }
  return {
    id: r.id,
    code: r.code,
    sortOrder: r.sort_order,
    expression: r.expression,
    reading: r.reading_kana,
    meaning: r.meaning_vi,
    hanViet: optionalString(r.han_viet),
    isKanaOnly: r.is_kana_only === true,
    jlpt: jlptLabel(r.jlpt_level) ?? 'N5',
    progress: toProgress(progressRow),
    lesson: typeof r.lesson === 'number' ? r.lesson : null,
  }
}

/** Ghép danh sách từ với tiến độ của người học; giữ thứ tự lộ trình. */
export function toVocabList(
  vocabRows: unknown[],
  progressRows: unknown[],
): { items: VocabListItem[]; invalid: number } {
  const progressById = new Map<string, unknown>()
  for (const p of progressRows) {
    const id = (p as Record<string, unknown> | null)?.vocabulary_id
    if (typeof id === 'string') progressById.set(id, p)
  }
  const items: VocabListItem[] = []
  let invalid = 0
  for (const row of vocabRows) {
    const id = (row as Record<string, unknown> | null)?.id
    const item = toVocabListItem(row, typeof id === 'string' ? progressById.get(id) : undefined)
    if (item) items.push(item)
    else invalid++
  }
  items.sort((a, b) => a.sortOrder - b.sortOrder)
  return { items, invalid }
}

/** Dòng `kanji` → item, hoặc null nếu thiếu trường bắt buộc. */
export function toKanjiListItem(row: unknown): KanjiListItem | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  if (
    !isNonEmptyString(r.id) ||
    !isNonEmptyString(r.character) ||
    !isNonEmptyString(r.han_viet) ||
    !isNonEmptyString(r.meaning_vi)
  ) {
    return null
  }
  return {
    id: r.id,
    character: r.character,
    hanViet: r.han_viet,
    meaning: r.meaning_vi,
    onyomi: stringArray(r.onyomi),
    kunyomi: stringArray(r.kunyomi),
    strokes: typeof r.stroke_count === 'number' && r.stroke_count > 0 ? r.stroke_count : null,
    jlpt: jlptLabel(r.jlpt_level),
  }
}

export function toKanjiList(rows: unknown[]): { items: KanjiListItem[]; invalid: number } {
  const items: KanjiListItem[] = []
  let invalid = 0
  for (const row of rows) {
    const item = toKanjiListItem(row)
    if (item) items.push(item)
    else invalid++
  }
  return { items, invalid }
}
