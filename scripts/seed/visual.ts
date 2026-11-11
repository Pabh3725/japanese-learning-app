// V9 gói 6: seed dữ liệu Kanji trực quan (kanji_visual.json, radicals.csv, kanji_similar.csv). Chạy sau phần seed chính.
// Chỉ ghi dòng khác với database (so JSON đã sắp khoá), nên chạy lại không ghi lại 800 KB nét chữ.
import { parseSimilarFile, type SimilarRow } from '../kanji-data/similar-file'
import { parseCsv } from './csv'
import type { Row, SeedDb } from './run'

export interface VisualFiles {
  visual?: { name: string; text: string }
  radicals?: { name: string; text: string }
  similar?: { name: string; text: string }
}

interface VisualEntry {
  radical: number | null
  parts: unknown[]
  strokes: string[]
}

export interface VisualData {
  radicals: { number: number; character: string; name_vi: string; approved: boolean }[]
  visuals: Map<string, VisualEntry>
  source: string
  pairs: SimilarRow[]
  errors: string[]
}

export function validateVisual(files: VisualFiles, kanjiChars: ReadonlySet<string>): VisualData {
  const errors: string[] = []
  const radicals: VisualData['radicals'] = []
  if (files.radicals) {
    const { records } = parseCsv(files.radicals.text)
    if (records[0]?.cells.join(',') !== 'number,character,name_vi,approved') errors.push(`${files.radicals.name}: header phải là number,character,name_vi,approved`)
    for (const r of records.slice(1)) {
      const [num, character, name, approved] = r.cells
      const n = Number(num)
      if (!Number.isInteger(n) || n < 1 || n > 214) errors.push(`${files.radicals.name} dòng ${r.line}: number phải là 1–214`)
      else if (!name || (approved !== 'true' && approved !== 'false')) errors.push(`${files.radicals.name} dòng ${r.line}: thiếu tên hoặc approved sai`)
      else radicals.push({ number: n, character, name_vi: name, approved: approved === 'true' })
    }
    if (radicals.length !== 214 && errors.length === 0) errors.push(`${files.radicals.name}: cần đủ 214 bộ, đang có ${radicals.length}`)
  }

  const visuals = new Map<string, VisualEntry>()
  let source = ''
  if (files.visual) {
    const json = JSON.parse(files.visual.text) as { source: string; kanji: Record<string, VisualEntry> }
    source = json.source
    for (const [ch, entry] of Object.entries(json.kanji)) {
      if (!kanjiChars.has(ch)) errors.push(`${files.visual.name}: ${ch} không có trong kanji.csv`)
      else if (!Array.isArray(entry.strokes) || entry.strokes.length === 0) errors.push(`${files.visual.name}: ${ch} không có nét viết`)
      else if (entry.radical !== null && (entry.radical < 1 || entry.radical > 214)) errors.push(`${files.visual.name}: ${ch} có số bộ sai`)
      else visuals.set(ch, entry)
    }
  }

  let pairs: SimilarRow[] = []
  if (files.similar) {
    try {
      pairs = parseSimilarFile(files.similar.text)
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e))
    }
    for (const p of pairs) if (!kanjiChars.has(p.a) || !kanjiChars.has(p.b) || p.a === p.b) errors.push(`${files.similar.name}: cặp ${p.a}${p.b} không hợp lệ`)
  }
  return { radicals, visuals, source, pairs, errors }
}

/** JSON với khoá sắp xếp, để so dữ liệu jsonb đọc từ database với dữ liệu trong file. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function changed(rows: Row[], dbRows: Row[], key: (r: Row) => string): Row[] {
  const current = new Map(dbRows.map((r) => [key(r), stable(r)]))
  return rows.filter((r) => current.get(key(r)) !== stable(r))
}

export async function seedVisual(db: SeedDb, data: VisualData, dryRun: boolean, log: (s: string) => void): Promise<void> {
  const kanjiIds = new Map((await db.fetchAll('kanji', ['id', 'character'])).map((r) => [String(r.character), String(r.id)]))
  const [dbRadicals, dbVisuals, dbPairs] = await Promise.all([
    db.fetchAll('radicals', ['number', 'character', 'name_vi', 'approved']),
    db.fetchAll('kanji_visuals', ['kanji_id', 'radical_number', 'parts', 'strokes', 'source']),
    db.fetchAll('kanji_similar_pairs', ['kanji_a', 'kanji_b', 'score', 'explanation', 'approved']),
  ])

  const radicalRows: Row[] = data.radicals.map((r) => ({ ...r }))
  const visualRows: Row[] = [...data.visuals].flatMap(([ch, v]) => {
    const id = kanjiIds.get(ch)
    return id ? [{ kanji_id: id, radical_number: v.radical, parts: v.parts, strokes: v.strokes, source: data.source }] : []
  })
  const pairRows: Row[] = data.pairs.flatMap((p) => {
    const [a, b] = [kanjiIds.get(p.a), kanjiIds.get(p.b)]
    return a && b ? [{ kanji_a: a, kanji_b: b, score: p.score, explanation: p.explanation, approved: p.approved }] : []
  })

  const radicalsToWrite = changed(radicalRows, dbRadicals, (r) => String(r.number))
  const visualsToWrite = changed(visualRows, dbVisuals, (r) => String(r.kanji_id))
  const pairsToWrite = changed(pairRows, dbPairs, (r) => `${r.kanji_a}#${r.kanji_b}`)
  log(`  radicals: ${radicalsToWrite.length} ghi · ${radicalRows.length - radicalsToWrite.length} không đổi`)
  log(`  kanji_visuals: ${visualsToWrite.length} ghi · ${visualRows.length - visualsToWrite.length} không đổi`)
  log(`  kanji_similar_pairs: ${pairsToWrite.length} ghi · ${pairRows.length - pairsToWrite.length} không đổi`)
  if (dryRun) return
  // Bộ thủ trước vì kanji_visuals tham chiếu tới
  if (radicalsToWrite.length) await db.upsert('radicals', radicalsToWrite, 'number')
  if (visualsToWrite.length) await db.upsert('kanji_visuals', visualsToWrite, 'kanji_id')
  if (pairsToWrite.length) await db.upsert('kanji_similar_pairs', pairsToWrite, 'kanji_a,kanji_b')
}
