// Kiểm tra TOÀN BỘ data trước khi ghi (data-spec §7).
// Hàm thuần: nhận nội dung file, trả kết quả. Không đọc file, không gọi DB,
// không đọc giờ hệ thống → test được độc lập.

import { policyIssues } from '../policy/classify'
import { parsePolicyFile } from '../policy/policy-file'
import { parseCsv } from './csv'
import {
  KANJI_COLUMNS,
  VOCAB_COLUMNS,
  VOCAB_OPTIONAL_COLUMNS,
  kanjiRowSchema,
  toCells,
  vocabRowSchema,
  type KanjiRow,
  type VocabRow,
} from './schema'

export interface Issue {
  file: string
  line: number
  column?: string
  message: string
}

export interface VocabularyKanjiLink {
  code: string // vocabularies.code
  position: number // bắt đầu từ 1 (data-spec §4)
  character: string // kanji.character
}

export interface ValidationResult {
  kanji: (KanjiRow & { study_order: number })[]
  vocabularies: VocabRow[]
  links: VocabularyKanjiLink[]
  /** Có cột emoji trong vocabularies.csv không. Không có thì seed không đụng emoji trong DB. */
  hasEmojiColumn: boolean
  /** Có cột lesson trong vocabularies.csv không. */
  hasLessonColumn: boolean
  /** Có file kanji_policy.csv không. Không có thì seed không đụng chính sách Kanji trong DB. */
  hasPolicy: boolean
  errors: Issue[]
  /** Báo cáo, không chặn seed. */
  warnings: Issue[]
}

export interface SeedFiles {
  kanji: { name: string; text: string }
  vocabularies: { name: string; text: string }
  /** data/n5/kanji_policy.csv (V9 gói 3), tuỳ chọn. */
  policy?: { name: string; text: string }
}

// ---------------------------------------------------------------------------

function parseTable<T>(
  file: { name: string; text: string },
  columns: readonly string[],
  optionalColumns: readonly string[],
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } },
  errors: Issue[],
): { rows: { line: number; row: T }[]; header: string[] } {
  const { records, errors: csvErrors } = parseCsv(file.text)
  for (const e of csvErrors) errors.push({ file: file.name, line: e.line, message: e.message })

  const rows: { line: number; row: T }[] = []
  const headerRec = records[0]
  if (!headerRec) {
    errors.push({ file: file.name, line: 1, message: 'File rỗng' })
    return { rows, header: [] }
  }

  const header = headerRec.cells
  const expected = [...columns]
  const extra = header.slice(columns.length)
  const headerOk =
    header.slice(0, columns.length).join(',') === expected.join(',') &&
    extra.every((c, i) => c === optionalColumns[i])
  if (!headerOk) {
    errors.push({
      file: file.name,
      line: 1,
      message: `Header sai. Cần: ${expected.join(',')}` + (optionalColumns.length ? ` (có thể thêm ,${optionalColumns.join(',')} ở cuối)` : ''),
    })
    return { rows, header }
  }

  for (const rec of records.slice(1)) {
    if (rec.cells.length !== header.length) {
      errors.push({ file: file.name, line: rec.line, message: `Có ${rec.cells.length} cột, cần ${header.length}` })
      continue
    }
    const result = schema.safeParse(toCells(header, rec.cells))
    if (result.success) {
      rows.push({ line: rec.line, row: result.data })
    } else {
      for (const issue of result.error.issues) {
        errors.push({ file: file.name, line: rec.line, column: String(issue.path[0] ?? ''), message: issue.message })
      }
    }
  }
  return { rows, header }
}

function findDuplicates<T>(
  rows: { line: number; row: T }[],
  key: (r: T) => string,
  file: string,
  column: string,
  errors: Issue[],
) {
  const firstSeen = new Map<string, number>()
  for (const { line, row } of rows) {
    const k = key(row)
    const prev = firstSeen.get(k)
    if (prev !== undefined) {
      errors.push({ file, line, column, message: `"${k}" trùng với dòng ${prev}` })
    } else {
      firstSeen.set(k, line)
    }
  }
}

