// Dữ liệu nhỏ + DB giả trong bộ nhớ cho test seed.

import { randomUUID } from 'node:crypto'
import type { Row, SeedDb } from '../run'
import type { SeedFiles } from '../validate'

export const KANJI_HEADER = 'character,han_viet,meaning_vi,onyomi,kunyomi,stroke_count,jlpt_level'
export const VOCAB_HEADER = 'code,sort_order,expression,reading_kana,meaning_vi,romaji,han_viet,is_kana_only,jlpt_level'

export const KANJI_ROWS = [
  '学,HỌC,học,"{""ガク""}","{""まな.ぶ""}",8,5',
  '校,HIỆU,trường,"{""コウ""}",{},10,5',
  '時,THỜI,thời gian,"{""ジ""}","{""とき""}",,5',
]

export const VOCAB_ROWS = [
  'n5-0001,1,学校,がっこう,trường học,,HỌC HIỆU,false,5',
  'n5-0002,2,これ,これ,cái này,,,true,5',
  'n5-0003,3,時々,ときどき,thỉnh thoảng,,THỜI THỜI,false,5',
]

export function csv(header: string, rows: string[]): string {
  return [header, ...rows].join('\n') + '\n'
}

export function files(opts: { kanji?: string[]; vocab?: string[]; vocabHeader?: string } = {}): SeedFiles {
  return {
    kanji: { name: 'kanji.csv', text: csv(KANJI_HEADER, opts.kanji ?? KANJI_ROWS) },
    vocabularies: { name: 'vocabularies.csv', text: csv(opts.vocabHeader ?? VOCAB_HEADER, opts.vocab ?? VOCAB_ROWS) },
  }
}

/** Thay một dòng (theo vị trí 0-based) trong danh sách mặc định. */
export function withRow(rows: string[], index: number, row: string): string[] {
  return rows.map((r, i) => (i === index ? row : r))
}

/**
 * DB giả: upsert theo khoá, sinh id cho dòng mới, và kiểm tra UNIQUE như Postgres
 * (từng dòng, ngay lúc ghi) để test được trường hợp đổi chỗ sort_order.
 */
export class FakeDb implements SeedDb {
  tables: Record<string, Row[]> = { kanji: [], vocabularies: [], vocabulary_kanji: [] }
  writes = 0
  private unique: Record<string, string[][]> = {
    kanji: [['character']],
    vocabularies: [['code'], ['sort_order'], ['expression', 'reading_kana']],
    vocabulary_kanji: [['vocabulary_id', 'position']],
  }

  async fetchAll(table: string, columns: string[]): Promise<Row[]> {
    return (this.tables[table] ?? []).map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? null])))
  }

  async upsert(table: string, rows: Row[], onConflict: string): Promise<void> {
    this.writes++
    const keyCols = onConflict.split(',')
    const keyOf = (r: Row) => keyCols.map((c) => String(r[c])).join('#')
    for (const incoming of rows) {
      const list = (this.tables[table] ??= [])
      const target = list.find((r) => keyOf(r) === keyOf(incoming))
      const next: Row = target ? { ...target, ...incoming } : { id: randomUUID(), ...incoming }
      for (const cols of this.unique[table] ?? []) {
        const clash = list.find((r) => r !== target && cols.every((c) => r[c] === next[c]))
        if (clash) throw new Error(`duplicate key ${table}(${cols.join(',')})`)
      }
      if (target) Object.assign(target, incoming)
      else list.push(next)
    }
  }

  async deleteLinks(links: { vocabulary_id: string; position: number }[]): Promise<void> {
    this.writes++
    this.tables.vocabulary_kanji = this.tables.vocabulary_kanji.filter(
      (r) => !links.some((l) => l.vocabulary_id === r.vocabulary_id && l.position === r.position),
    )
  }

  vocabByCode(code: string): Row | undefined {
    return this.tables.vocabularies.find((r) => r.code === code)
  }
}

export const quiet = () => {}
