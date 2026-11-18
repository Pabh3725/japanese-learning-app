// V12: dữ liệu khu Kanji (scripts/kanji-data/v12_data.py) — đủ 214 bộ có nghĩa, đủ hạng tần suất cho chữ N5–N4.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCsv } from '../../seed/csv'

const rows = (name: string) => {
  const [head, ...body] = parseCsv(readFileSync(join(process.cwd(), 'data', 'n5', name), 'utf8')).records.map((r) => r.cells)
  return body.map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ''])))
}

describe('Dữ liệu V12', () => {
  it('radical_meanings.csv: đủ 214 bộ, khớp radicals.csv, có nghĩa, chữ ví dụ có trong bảng Kanji', () => {
    const meanings = rows('radical_meanings.csv')
    const radicals = rows('radicals.csv')
    const kanji = new Set(rows('kanji.csv').map((k) => k.character))
    expect(meanings).toHaveLength(214)
    meanings.forEach((m, i) => {
      expect(Number(m.number)).toBe(i + 1)
      expect(m.character).toBe(radicals[i].character)
      expect(m.meaning_vi.trim().length).toBeGreaterThan(0)
      expect(Number.isInteger(Number(m.n5n4_kanji))).toBe(true)
      expect([...m.examples].every((c) => kanji.has(c))).toBe(true)
      expect(['true', 'false']).toContain(m.approved)
    })
    expect(meanings.filter((m) => Number(m.n5n4_kanji) >= 2).length).toBeGreaterThanOrEqual(80)
  })

  it('kanji_frequency.csv: mọi chữ của kanji.csv, mọi chữ N5–N4 có hạng 1–2500', () => {
    const kanji = rows('kanji.csv')
    const freq = new Map(rows('kanji_frequency.csv').map((r) => [r.character, r.freq_rank]))
    expect(freq.size).toBe(kanji.length)
    for (const k of kanji.filter((x) => x.jlpt_level === '5' || x.jlpt_level === '4')) {
      const rank = Number(freq.get(k.character))
      expect(rank, k.character).toBeGreaterThanOrEqual(1)
      expect(rank, k.character).toBeLessThanOrEqual(2500)
    }
  })
})
