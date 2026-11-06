// Lõi của `pnpm seed`: validate → đọc DB → lập kế hoạch → in báo cáo → ghi.
// Nhận DB qua interface SeedDb, nên test được bằng DB giả trong bộ nhớ.

import { isEmpty, planTable, rowsMovingSortOrder, TEMP_SORT_OFFSET, type TablePlan } from './plan'
import type { KanjiRow, VocabRow } from './schema'
import { formatIssue, validateAll, type SeedFiles } from './validate'

export type Row = Record<string, unknown>

export interface SeedDb {
  /** Đọc mọi dòng của bảng (tự chia trang). */
  fetchAll(table: string, columns: string[]): Promise<Row[]>
  /** INSERT ... ON CONFLICT (onConflict) DO UPDATE. */
  upsert(table: string, rows: Row[], onConflict: string): Promise<void>
  /** Xoá liên kết vocabulary_kanji thừa (bảng suy ra, không ai tham chiếu). */
  deleteLinks(links: { vocabulary_id: string; position: number }[]): Promise<void>
}

export interface SeedOptions {
  files: SeedFiles
  /** null = chỉ validate, không đọc/ghi DB (--check). */
  db: SeedDb | null
  dryRun: boolean
  log: (line: string) => void
}

export interface SeedSummary {
  ok: boolean
  kanji?: TablePlan<KanjiRow>
  vocabularies?: TablePlan<VocabRow>
  links?: { inserts: number; updates: number; unchanged: number; stale: number }
  wrote: boolean
}

const KANJI_COLS = ['character', 'han_viet', 'meaning_vi', 'onyomi', 'kunyomi', 'stroke_count', 'jlpt_level'] as const
const VOCAB_COLS = ['code', 'sort_order', 'expression', 'reading_kana', 'meaning_vi', 'romaji', 'han_viet', 'is_kana_only', 'jlpt_level'] as const

function printPlan(name: string, plan: TablePlan<Row>, log: (s: string) => void) {
  log(`  ${name}: ${plan.inserts.length} mới · ${plan.updates.length} sửa · ${plan.unchanged} không đổi`)
  for (const c of plan.inserts.slice(0, 20)) log(`    + ${c.key}`)
  if (plan.inserts.length > 20) log(`    … và ${plan.inserts.length - 20} dòng mới khác`)
  for (const c of plan.updates.slice(0, 50)) log(`    ~ ${c.key}: ${c.changedColumns.join(', ')}`)
  if (plan.updates.length > 50) log(`    … và ${plan.updates.length - 50} dòng sửa khác`)
  if (plan.missingInFile.length) {
    log(`    ! ${plan.missingInFile.length} dòng có trong DB nhưng không còn trong file (KHÔNG xoá): ${plan.missingInFile.slice(0, 10).join(', ')}`)
  }
}

function pick(row: Row, cols: readonly string[]): Row {
  return Object.fromEntries(cols.map((c) => [c, row[c] ?? null]))
}

