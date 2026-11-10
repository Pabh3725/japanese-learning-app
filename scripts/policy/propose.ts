// pnpm policy:propose — đề xuất chính sách Kanji cho từng từ, ghi data/n5/kanji_policy.csv và docs/kanji-policy-review.md.
//
// Cần file JMdict_e.gz (EDRDG, CC BY-SA 4.0) trên máy, KHÔNG đưa vào repo:
//   https://www.edrdg.org/pub/Nihongo/JMdict_e.gz → _local/sources/JMdict_e.gz (mặc định)
//   hoặc chỉ đường khác: pnpm policy:propose --jmdict <đường dẫn>
// Dòng đã duyệt (locked = true) không bị ghi đè; chỗ đề xuất mới khác được liệt kê trong file rà soát.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { parseCsv } from '../seed/csv'
import { kanjiOf } from '../seed/validate'
import { classifyWord, type PolicyProposal } from './classify'
import { indexByKanji, lookupWord, parseJmdict } from './jmdict'
import { formatPolicyFile, mergeProposals, parsePolicyFile } from './policy-file'
import { formatReview } from './review'

const DATA_DIR = join(process.cwd(), 'data', 'n5')
const POLICY_FILE = join(DATA_DIR, 'kanji_policy.csv')
const REVIEW_FILE = join(process.cwd(), 'docs', 'kanji-policy-review.md')
const LEVEL_SOURCE = 'N5 của file gốc + danh sách Waller'

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function readTable(file: string): Record<string, string>[] {
  const { records } = parseCsv(readFileSync(join(DATA_DIR, file), 'utf8'))
  const header = records[0].cells
  return records.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r.cells[i] ?? ''])))
}

function main() {
  const jmdictPath = argValue('--jmdict') ?? join(process.cwd(), '_local', 'sources', 'JMdict_e.gz')
  if (!existsSync(jmdictPath)) throw new Error(`Không thấy ${jmdictPath}. Tải JMdict_e.gz từ https://www.edrdg.org/pub/Nihongo/JMdict_e.gz`)

  const words = readTable('vocabularies.csv')
  const kanjiLevel = new Map(readTable('kanji.csv').map((k) => [k.character, k.jlpt_level === '' ? null : Number(k.jlpt_level)]))

  console.log('Đọc JMdict…')
  const index = indexByKanji(parseJmdict(gunzipSync(readFileSync(jmdictPath)).toString('utf8')))

  const proposals = new Map<string, PolicyProposal>()
  for (const w of words) {
    const isKanaOnly = w.is_kana_only === 'true'
    proposals.set(
      w.code,
      classifyWord({
        expression: w.expression,
        isKanaOnly,
        wordLevel: Number(w.jlpt_level),
        kanji: kanjiOf(w.expression).map((character) => ({ character, level: kanjiLevel.get(character) ?? null })),
        jm: isKanaOnly ? null : lookupWord(index, w.expression, w.reading_kana),
        levelSource: LEVEL_SOURCE,
      }),
    )
  }

  const existing = existsSync(POLICY_FILE) ? parsePolicyFile(readFileSync(POLICY_FILE, 'utf8')) : { rows: [], errors: [] }
  if (existing.errors.length > 0) {
    throw new Error(`kanji_policy.csv đang có lỗi, sửa trước khi chạy lại:\n${existing.errors.map((e) => `  dòng ${e.line}: ${e.message}`).join('\n')}`)
  }
  const merged = mergeProposals(
    words.map((w) => ({ code: w.code, expression: w.expression })),
    proposals,
    existing.rows,
  )
  writeFileSync(POLICY_FILE, formatPolicyFile(merged.rows))
  writeFileSync(REVIEW_FILE, formatReview(merged.rows, merged.lockedDiffers, words, LEVEL_SOURCE))

  const count = (p: string) => merged.rows.filter((r) => r.policy === p).length
  console.log(`Đã ghi ${POLICY_FILE} (${merged.rows.length} từ) và ${REVIEW_FILE}.`)
  console.log(`  KANA_ONLY ${count('KANA_ONLY')} · KANJI_CORE ${count('KANJI_CORE')} · KANJI_DEFERRED ${count('KANJI_DEFERRED')} · KANJI_OPTIONAL ${count('KANJI_OPTIONAL')}`)
  console.log(`  Đã khóa: ${merged.rows.filter((r) => r.locked).length} · Đã khóa nhưng đề xuất mới khác: ${merged.lockedDiffers.length}`)
}

main()
