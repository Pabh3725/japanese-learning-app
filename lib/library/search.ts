// Tìm kiếm trong Library: không phân biệt hoa thường, không phân biệt dấu tiếng Việt.
// "truong hoc" khớp "trường học"; "hoc" khớp "HỌC".

import type { KanjiListItem, VocabListItem } from './types'

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function matches(query: string, fields: (string | null)[]): boolean {
  const q = normalizeSearch(query)
  if (!q) return true
  return fields.some((f) => f !== null && normalizeSearch(f).includes(q))
}

export function matchesVocab(item: VocabListItem, query: string): boolean {
  return matches(query, [item.expression, item.reading, item.meaning, item.hanViet, item.code])
}

export function matchesKanji(item: KanjiListItem, query: string): boolean {
  return matches(query, [item.character, item.hanViet, item.meaning, ...item.onyomi, ...item.kunyomi])
}