/**
 * Thứ tự học ở khu Kanji: cấp dễ trước (N5 → N1, chữ chưa có cấp cuối cùng).
 * Trong một cấp, chữ gặp trước trong lộ trình từ vựng đứng trước, nên chữ của từ đã học và sắp học ra trước;
 * chữ không có trong từ nào đứng cuối cấp đó.
 */
export function withStudyOrder<K extends { character: string; jlpt_level?: number | null }>(kanji: readonly K[], words: readonly { sort_order: number; expression: string }[]): (K & { study_order: number })[] {
  const firstSeen = new Map<string, number>()
  for (const word of [...words].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const ch of kanjiOf(word.expression)) if (!firstSeen.has(ch)) firstSeen.set(ch, firstSeen.size)
  }
  const ranked = kanji
    .map((k, fileOrder) => ({ k, fileOrder, level: k.jlpt_level ?? 0, seen: firstSeen.get(k.character) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => b.level - a.level || a.seen - b.seen || a.fileOrder - b.fileOrder)
  const order = new Map(ranked.map(({ k }, i) => [k.character, i + 1]))
  return kanji.map((k) => ({ ...k, study_order: order.get(k.character)! }))
}

/** Các Kanji của một từ theo thứ tự; 々 tính là chữ đứng trước (data-spec §4). */
export function kanjiOf(expression: string): string[] {
  const out: string[] = []
  for (const ch of expression) {
    if (ch === '々') {
      const prev = out[out.length - 1]
      if (prev) out.push(prev)
    } else if (/[一-鿿㐀-䶿〆]/.test(ch)) {
      out.push(ch)
    }
  }
  return out
}

// ---------------------------------------------------------------------------

export function validateAll(files: SeedFiles): ValidationResult {
  const errors: Issue[] = []
  const warnings: Issue[] = []

  // 1. Từng dòng (zod)
  const kanji = parseTable<KanjiRow>(files.kanji, KANJI_COLUMNS, [], kanjiRowSchema, errors)
  const vocab = parseTable<VocabRow>(files.vocabularies, VOCAB_COLUMNS, VOCAB_OPTIONAL_COLUMNS, vocabRowSchema, errors)
  const kFile = files.kanji.name
  const vFile = files.vocabularies.name

  // 2. Trùng khoá
  findDuplicates(kanji.rows, (r) => r.character, kFile, 'character', errors)
  findDuplicates(vocab.rows, (r) => r.code, vFile, 'code', errors)
  findDuplicates(vocab.rows, (r) => String(r.sort_order), vFile, 'sort_order', errors)
  findDuplicates(vocab.rows, (r) => `${r.expression} / ${r.reading_kana}`, vFile, 'expression', errors)

  // 3. Hán Việt của từ khớp số Kanji và khớp bảng kanji; dựng liên kết từ ↔ Kanji
  const hanVietOf = new Map(kanji.rows.map(({ row }) => [row.character, row.han_viet]))
  const links: VocabularyKanjiLink[] = []

  for (const { line, row } of vocab.rows) {
    if (row.is_kana_only) continue
    const chars = kanjiOf(row.expression)
    const syllables = (row.han_viet ?? '').split(' ')

    if (syllables.length !== chars.length) {
      errors.push({
        file: vFile,
        line,
        column: 'han_viet',
        message: `${row.expression} có ${chars.length} Kanji nhưng Hán Việt "${row.han_viet}" có ${syllables.length} âm`,
      })
      continue
    }

    let ok = true
    chars.forEach((ch, i) => {
      const expected = hanVietOf.get(ch)
      if (expected === undefined) {
        ok = false
        errors.push({ file: vFile, line, column: 'expression', message: `Kanji ${ch} chưa có trong ${kFile}; thêm chữ đó vào ${kFile} trước` })
      } else if (expected !== syllables[i]) {
        ok = false
        errors.push({
          file: vFile,
          line,
          column: 'han_viet',
          message: `âm thứ ${i + 1} là "${syllables[i]}" nhưng ${ch} trong ${kFile} là "${expected}"`,
        })
      }
    })
    if (ok) chars.forEach((character, i) => links.push({ code: row.code, position: i + 1, character }))
  }

  // 4. Báo cáo không chặn (data-spec §7, dòng cuối)
  const byMeaning = new Map<string, { line: number; expression: string }[]>()
  for (const { line, row } of vocab.rows) {
    // So cả chuỗi nghĩa sau trim + viết thường, như quy tắc chọn distractor (data-spec §5)
    const key = row.meaning_vi.trim().toLowerCase()
    byMeaning.set(key, [...(byMeaning.get(key) ?? []), { line, expression: row.expression }])
  }
  for (const [meaning, list] of byMeaning) {
    if (list.length > 1) {
      warnings.push({
        file: vFile,
        line: list[0].line,
        column: 'meaning_vi',
        message: `nghĩa "${meaning}" dùng chung cho: ${list.map((x) => `${x.expression} (dòng ${x.line})`).join(', ')}`,
      })
    }
  }
  for (const { line, row } of vocab.rows) {
    if (/[ぁ-ゖァ-ヺ一-鿿々]/.test(row.meaning_vi)) {
      warnings.push({ file: vFile, line, column: 'meaning_vi', message: 'nghĩa chứa chữ Nhật (có thể lộ đáp án)' })
    }
  }

  // 5. Chính sách Kanji của từ: mỗi từ đúng một dòng, nhãn hợp với từ
  const policyOf = files.policy ? validatePolicy(files.policy, vocab.rows, errors) : null

  errors.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

  return {
    kanji: withStudyOrder(kanji.rows.map((r) => r.row), vocab.rows.map((r) => r.row)),
    vocabularies: vocab.rows.map(({ row }) => {
      if (!policyOf) return row
      const p = policyOf.get(row.code)
      return { ...row, kanji_policy: p?.policy ?? null, kanji_target_level: p?.targetLevel ?? null }
    }),
    links,
    hasEmojiColumn: vocab.header.includes('emoji'),
    hasLessonColumn: vocab.header.includes('lesson'),
    hasPolicy: policyOf !== null,
    errors,
    warnings,
  }
}

function validatePolicy(
  file: { name: string; text: string },
  vocabRows: { line: number; row: VocabRow }[],
  errors: Issue[],
): Map<string, { policy: string; targetLevel: number | null }> {
  const parsed = parsePolicyFile(file.text)
  for (const e of parsed.errors) errors.push({ file: file.name, line: e.line, message: e.message })
  const words = new Map(vocabRows.map(({ row }) => [row.code, row]))
  const out = new Map<string, { policy: string; targetLevel: number | null }>()
  parsed.rows.forEach((row, i) => {
    const line = i + 2
    const word = words.get(row.code)
    if (!word) {
      errors.push({ file: file.name, line, column: 'code', message: `${row.code} không có trong vocabularies.csv` })
      return
    }
    if (out.has(row.code)) {
      errors.push({ file: file.name, line, column: 'code', message: `${row.code} có hai dòng` })
      return
    }
    for (const message of policyIssues(row, { isKanaOnly: word.is_kana_only, wordLevel: word.jlpt_level })) {
      errors.push({ file: file.name, line, column: 'policy', message: `${row.expression}: ${message}` })
    }
    out.set(row.code, { policy: row.policy, targetLevel: row.targetLevel })
  })
  const missing = [...words.keys()].filter((code) => !out.has(code))
  if (missing.length > 0 && parsed.errors.length === 0) {
    errors.push({ file: file.name, line: 1, message: `Thiếu ${missing.length} từ: ${missing.slice(0, 10).join(', ')}. Chạy pnpm policy:propose.` })
  }
  return out
}

export function formatIssue(i: Issue): string {
  return `${i.file} dòng ${i.line}${i.column ? `, cột ${i.column}` : ''}: ${i.message}`
}
