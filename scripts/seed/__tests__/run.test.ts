// Test luồng seed với DB giả: điều kiện nghiệm thu DATA-03.

import { describe, expect, it } from 'vitest'
import { runSeed } from '../run'
import { FakeDb, VOCAB_ROWS, files, quiet, withRow } from './helpers'

const seed = (db: FakeDb | null, f = files(), dryRun = false) => runSeed({ files: f, db, dryRun, log: quiet })

describe('pnpm seed', () => {
  it('lần đầu: tạo đủ kanji, từ vựng và liên kết (position từ 1)', async () => {
    const db = new FakeDb()
    const r = await seed(db)
    expect(r.ok).toBe(true)
    expect(r.wrote).toBe(true)
    expect(db.tables.kanji).toHaveLength(3)
    expect(db.tables.vocabularies).toHaveLength(3)
    expect(db.tables.vocabulary_kanji.map((l) => l.position).sort()).toEqual([1, 1, 2, 2])
  })

  it('chạy lần 2: tổng số dòng không đổi, không ghi gì (idempotent)', async () => {
    const db = new FakeDb()
    await seed(db)
    const writesAfterFirst = db.writes
    const counts = Object.fromEntries(Object.entries(db.tables).map(([t, rows]) => [t, rows.length]))

    const r = await seed(db)
    expect(r.vocabularies).toMatchObject({ inserts: [], updates: [], unchanged: 3 })
    expect(r.links).toMatchObject({ inserts: 0, updates: 0, stale: 0, unchanged: 4 })
    expect(db.writes).toBe(writesAfterFirst)
    expect(Object.fromEntries(Object.entries(db.tables).map(([t, rows]) => [t, rows.length]))).toEqual(counts)
  })

  it('sửa meaning_vi 1 từ: DB cập nhật, id giữ nguyên (tiến độ còn nguyên)', async () => {
    const db = new FakeDb()
    await seed(db)
    const idBefore = db.vocabByCode('n5-0001')?.id

    const f = files({ vocab: withRow(VOCAB_ROWS, 0, VOCAB_ROWS[0].replace('trường học', 'trường học (sửa)')) })
    const r = await seed(db, f)
    expect(r.vocabularies?.updates).toEqual([expect.objectContaining({ key: 'n5-0001', changedColumns: ['meaning_vi'] })])
    expect(db.vocabByCode('n5-0001')).toMatchObject({ id: idBefore, meaning_vi: 'trường học (sửa)' })
    expect(db.tables.vocabularies).toHaveLength(3)
  })

  it('dry-run: in kế hoạch nhưng không ghi', async () => {
    const db = new FakeDb()
    const r = await seed(db, files(), true)
    expect(r.vocabularies?.inserts).toHaveLength(3)
    expect(r.wrote).toBe(false)
    expect(db.writes).toBe(0)
  })

  it('có 1 dòng lỗi: dừng trước khi đọc/ghi database', async () => {
    const db = new FakeDb()
    const r = await seed(db, files({ vocab: withRow(VOCAB_ROWS, 1, 'n5-0002,2,これ,これ,,,,true,5') }))
    expect(r.ok).toBe(false)
    expect(db.writes).toBe(0)
    expect(db.tables.vocabularies).toHaveLength(0)
  })

  it('--check (không có DB): chỉ validate', async () => {
    const r = await seed(null)
    expect(r).toEqual({ ok: true, wrote: false })
  })

  it('đổi chỗ 2 từ trong lộ trình không vướng UNIQUE sort_order', async () => {
    const db = new FakeDb()
    await seed(db)
    const swapped = [
      VOCAB_ROWS[0].replace('n5-0001,1,', 'n5-0001,2,'),
      VOCAB_ROWS[1].replace('n5-0002,2,', 'n5-0002,1,'),
      VOCAB_ROWS[2],
    ]
    const r = await seed(db, files({ vocab: swapped }))
    expect(r.ok).toBe(true)
    expect(db.vocabByCode('n5-0001')?.sort_order).toBe(2)
    expect(db.vocabByCode('n5-0002')?.sort_order).toBe(1)
  })

  it('từ biến mất khỏi file: KHÔNG xoá, chỉ báo', async () => {
    const db = new FakeDb()
    await seed(db)
    const r = await seed(db, files({ vocab: VOCAB_ROWS.slice(0, 2) }))
    expect(r.vocabularies?.missingInFile).toEqual(['n5-0003'])
    expect(db.tables.vocabularies).toHaveLength(3)
    expect(db.tables.vocabulary_kanji).toHaveLength(4)
  })

  it('sửa expression ít Kanji hơn: liên kết thừa của từ đó bị dọn', async () => {
    const db = new FakeDb()
    await seed(db)
    const f = files({ vocab: withRow(VOCAB_ROWS, 2, 'n5-0003,3,時,とき,lúc,,THỜI,false,5') })
    const r = await seed(db, f)
    expect(r.links?.stale).toBe(1)
    const id = db.vocabByCode('n5-0003')?.id
    expect(db.tables.vocabulary_kanji.filter((l) => l.vocabulary_id === id).map((l) => l.position)).toEqual([1])
  })

  it('file không có cột emoji: không đụng emoji đã có trong DB', async () => {
    const db = new FakeDb()
    await seed(db)
    db.vocabByCode('n5-0001')!.emoji = '🏫'
    const r = await seed(db)
    expect(r.vocabularies?.updates).toEqual([])
    expect(db.vocabByCode('n5-0001')?.emoji).toBe('🏫')
  })
})
