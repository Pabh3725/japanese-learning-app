// pnpm kanji:visual — dữ liệu Kanji trực quan (V9 gói 6) từ KanjiVG (Ulrich Apel, CC BY-SA 3.0):
//   data/n5/kanji_visual.json  nét viết, thành phần (đủ mọi tầng), vị trí, số bộ thủ của 823 chữ
//   data/n5/kanji_similar.csv  cặp chữ gần giống + lời giải thích tự động; dòng approved = true không bị ghi đè
//   data/n5/kanji.csv          điền stroke_count còn trống theo KanjiVG (không sửa số đã có)
//   docs/kanji-visual-review.md  việc chờ chủ dự án duyệt
// Cần _local/sources/kanjivg/kanjivg-20260714.xml.gz (không đưa vào repo):
//   https://github.com/KanjiVG/kanjivg/releases/download/r20260714/kanjivg-20260714.xml.gz

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { parseCsv } from '../seed/csv'
import { parseKanjiVg, radicalNumber, type KanjiVisual } from './kanjivg'
import { explainPair, findSimilarPairs, type KanjiInfo } from './similar'
import { formatSimilarFile, mergeSimilar, parseSimilarFile, type SimilarRow } from './similar-file'

const ROOT = process.cwd()
const DATA = join(ROOT, 'data', 'n5')
const SOURCE = join(ROOT, '_local', 'sources', 'kanjivg', 'kanjivg-20260714.xml.gz')

function readKanjiCsv() {
  const text = readFileSync(join(DATA, 'kanji.csv'), 'utf8')
  const { records } = parseCsv(text)
  const header = records[0].cells
  return { text, rows: records.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r.cells[i] ?? '']))) }
}

/** Điền stroke_count còn trống (cột thứ 6), giữ nguyên mọi ô khác và cách viết. */
function fillStrokeCounts(text: string, counts: ReadonlyMap<string, number>): { text: string; filled: number } {
  let filled = 0
  const lines = text.split('\n').map((line, i) => {
    if (i === 0 || line.trim() === '') return line
    const ch = line.slice(0, line.indexOf(','))
    // Hai cột cuối: stroke_count, jlpt_level
    const last = line.lastIndexOf(',')
    const prev = line.lastIndexOf(',', last - 1)
    const current = line.slice(prev + 1, last)
    const n = counts.get(ch)
    if (current !== '' || n === undefined) return line
    filled++
    return `${line.slice(0, prev + 1)}${n}${line.slice(last)}`
  })
  return { text: lines.join('\n'), filled }
}

function main() {
  if (!existsSync(SOURCE)) throw new Error(`Không thấy ${SOURCE}. Tải kanjivg-20260714.xml.gz từ trang phát hành KanjiVG.`)
  const kanji = readKanjiCsv()
  const chars = new Set(kanji.rows.map((r) => r.character))
  const visuals = parseKanjiVg(gunzipSync(readFileSync(SOURCE)).toString('utf8'), chars)
  const missing = [...chars].filter((c) => !visuals.has(c))

  // 1. kanji_visual.json
  const ordered = kanji.rows.map((r) => visuals.get(r.character)).filter((v): v is KanjiVisual => v !== undefined)
  const json = {
    source: 'KanjiVG r20260714 (https://kanjivg.tagaini.net), copyright Ulrich Apel, CC BY-SA 3.0',
    kanji: Object.fromEntries(ordered.map((v) => [v.character, { radical: radicalNumber(v.radicalChar), parts: v.parts, strokes: v.strokes }])),
  }
  writeFileSync(join(DATA, 'kanji_visual.json'), JSON.stringify(json) + '\n')

  // 2. stroke_count còn trống; báo chỗ lệch với số đã có
  const counts = new Map(ordered.map((v) => [v.character, v.strokes.length]))
  const strokeMismatch = kanji.rows.filter((r) => r.stroke_count !== '' && counts.has(r.character) && Number(r.stroke_count) !== counts.get(r.character))
  const filled = fillStrokeCounts(kanji.text, counts)
  writeFileSync(join(DATA, 'kanji.csv'), filled.text)

  // 3. Cặp gần giống
  const info = new Map<string, KanjiInfo>(kanji.rows.flatMap((r) => (visuals.has(r.character) ? [[r.character, { visual: visuals.get(r.character)!, hanViet: r.han_viet, meaning: r.meaning_vi }] as const] : [])))
  const proposals = findSimilarPairs(ordered).map((p) => ({ ...p, explanation: explainPair(info.get(p.a)!, info.get(p.b)!) }))
  const similarPath = join(DATA, 'kanji_similar.csv')
  const existing = existsSync(similarPath) ? parseSimilarFile(readFileSync(similarPath, 'utf8')) : []
  const merged = mergeSimilar(proposals, existing)
  writeFileSync(similarPath, formatSimilarFile(merged))

  // 4. File rà soát
  const noRadical = ordered.filter((v) => radicalNumber(v.radicalChar) === null)
  const approved = merged.filter((r) => r.approved).length
  const review = [
    '# Rà soát dữ liệu Kanji trực quan (V9 gói 6)',
    '',
    'File này do `pnpm kanji:visual` tạo, đừng sửa tay. Nguồn nét viết, thành phần và bộ thủ: KanjiVG r20260714, copyright Ulrich Apel, CC BY-SA 3.0.',
    '',
    '## 1. Độ phủ',
    '',
    `- Có dữ liệu KanjiVG: ${ordered.length}/${chars.size} chữ.${missing.length > 0 ? ` Thiếu: ${missing.join('')}.` : ''}`,
    `- Không xác định được bộ thủ: ${noRadical.length}${noRadical.length > 0 ? ` (${noRadical.map((v) => v.character).join('')})` : ''}.`,
    `- Số nét: điền thêm ${filled.filled} chữ còn trống trong kanji.csv; ${strokeMismatch.length} chữ có số nét khác KanjiVG (giữ số trong file):${strokeMismatch.length > 0 ? ' ' + strokeMismatch.map((r) => `${r.character} ${r.stroke_count}→${counts.get(r.character)}`).join(', ') : ' không có'}.`,
    '',
    '## 2. Tên bộ thủ',
    '',
    'Tên tiếng Việt của 214 bộ ở `data/n5/radicals.csv` do Claude soạn, đang **chờ duyệt** (`approved` = `false`). Sửa tên nếu cần, đặt `approved` = `true`. Chưa duyệt thì app chỉ hiện chữ bộ và số thứ tự.',
    '',
    '## 3. Cặp chữ gần giống',
    '',
    `Script đề xuất ${merged.length} cặp (so hình nét viết trên lưới, số nét chênh ≤ 2, mỗi chữ tối đa 3 cặp). Đã duyệt: ${approved}. Chỉ cặp \`approved\` = \`true\` trong \`data/n5/kanji_similar.csv\` mới được dùng cho câu hỏi.`,
    '',
    '20 cặp giống nhất:',
    '',
    '| Cặp | Điểm | Giải thích tự động |',
    '| --- | --- | --- |',
    ...merged.slice(0, 20).map((r) => `| ${r.a} ${r.b} | ${r.score} | ${r.explanation.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n')
  writeFileSync(join(ROOT, 'docs', 'kanji-visual-review.md'), review)

  console.log(`KanjiVG: ${ordered.length}/${chars.size} chữ · không rõ bộ thủ ${noRadical.length} · điền số nét ${filled.filled} · lệch số nét ${strokeMismatch.length}`)
  console.log(`Cặp gần giống: ${merged.length} (đã duyệt ${approved})`)
}

main()

export type { SimilarRow }
