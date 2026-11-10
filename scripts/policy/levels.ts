// pnpm policy:levels — cập nhật cột jlpt_level của data/n5/kanji.csv theo danh sách JLPT của Jonathan Waller.
//
// Nguồn: kanji.json của https://github.com/davidluzgouveia/kanji-data (trường jlpt_new, lấy từ tanos.co.uk/jlpt),
// tải về _local/sources/kanji-data/kanji.json, KHÔNG đưa vào repo. JLPT không có danh sách chính thức.
// Luật (chủ dự án chọn 2026-11-10): chữ đang là N5 trong file giữ nguyên; chữ khác lấy cấp Waller;
// Waller không có cấp thì giữ cấp cũ. Cấp trong MANUAL_LEVELS thắng mọi nguồn.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface LevelChange {
  character: string
  from: number | null
  to: number | null
}

/** Cấp do chủ dự án chốt, thắng mọi nguồn. 暑: kanji-data ghi N1, nhưng 暑い là từ cơ bản (duyệt 2026-11-10). */
export const MANUAL_LEVELS: ReadonlyMap<string, number> = new Map([['暑', 4]])

/** Cấp mới của một chữ. Pure. */
export function nextKanjiLevel(current: number | null, waller: number | null, manual?: number): number | null {
  if (manual !== undefined) return manual
  if (current === 5) return 5
  return waller ?? current
}

/** Sửa cột cuối (jlpt_level) của từng dòng kanji.csv, giữ nguyên mọi cột khác và cách viết. Pure. */
export function applyLevels(csvText: string, wallerLevel: ReadonlyMap<string, number | null>): { text: string; changes: LevelChange[] } {
  const lines = csvText.split('\n')
  if (!lines[0].trimEnd().endsWith(',jlpt_level')) throw new Error('kanji.csv phải có jlpt_level là cột cuối')
  const changes: LevelChange[] = []
  const out = lines.map((line, i) => {
    if (i === 0 || line.trim() === '') return line
    const cut = line.lastIndexOf(',')
    const character = line.slice(0, line.indexOf(','))
    const raw = line.slice(cut + 1).trim()
    const current = raw === '' ? null : Number(raw)
    const next = nextKanjiLevel(current, wallerLevel.get(character) ?? null, MANUAL_LEVELS.get(character))
    if (next === current) return line
    changes.push({ character, from: current, to: next })
    return `${line.slice(0, cut + 1)}${next ?? ''}`
  })
  return { text: out.join('\n'), changes }
}

function main() {
  const source = join(process.cwd(), '_local', 'sources', 'kanji-data', 'kanji.json')
  if (!existsSync(source)) throw new Error(`Không thấy ${source}. Tải https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json`)
  const data = JSON.parse(readFileSync(source, 'utf8')) as Record<string, { jlpt_new?: number | null }>
  const waller = new Map(Object.entries(data).map(([ch, entry]) => [ch, entry.jlpt_new ?? null]))
  const file = join(process.cwd(), 'data', 'n5', 'kanji.csv')
  const { text, changes } = applyLevels(readFileSync(file, 'utf8'), waller)
  writeFileSync(file, text)
  const label = (l: number | null) => (l === null ? 'chưa có' : `N${l}`)
  const groups = new Map<string, string[]>()
  for (const c of changes) groups.set(`${label(c.from)} → ${label(c.to)}`, [...(groups.get(`${label(c.from)} → ${label(c.to)}`) ?? []), c.character])
  console.log(`Đổi cấp ${changes.length} chữ trong ${file}:`)
  for (const [k, chars] of groups) console.log(`  ${k}: ${chars.length} — ${chars.join('')}`)
}

if (process.argv[1]?.endsWith('levels.ts')) main()
