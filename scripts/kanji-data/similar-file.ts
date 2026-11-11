// File data/n5/kanji_similar.csv: đọc, ghép đề xuất mới với cặp đã duyệt, ghi lại. Pure.
import { parseCsv } from '../seed/csv'
import type { SimilarPair } from './similar'

export const SIMILAR_COLUMNS = ['a', 'b', 'score', 'explanation', 'approved'] as const

export interface SimilarRow extends SimilarPair {
  explanation: string
  /** Chủ dự án đã duyệt: dùng cho câu hỏi, chạy lại script không ghi đè. */
  approved: boolean
}

const keyOf = (a: string, b: string) => [a, b].sort().join('')

export function parseSimilarFile(text: string): SimilarRow[] {
  const { records } = parseCsv(text)
  if (records[0]?.cells.join(',') !== SIMILAR_COLUMNS.join(',')) throw new Error(`kanji_similar.csv: header phải là ${SIMILAR_COLUMNS.join(',')}`)
  return records.slice(1).map((r) => {
    const [a, b, score, explanation, approved] = r.cells
    if (approved !== 'true' && approved !== 'false') throw new Error(`kanji_similar.csv dòng ${r.line}: approved phải là true hoặc false`)
    return { a, b, score: Number(score), explanation, approved: approved === 'true' }
  })
}

/** Cặp đã duyệt giữ nguyên (kể cả khi đề xuất mới không còn); cặp chưa duyệt lấy theo đề xuất mới. */
export function mergeSimilar(proposals: readonly (SimilarPair & { explanation: string })[], existing: readonly SimilarRow[]): SimilarRow[] {
  const approved = existing.filter((r) => r.approved)
  const done = new Set(approved.map((r) => keyOf(r.a, r.b)))
  const fresh = proposals.filter((p) => !done.has(keyOf(p.a, p.b))).map((p) => ({ ...p, approved: false }))
  return [...approved, ...fresh].sort((x, y) => y.score - x.score || keyOf(x.a, x.b).localeCompare(keyOf(y.a, y.b)))
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function formatSimilarFile(rows: readonly SimilarRow[]): string {
  return [SIMILAR_COLUMNS.join(','), ...rows.map((r) => [r.a, r.b, String(r.score), r.explanation, String(r.approved)].map(cell).join(','))].join('\n') + '\n'
}