export async function runSeed({ files, db, dryRun, log }: SeedOptions): Promise<SeedSummary> {
  // ---------- 1. Validate toàn bộ ----------
  const v = validateAll(files)
  log(`Đọc ${v.kanji.length} Kanji, ${v.vocabularies.length} từ vựng, ${v.links.length} liên kết từ ↔ Kanji.`)

  if (v.warnings.length) {
    log(`\nCảnh báo (không chặn): ${v.warnings.length}`)
    for (const w of v.warnings.slice(0, 15)) log(`  - ${formatIssue(w)}`)
    if (v.warnings.length > 15) log(`  … và ${v.warnings.length - 15} cảnh báo khác`)
  }
  if (v.errors.length) {
    log(`\nLỖI: ${v.errors.length}. Không ghi gì vào database.`)
    for (const e of v.errors) log(`  ✗ ${formatIssue(e)}`)
    return { ok: false, wrote: false }
  }
  log('\nValidate: OK')
  if (!db) return { ok: true, wrote: false }

  // ---------- 2. Đọc DB, lập kế hoạch ----------
  const vocabCols: string[] = [...VOCAB_COLS, ...(v.hasEmojiColumn ? ['emoji'] : []), ...(v.hasLessonColumn ? ['lesson'] : [])]
  const [dbKanji, dbVocab] = await Promise.all([
    db.fetchAll('kanji', ['id', ...KANJI_COLS]),
    db.fetchAll('vocabularies', ['id', ...vocabCols]),
  ])

  const kanjiPlan = planTable(v.kanji as unknown as Row[], dbKanji, (r) => String(r.character), KANJI_COLS)
  const vocabPlan = planTable(v.vocabularies as unknown as Row[], dbVocab, (r) => String(r.code), vocabCols)

  // Liên kết: chỉ lập được đầy đủ khi biết id. Dòng mới chưa có id → đếm là "mới".
  const dbLinks = await db.fetchAll('vocabulary_kanji', ['vocabulary_id', 'position', 'kanji_id'])
  const fileCodes = new Set(v.vocabularies.map((r) => r.code))
  const linkPlan = planLinks(v.links, fileCodes, dbVocab, dbKanji, dbLinks)

  log('\nKế hoạch:')
  printPlan('kanji', kanjiPlan, log)
  printPlan('vocabularies', vocabPlan, log)
  log(`  vocabulary_kanji: ${linkPlan.inserts} mới · ${linkPlan.updates} sửa · ${linkPlan.unchanged} không đổi · ${linkPlan.stale} thừa sẽ xoá`)

  const summary: SeedSummary = {
    ok: true,
    kanji: kanjiPlan as unknown as TablePlan<KanjiRow>,
    vocabularies: vocabPlan as unknown as TablePlan<VocabRow>,
    links: { inserts: linkPlan.inserts, updates: linkPlan.updates, unchanged: linkPlan.unchanged, stale: linkPlan.stale },
    wrote: false,
  }

  const nothingToDo = isEmpty(kanjiPlan) && isEmpty(vocabPlan) && linkPlan.inserts + linkPlan.updates + linkPlan.stale === 0
  if (nothingToDo) {
    log('\nDatabase đã khớp file. Không có gì để ghi.')
    return summary
  }
  if (dryRun) {
    log('\nDry-run: chưa ghi gì. Chạy `pnpm seed` (không có --dry-run) để ghi.')
    return summary
  }

  // ---------- 3. Ghi: kanji → vocabularies → vocabulary_kanji ----------
  const changed = <T>(p: TablePlan<T>) => [...p.inserts, ...p.updates]

  if (!isEmpty(kanjiPlan)) {
    await db.upsert('kanji', changed(kanjiPlan).map((c) => pick(c.row, KANJI_COLS)), 'character')
  }

  if (!isEmpty(vocabPlan)) {
    const moving = rowsMovingSortOrder(vocabPlan)
    if (moving.length) {
      await db.upsert(
        'vocabularies',
        moving.map((c) => ({ ...pick(c.row, vocabCols), sort_order: TEMP_SORT_OFFSET + Number(c.row.sort_order) })),
        'code',
      )
    }
    await db.upsert('vocabularies', changed(vocabPlan).map((c) => pick(c.row, vocabCols)), 'code')
  }

  // Đọc lại id sau khi ghi (từ / Kanji mới vừa có id)
  const [kanjiIds, vocabIds, linksNow] = await Promise.all([
    db.fetchAll('kanji', ['id', 'character']),
    db.fetchAll('vocabularies', ['id', 'code']),
    db.fetchAll('vocabulary_kanji', ['vocabulary_id', 'position', 'kanji_id']),
  ])
  const finalLinks = planLinks(v.links, fileCodes, vocabIds, kanjiIds, linksNow)
  if (finalLinks.toUpsert.length) await db.upsert('vocabulary_kanji', finalLinks.toUpsert, 'vocabulary_id,position')
  if (finalLinks.toDelete.length) await db.deleteLinks(finalLinks.toDelete)

  log('\nĐã ghi xong.')
  return { ...summary, wrote: true }
}

// ---------------------------------------------------------------------------

export function planLinks(
  links: { code: string; position: number; character: string }[],
  /** code của mọi từ trong file (kể cả từ chỉ có Kana, không có liên kết). */
  fileCodes: Set<string>,
  vocabRows: Row[],
  kanjiRows: Row[],
  dbLinks: Row[],
) {
  const vocabId = new Map(vocabRows.map((r) => [String(r.code), String(r.id)]))
  const kanjiId = new Map(kanjiRows.map((r) => [String(r.character), String(r.id)]))
  const existing = new Map(dbLinks.map((r) => [`${r.vocabulary_id}#${r.position}`, String(r.kanji_id)]))

  const desiredKeys = new Set<string>()
  const toUpsert: { vocabulary_id: string; position: number; kanji_id: string }[] = []
  let inserts = 0
  let updates = 0
  let unchanged = 0

  for (const l of links) {
    const vid = vocabId.get(l.code)
    const kid = kanjiId.get(l.character)
    if (!vid || !kid) {
      inserts++ // từ hoặc Kanji chưa có trong DB → sẽ tạo sau khi ghi
      continue
    }
    const key = `${vid}#${l.position}`
    desiredKeys.add(key)
    const current = existing.get(key)
    if (current === undefined) inserts++
    else if (current !== kid) updates++
    else {
      unchanged++
      continue
    }
    toUpsert.push({ vocabulary_id: vid, position: l.position, kanji_id: kid })
  }

  // Chỉ xoá liên kết thừa của những từ còn trong file (vd. sửa expression ít Kanji hơn).
  // Từ đã biến mất khỏi file giữ nguyên mọi thứ (data-spec §1.4).
  const vocabInFile = new Set(vocabRows.filter((r) => fileCodes.has(String(r.code))).map((r) => String(r.id)))
  const toDelete = dbLinks
    .filter((r) => !desiredKeys.has(`${r.vocabulary_id}#${r.position}`))
    .filter((r) => vocabInFile.has(String(r.vocabulary_id)))
    .map((r) => ({ vocabulary_id: String(r.vocabulary_id), position: Number(r.position) }))

  return { inserts, updates, unchanged, stale: toDelete.length, toUpsert, toDelete }
}
