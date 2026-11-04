// zod schema cho MỘT dòng CSV (data-spec §2, §3).
// Luật cần nhìn nhiều dòng cùng lúc (trùng code, Hán Việt khớp bảng kanji...)
// nằm ở validate.ts.
//
// Chỉ dùng phần API chung của zod 3 và zod 4 (string, refine, regex, transform,
// safeParse) để không phụ thuộc phiên bản.

import { z } from 'zod'

// ---------- Ký tự ----------
export const KANJI_CHAR = /[一-鿿㐀-䶿々〆]/
export const KANJI_ONLY = /^[一-鿿㐀-䶿]$/
export const KANA_ONLY = /^[ぁ-ゖァ-ヺー]+$/
export const KATAKANA = /^[ァ-ヺー]+$/
export const KUN_READING = /^[ぁ-ゖー.\-]+$/

export function hasKanji(s: string): boolean {
  return KANJI_CHAR.test(s)
}

// ---------- Mảnh ghép dùng chung ----------
/** Ô trong CSV: '' đã được đổi thành null trước khi parse. */
type Cell = string | null

const required = (label = 'không được rỗng') =>
  z
    .string()
    .nullable()
    .refine((v): v is string => v !== null, label)
    .transform((v) => v as string)

/** Không khoảng trắng thừa, không "( x )", không "; ;" (data-spec §7). */
const tidy = (v: string) =>
  v === v.trim() &&
  !v.includes('  ') &&
  !v.includes('( ') &&
  !v.includes(' )') &&
  !/;\s*;/.test(v) &&
  !/;(?! )/.test(v)

const tidyText = () => required().refine(tidy, 'có khoảng trắng thừa, "( x )", ";;" hoặc ";" không có dấu cách phía sau')

const intIn = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/, 'phải là số nguyên')
    .transform(Number)
    .refine((n) => n >= min && n <= max, `phải trong khoảng ${min}–${max}`)

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .nullable()
    .refine((v) => v === null || /^\d+$/.test(v), 'phải là số nguyên hoặc để trống')
    .transform((v) => (v === null ? null : Number(v)))
    .refine((n) => n === null || (n >= min && n <= max), `phải trong khoảng ${min}–${max}`)

/** Cột không bắt buộc: null cho qua, có giá trị thì phải thoả check. */
const optionalText = (check: (v: string) => boolean, label: string) =>
  z
    .string()
    .nullable()
    .refine((v) => v === null || check(v), label)

const upperHanViet = (v: string) => v === v.toUpperCase()

/** Mảng Postgres dạng {"イチ","イツ"} hoặc {} → string[]. Trả null nếu sai cú pháp. */
export function parsePgArray(src: string): string[] | null {
  if (!src.startsWith('{') || !src.endsWith('}')) return null
  const inner = src.slice(1, -1)
  if (inner === '') return []
  const out: string[] = []
  let i = 0
  while (i <= inner.length) {
    let item = ''
    if (inner[i] === '"') {
      i++
      while (i < inner.length && inner[i] !== '"') {
        if (inner[i] === '\\') i++
        item += inner[i++] ?? ''
      }
      if (inner[i] !== '"') return null
      i++
    } else {
      while (i < inner.length && inner[i] !== ',') item += inner[i++]
      item = item.trim()
    }
    if (item === '') return null
    out.push(item)
    if (i === inner.length) break
    if (inner[i] !== ',') return null
    i++
  }
  return out
}

const pgArray = (re: RegExp, label: string) =>
  required('phải có, dùng {} nếu không có âm nào')
    .transform((v, ctx) => {
      const arr = parsePgArray(v)
      if (arr === null) {
        ctx.addIssue({ code: 'custom', message: 'sai định dạng mảng Postgres, ví dụ {"ガク"} hoặc {}' })
        return [] as string[]
      }
      return arr
    })
    .refine((arr) => arr.every((x) => re.test(x)), label)

// ---------- kanji.csv ----------
export const KANJI_COLUMNS = ['character', 'han_viet', 'meaning_vi', 'onyomi', 'kunyomi', 'stroke_count', 'jlpt_level'] as const

export const kanjiRowSchema = z.object({
  character: required().refine((v) => KANJI_ONLY.test(v), 'phải đúng 1 chữ Kanji'),
  han_viet: tidyText()
    .refine(upperHanViet, 'phải viết HOA')
    .refine((v) => !v.includes(' '), 'chỉ một âm, không có dấu cách'),
  meaning_vi: tidyText(),
  onyomi: pgArray(KATAKANA, 'âm On phải là Katakana'),
  kunyomi: pgArray(KUN_READING, 'âm Kun phải là Hiragana (dấu . ngăn okurigana)'),
  stroke_count: optionalInt(1, 64),
  jlpt_level: optionalInt(1, 5),
})
export type KanjiRow = z.infer<typeof kanjiRowSchema>

// ---------- vocabularies.csv ----------
export const VOCAB_COLUMNS = [
  'code',
  'sort_order',
  'expression',
  'reading_kana',
  'meaning_vi',
  'romaji',
  'han_viet',
  'is_kana_only',
  'jlpt_level',
] as const
/** Cột tuỳ chọn, được phép thêm vào cuối header (DATA-05). */
export const VOCAB_OPTIONAL_COLUMNS = ['emoji'] as const

export const vocabRowSchema = z
  .object({
    code: required().refine((v) => /^n[1-5]-\d{4}$/.test(v), 'phải có dạng n5-0001'),
    sort_order: intIn(1, 1_000_000),
    expression: tidyText(),
    reading_kana: required().refine((v) => KANA_ONLY.test(v), 'chỉ được có Hiragana, Katakana và ー'),
    meaning_vi: tidyText(),
    romaji: optionalText((v) => v === v.toLowerCase() && tidy(v), 'phải viết thường, không khoảng trắng thừa'),
    han_viet: optionalText((v) => tidy(v) && upperHanViet(v), 'phải viết HOA, không khoảng trắng thừa'),
    is_kana_only: required()
      .refine((v) => v === 'true' || v === 'false', 'phải là true hoặc false')
      .transform((v) => v === 'true'),
    jlpt_level: intIn(1, 5),
    emoji: optionalText((v) => !/\s/.test(v), 'không được có khoảng trắng').optional(),
  })
  .superRefine((row, ctx) => {
    const kanji = hasKanji(row.expression)
    if (row.is_kana_only === kanji) {
      ctx.addIssue({
        code: 'custom',
        path: ['is_kana_only'],
        message: kanji ? 'expression có Kanji nên phải là false' : 'expression không có Kanji nên phải là true',
      })
    }
    if (!row.is_kana_only && row.han_viet === null) {
      ctx.addIssue({ code: 'custom', path: ['han_viet'], message: 'từ có Kanji bắt buộc có Hán Việt' })
    }
    if (row.is_kana_only && row.han_viet !== null) {
      ctx.addIssue({ code: 'custom', path: ['han_viet'], message: 'từ chỉ có Kana thì để trống Hán Việt' })
    }
  })
export type VocabRow = z.infer<typeof vocabRowSchema>

/** Đổi ô rỗng thành null (data-spec §1.5) trước khi đưa vào schema. */
export function toCells(header: readonly string[], cells: string[]): Record<string, Cell> {
  const obj: Record<string, Cell> = {}
  header.forEach((col, i) => {
    const v = cells[i] ?? ''
    obj[col] = v === '' ? null : v
  })
  return obj
}
