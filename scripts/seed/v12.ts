// V12 gói 2: nạp dữ liệu khu Kanji V12 vào database — nghĩa bộ thủ (radical_meanings.csv) và hạng tần suất (kanji_frequency.csv).
// Chạy sau phần seed chính và phần Kanji trực quan (cần bảng kanji, radicals đã có). Chỉ ghi dòng khác database.
import { parseCsv } from './csv'
import type { Row, SeedDb } from './run'

export interface V12Files {
  radicalMeanings?: { name: string; text: string }
  kanjiFrequency?: { name: string; text: string }
}

export interface V12Data {
  radicals: { number: number; variants: string; meaning_vi: string; n5n4_kanji: number; meaning_approved: boolean }[]
  frequency: Map<string, number | null>
  errors: string[]
}

function table(file: { name: string; text: string }, header: string, errors: string[]): Record<string, string>[] {
  const { records, errors: parseErrors } = parseCsv(file.text)
  for (const e of parseErrors) errors.push(`${file.name} dòng ${e.line}: ${e.message}`)
  if (records[0]?.cells.join(',') !== header) {
    errors.push(`${file.name}: header phải là ${header}`)
    return []
  }
  const head = records[0].cells
  return records.slice(1).map((r) => ({ ...Object.fromEntries(head.map((h, i) => [h, r.cells[i] ?? ''])), _line: String(r.line) }))
}

export function validateV12(files: V12Files, kanjiChars: ReadonlySet<string>): V12Data {
  const errors: string[] = []
  const radicals: V12Data['radicals'] = []
  if (files.radicalMeanings) {
    for (const r of table(files.radicalMeanings, 'number,character,variants,meaning_vi,n5n4_kanji,examples,approved', errors)) {
      const n = Number(r.number)
      const count = Number(r.n5n4_kanji)
      if (!Number.isInteger(n) || n < 1 || n > 214) errors.push(`${files.radicalMeanings.name} dòng ${r._line}: number phải là 1–214`)
      else if (!r.meaning_vi.trim()) errors.push(`${files.radicalMeanings.name} dòng ${r._line}: thiếu nghĩa`)
      else if (!Number.isInteger(count) || count < 0) errors.push(`${files.radicalMeanings.name} dòng ${r._line}: n5n4_kanji sai`)
      else if (r.approved !== 'true' && r.approved !== 'false') errors.push(`${files.radicalMeanings.name} dòng ${r._line}: approved sai`)
      else radicals.push({ number: n, variants: r.variants, meaning_vi: r.meaning_vi.trim(), n5n4_kanji: count, meaning_approved: r.approved === 'true' })
    }
    if (radicals.length !== 214 && errors.length === 0) errors.push(`${files.radicalMeanings.name}: cần đủ 214 bộ, đang có ${radicals.length}`)
  }
  const frequency = new Map<string, number | null>()
  if (files.kanjiFrequency) {
    for (const r of table(files.kanjiFrequency, 'character,freq_rank', errors)) {
      const rank = r.freq_rank === '' ? null : Number(r.freq_rank)
      if (!kanjiChars.has(r.character)) errors.push(`${files.kanjiFrequency.name} dòng ${r._line}: ${r.character} không có trong kanji.csv`)
      else if (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 5000)) errors.push(`${files.kanjiFrequency.name} dòng ${r._line}: freq_rank phải là 1–5000 hoặc trống`)
      else frequency.set(r.character, rank)
    }
  }
  return { radicals, frequency, errors }
}

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null)

/** Ghi các cột V12: đọc dòng hiện có rồi upsert đủ cột (bảng có cột NOT NULL khác). */
export async function seedV12(db: SeedDb, data: V12Data, dryRun: boolean, log: (s: string) => void): Promise<void> {
  const KANJI_COLS = ['id', 'character', 'han_viet', 'meaning_vi', 'onyomi', 'kunyomi', 'stroke_count', 'jlpt_level', 'study_order', 'freq_rank']
  const RADICAL_COLS = ['number', 'character', 'name_vi', 'approved', 'variants', 'meaning_vi', 'n5n4_kanji', 'meaning_approved']
  const [dbRadicals, dbKanji] = await Promise.all([db.fetchAll('radicals', RADICAL_COLS), db.fetchAll('kanji', KANJI_COLS)])
  const byNumber = new Map(dbRadicals.map((r) => [Number(r.number), r]))
  const radicalRows: Row[] = data.radicals.flatMap((r) => {
    const cur = byNumber.get(r.number)
    if (!cur) return []
    const changed = !same(cur.variants, r.variants) || !same(cur.meaning_vi, r.meaning_vi) || !same(cur.n5n4_kanji, r.n5n4_kanji) || !same(cur.meaning_approved, r.meaning_approved)
    return changed ? [{ ...cur, ...r }] : []
  })
  const kanjiRows: Row[] = dbKanji.flatMap((k) => {
    const ch = String(k.character)
    if (!data.frequency.has(ch)) return []
    const rank = data.frequency.get(ch) ?? null
    return same(k.freq_rank, rank) ? [] : [{ ...k, freq_rank: rank }]
  })
  const missing = data.radicals.filter((r) => !byNumber.has(r.number)).length
  log(`  radicals (V12): ${radicalRows.length} ghi · ${data.radicals.length - radicalRows.length - missing} không đổi${missing ? ` · ${missing} bộ chưa có trong DB (chạy phần Kanji trực quan trước)` : ''}`)
  log(`  kanji.freq_rank: ${kanjiRows.length} ghi · ${data.frequency.size - kanjiRows.length} không đổi`)
  if (dryRun) return
  if (radicalRows.length) await db.upsert('radicals', radicalRows, 'number')
  if (kanjiRows.length) await db.upsert('kanji', kanjiRows, 'id')
}
