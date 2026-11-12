// pnpm verbs:build — lập danh sách động từ và tính từ cho khu Thể động từ (Grammar G5).
// Đọc data/n5/vocabularies.csv + JMdict (_local/sources/JMdict_e.gz, EDRDG, CC BY-SA 4.0, không đưa vào repo).
// Nhóm động từ lấy theo từ loại (pos) của JMdict, không đoán từ thể ます. Ghi data/n5/verbs.json và docs/verbs-review.md.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { parseCsv } from '../seed/csv'
import { parseJmdict, type JmEntry } from '../policy/jmdict'
import { classify, type ManualEntry } from './classify'

const ROOT = process.cwd()
const MANUAL_PATH = join(ROOT, 'scripts', 'verbs', 'manual.json')

/** Bỏ: câu chào, cụm lịch sự, kính ngữ bài 49–50 (đã có trong Grammar), không phải động từ để chia. */
const SKIP = new Set(['お願いします', 'これからお世話になります', 'でございます', 'ございます', 'またこんどおねがいします', 'いらっしゃいます', 'お世話になりました', 'いってきます', 'いってらっしゃい', 'ただいま', '失礼します', '失礼いたします', 'かしこまりました', 'よろしくお伝えください'])



function main() {
  const jmPath = join(ROOT, '_local', 'sources', 'JMdict_e.gz')
  if (!existsSync(jmPath)) throw new Error(`Không thấy ${jmPath}`)
  console.log('Đọc JMdict…')
  const entries: JmEntry[] = parseJmdict(gunzipSync(readFileSync(jmPath)).toString('utf8'))
  const manual: Record<string, ManualEntry> = existsSync(MANUAL_PATH) ? JSON.parse(readFileSync(MANUAL_PATH, 'utf8')) : {}
  const { records } = parseCsv(readFileSync(join(ROOT, 'data', 'n5', 'vocabularies.csv'), 'utf8'))
  const header = records[0].cells
  const col = (name: string) => header.indexOf(name)
  const rows = records.slice(1).map((r) => ({
    code: r.cells[col('code')], expression: r.cells[col('expression')], reading: r.cells[col('reading_kana')],
    meaning: r.cells[col('meaning_vi')], lesson: Number(r.cells[col('lesson')]), level: Number(r.cells[col('jlpt_level')]),
  }))
  const result = classify(rows, entries, manual, SKIP)
  writeFileSync(join(ROOT, 'data', 'n5', 'verbs.json'), JSON.stringify({ source: 'JMdict (EDRDG, CC BY-SA 4.0) + data/n5/vocabularies.csv', words: result.words }, null, 1) + '\n')

  const kinds = new Map<string, number>()
  for (const w of result.words) kinds.set(w.kind, (kinds.get(w.kind) ?? 0) + 1)
  const L: string[] = ['# Duyệt danh sách động từ và tính từ (Grammar G5)', '',
    'Sinh bởi `pnpm verbs:build`. Nhóm động từ theo từ loại của JMdict (EDRDG, CC BY-SA 4.0). Chỉ cần xem các mục dưới đây; sửa bằng `scripts/verbs/manual.json` rồi chạy lại.', '',
    `Tổng: ${result.words.length} từ (${[...kinds].map(([k, n]) => `${k}: ${n}`).join(', ')}).`, '']
  const section = (title: string, list: string[]) => { L.push(`## ${title} (${list.length})`, '', ...(list.length ? list : ['Không có.']), '') }
  section('Động từ nhóm II trông như nhóm I (đuôi -iru/-eru nhưng chia như nhóm I hoặc ngược lại)', result.notes.lookalike)
  section('Bất quy tắc và ngoại lệ (来る, する, 行く, ある…)', result.notes.irregular)
  section('Cụm từ: chỉ chia động từ cuối', result.notes.phrase)
  section('Thể ます có hai cách về thể từ điển (đã chọn theo JMdict; xem lại)', result.notes.ambiguous)
  section('Tính từ な (danh sách chọn tay, JMdict xác nhận adj-na)', result.notes.na)
  section('Bị loại', result.notes.skipped)
  writeFileSync(join(ROOT, 'docs', 'verbs-review.md'), L.join('\n') + '\n')
  console.log(`Đã ghi data/n5/verbs.json (${result.words.length} từ) và docs/verbs-review.md`)
}

main()
