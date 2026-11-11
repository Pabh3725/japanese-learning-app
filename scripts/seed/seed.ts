// pnpm seed            → validate, in kế hoạch, rồi GHI vào database
// pnpm seed --dry-run  → validate, in kế hoạch, KHÔNG ghi
// pnpm seed --check    → chỉ validate file, không cần key, không chạm database
//
// Biến môi trường (đặt trong .env.local, KHÔNG commit):
//   NEXT_PUBLIC_SUPABASE_URL   URL project (hoặc SUPABASE_URL)
//   SUPABASE_SECRET_KEY        secret key (sb_secret_...) — KHÔNG có prefix NEXT_PUBLIC_
//                              (tên cũ SUPABASE_SERVICE_ROLE_KEY vẫn đọc được)

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runSeed, type SeedDb } from './run'

const DATA_DIR = join(process.cwd(), 'data', 'n5')
const GRAMMAR_DIR = join(process.cwd(), 'data', 'grammar')

async function main() {
  const args = new Set(process.argv.slice(2))
  const check = args.has('--check')
  const dryRun = args.has('--dry-run')
  const unknown = [...args].filter((a) => a !== '--check' && a !== '--dry-run')
  if (unknown.length) throw new Error(`Không hiểu tham số: ${unknown.join(' ')}. Dùng --dry-run hoặc --check.`)

  const read = (name: string) => ({ name, text: readFileSync(join(DATA_DIR, name), 'utf8') })
  const files = {
    kanji: read('kanji.csv'),
    vocabularies: read('vocabularies.csv'),
    // V9 gói 3: chính sách Kanji của từ, do pnpm policy:propose tạo rồi chủ dự án duyệt
    ...(existsSync(join(DATA_DIR, 'kanji_policy.csv')) ? { policy: read('kanji_policy.csv') } : {}),
  }

  let db: SeedDb | null = null
  if (!check) {
    try {
      process.loadEnvFile('.env.local')
    } catch {
      // không có file thì dùng biến môi trường sẵn có
    }
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env.local.')
    }
    // Nạp supabase-js chỉ khi cần DB, để --check chạy được ở mọi nơi
    const { assertServiceRoleKey, createSupabaseSeedDb } = await import('./db')
    assertServiceRoleKey(key)
    console.log(`Database: ${new URL(url).host}${dryRun ? '  (dry-run)' : ''}\n`)
    db = createSupabaseSeedDb(url, key)
  }

  const result = await runSeed({ files, db, dryRun, log: (s) => console.log(s) })
  if (!result.ok) {
    process.exitCode = 1
    return
  }

  // V9 gói 6: dữ liệu Kanji trực quan (tuỳ chọn, chạy sau phần chính vì cần id của Kanji)
  const optional = (name: string) => (existsSync(join(DATA_DIR, name)) ? read(name) : undefined)
  const visualFiles = { visual: optional('kanji_visual.json'), radicals: optional('radicals.csv'), similar: optional('kanji_similar.csv') }
  if (visualFiles.visual || visualFiles.radicals || visualFiles.similar) {
    const { validateVisual, seedVisual } = await import('./visual')
    const chars = new Set(files.kanji.text.split('\n').slice(1).map((line) => line.slice(0, line.indexOf(','))).filter(Boolean))
    const data = validateVisual(visualFiles, chars)
    if (data.errors.length > 0) {
      console.log(`\nLỖI dữ liệu Kanji trực quan: ${data.errors.length}. Không ghi phần này.`)
      for (const e of data.errors.slice(0, 20)) console.log(`  ✗ ${e}`)
      process.exitCode = 1
      return
    }
    console.log(`\nKanji trực quan: ${data.visuals.size} chữ, ${data.radicals.length} bộ thủ, ${data.pairs.length} cặp gần giống. Validate: OK`)
    if (db) await seedVisual(db, data, dryRun, (s) => console.log(s))
  }

  // Grammar G2: nội dung ngữ pháp (tuỳ chọn), mỗi bài một file data/grammar/lesson-NN.json
  const grammarFiles = existsSync(GRAMMAR_DIR)
    ? readdirSync(GRAMMAR_DIR).filter((f) => /^lesson-\d{2}\.json$/.test(f)).sort().map((f) => ({ name: f, text: readFileSync(join(GRAMMAR_DIR, f), 'utf8') }))
    : []
  if (grammarFiles.length > 0) {
    const { validateGrammar, seedGrammar } = await import('./grammar')
    const { parseCsv } = await import('./csv')
    const kanjiUpTo = vocabKanjiByLesson(parseCsv(files.vocabularies.text).records.map((r) => r.cells))
    const data = validateGrammar(grammarFiles, kanjiUpTo)
    if (data.warnings.length > 0) {
      console.log(`\nCảnh báo ngữ pháp (không chặn): ${data.warnings.length}`)
      for (const w of data.warnings.slice(0, 15)) console.log(`  - ${w.file} ${w.where}: ${w.message}`)
      if (data.warnings.length > 15) console.log(`  … và ${data.warnings.length - 15} cảnh báo khác`)
    }
    if (data.errors.length > 0) {
      console.log(`\nLỖI dữ liệu ngữ pháp: ${data.errors.length}. Không ghi phần này.`)
      for (const e of data.errors.slice(0, 30)) console.log(`  ✗ ${e.file} ${e.where}: ${e.message}`)
      process.exitCode = 1
      return
    }
    const approved = data.points.filter((p) => p.approved).length
    console.log(`\nNgữ pháp: ${grammarFiles.length} bài, ${data.points.length} mẫu (${approved} đã duyệt), ${data.points.reduce((n, p) => n + p.sentences.length, 0)} câu gốc. Validate: OK`)
    if (db) await seedGrammar(db, data, dryRun, (s) => console.log(s))
  }
  process.exitCode = 0
}

/** Chữ Kanji có trong từ vựng của bài ≤ n (hàng CSV: code,…,expression ở cột 3, lesson ở cột cuối). */
function vocabKanjiByLesson(rows: string[][]): (lesson: number) => ReadonlySet<string> {
  const header = rows[0] ?? []
  const exprAt = header.indexOf('expression')
  const lessonAt = header.indexOf('lesson')
  const byLesson = new Map<number, string[]>()
  for (const r of rows.slice(1)) {
    const lesson = Number(r[lessonAt])
    byLesson.set(lesson, [...(byLesson.get(lesson) ?? []), r[exprAt] ?? ''])
  }
  const cache = new Map<number, Set<string>>()
  return (lesson) => {
    if (!cache.has(lesson)) {
      const set = new Set<string>()
      for (const [l, exprs] of byLesson) if (l <= lesson) for (const e of exprs) for (const ch of e) set.add(ch)
      cache.set(lesson, set)
    }
    return cache.get(lesson)!
  }
}

main().catch((e: unknown) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exitCode = 1
})
