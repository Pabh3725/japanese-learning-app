import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { orderNewKanji, type NeedTier, type NewKanjiCandidate } from '../new-order'

const k = (character: string, strokes: number | null, studyOrder: number): NewKanjiCandidate => ({ id: character, character, strokes, studyOrder })
const noParts = () => [] as string[]

describe('orderNewKanji (V12)', () => {
  it('chữ cần sớm cho từ vựng trước, theo mức 1 → 4', () => {
    const tiers: Record<string, NeedTier> = { 語: 1, 校: 2, 学: 3 }
    const order = orderNewKanji([k('一', 1, 1), k('学', 8, 2), k('校', 10, 3), k('語', 14, 4)], (id) => tiers[id] ?? 4, noParts)
    expect(order.map((c) => c.character)).toEqual(['語', '校', '学', '一'])
  })

  it('cùng mức: ít nét trước, bằng nhau thì theo thứ tự cũ; chưa có số nét thì sau', () => {
    const order = orderNewKanji([k('曜', 18, 1), k('人', 2, 5), k('口', 3, 3), k('木', 4, 2), k('?', null, 0), k('入', 2, 4)], () => 4, noParts)
    expect(order.map((c) => c.character)).toEqual(['入', '人', '口', '木', '曜', '?'])
  })

  it('thành phần trước chữ ghép, kể cả khi thành phần ở mức thấp hơn', () => {
    const parts: Record<string, string[]> = { 休: ['亻', '人', '木'], 明: ['日', '月'] }
    const tiers: Record<string, NeedTier> = { 休: 1, 明: 1 }
    const order = orderNewKanji([k('木', 4, 9), k('休', 6, 2), k('日', 4, 8), k('月', 4, 7), k('明', 8, 1)], (id) => tiers[id] ?? 4, (c) => parts[c] ?? [])
    expect(order.map((c) => c.character)).toEqual(['木', '休', '日', '月', '明'])
  })

  it('dữ liệu thật N5: đủ chữ, không trùng; mọi thành phần đang chờ mở đều đứng trước chữ ghép', () => {
    const csv = readFileSync(join(process.cwd(), 'data', 'n5', 'kanji.csv'), 'utf8').trim().split('\n').slice(1)
    const visual = JSON.parse(readFileSync(join(process.cwd(), 'data', 'n5', 'kanji_visual.json'), 'utf8')) as { kanji: Record<string, { parts: { c: string; original?: string }[] }> }
    const rows = csv
      .map((line, i) => {
        const cols = line.split(',')
        return { character: cols[0], strokes: Number(cols[cols.length - 2]) || null, level: cols[cols.length - 1], i }
      })
      .filter((r) => r.level === '5')
    const cands = rows.map((r) => k(r.character, r.strokes, r.i))
    const componentsOf = (c: string) => (visual.kanji[c]?.parts ?? []).flatMap((p) => [p.c, p.original ?? p.c])
    const order = orderNewKanji(cands, () => 4, componentsOf)
    expect(new Set(order.map((c) => c.character)).size).toBe(cands.length)
    const pos = new Map(order.map((c, i) => [c.character, i]))
    for (const c of order) for (const part of componentsOf(c.character)) if (pos.has(part) && part !== c.character) expect(pos.get(part)!, `${part} trước ${c.character}`).toBeLessThan(pos.get(c.character)!)
  })
})
