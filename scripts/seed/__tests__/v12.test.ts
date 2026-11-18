// V12 gói 2: bước seed nghĩa bộ thủ và hạng tần suất — validate dữ liệu thật, chỉ ghi dòng thay đổi, chạy lại không ghi.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Row, SeedDb } from '../run'
import { seedV12, validateV12 } from '../v12'

const read = (name: string) => ({ name, text: readFileSync(join(process.cwd(), 'data', 'n5', name), 'utf8') })
const kanjiText = read('kanji.csv').text
const chars = new Set(kanjiText.split('\n').slice(1).map((l) => l.slice(0, l.indexOf(','))).filter(Boolean))

function fakeDb(tables: Record<string, Row[]>) {
  const writes: Record<string, number> = {}
  const db: SeedDb = {
    async fetchAll(table) {
      return (tables[table] ?? []).map((r) => ({ ...r }))
    },
    async upsert(table, rows, onConflict) {
      writes[table] = (writes[table] ?? 0) + rows.length
      for (const r of rows) {
        const list = tables[table]
        const i = list.findIndex((x) => x[onConflict] === r[onConflict])
        if (i >= 0) list[i] = { ...list[i], ...r }
        else list.push(r)
      }
    },
    async deleteLinks() {},
  }
  return { db, writes }
}

describe('Seed V12', () => {
  const files = { radicalMeanings: read('radical_meanings.csv'), kanjiFrequency: read('kanji_frequency.csv') }

  it('dữ liệu thật hợp lệ: 214 bộ có nghĩa, mọi chữ có dòng tần suất', () => {
    const data = validateV12(files, chars)
    expect(data.errors).toEqual([])
    expect(data.radicals).toHaveLength(214)
    expect(data.frequency.size).toBe(chars.size)
  })

  it('ghi dòng thay đổi, giữ cột cũ; chạy lại không ghi', async () => {
    const data = validateV12(files, chars)
    const tables: Record<string, Row[]> = {
      radicals: Array.from({ length: 214 }, (_, i) => ({ number: i + 1, character: 'x', name_vi: 'Bộ X', approved: true, variants: '', meaning_vi: null, n5n4_kanji: 0, meaning_approved: false })),
      kanji: [...chars].map((c, i) => ({ id: `k${i}`, character: c, han_viet: 'HV', meaning_vi: 'nghĩa', onyomi: [], kunyomi: [], stroke_count: 1, jlpt_level: 5, study_order: i, freq_rank: null })),
    }
    const first = fakeDb(tables)
    await seedV12(first.db, data, false, () => {})
    expect(first.writes.radicals).toBe(214)
    expect(tables.radicals[29].meaning_vi).toBe('miệng')
    expect(tables.radicals[29].name_vi).toBe('Bộ X')
    expect(tables.kanji.find((k) => k.character === '一')!.freq_rank).toBe(2)
    const again = fakeDb(tables)
    await seedV12(again.db, data, false, () => {})
    expect(again.writes).toEqual({})
  })

  it('báo lỗi khi thiếu nghĩa hoặc chữ lạ', () => {
    const bad = validateV12({ radicalMeanings: { name: 'r.csv', text: 'number,character,variants,meaning_vi,n5n4_kanji,examples,approved\n1,一,,,3,,true\n' }, kanjiFrequency: { name: 'f.csv', text: 'character,freq_rank\n𠀋,9\n' } }, chars)
    expect(bad.errors.some((e) => e.includes('thiếu nghĩa'))).toBe(true)
    expect(bad.errors.some((e) => e.includes('không có trong kanji.csv'))).toBe(true)
  })
})
