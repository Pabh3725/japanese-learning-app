// V9 gói 6 — dữ liệu Kanji trực quan: đọc KanjiVG, bộ thủ, chữ gần giống, file cặp, seed.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FakeDb, quiet } from '../../seed/__tests__/helpers'
import { seedVisual, validateVisual } from '../../seed/visual'
import { KANGXI_RADICALS, parseKanjiVg, radicalNumber } from '../kanjivg'
import { explainPair, findSimilarPairs, overlap, samplePath, shapeCells } from '../similar'
import { formatSimilarFile, mergeSimilar, parseSimilarFile } from '../similar-file'

// Trích đúng cấu trúc KanjiVG (休 và 体 rút gọn)
const XML = `<kanjivg>
<kanji id="kvg:kanji_04f11">
<g id="kvg:04f11" kvg:element="休">
  <g id="kvg:04f11-g1" kvg:element="亻" kvg:variant="true" kvg:original="人" kvg:position="left" kvg:radical="general">
    <path id="kvg:04f11-s1" d="M35,16.5c0.25,1.75,0.25,4.25-0.88,6.8C28.91,35.01,22.37,46.02,10.5,60.29"/>
    <path id="kvg:04f11-s2" d="M26.28,42.5c0.72,1.25,1.26,3.48,1.26,4.75c0,12.75-0.07,29.88-0.26,42.25"/>
  </g>
  <g id="kvg:04f11-g2" kvg:element="木" kvg:position="right">
    <path id="kvg:04f11-s3" d="M37.65,38.83c2.45,0.97,5.18,0.75,7.73,0.54c11.76-0.97,24.94-3.35,37.49-4.01"/>
    <path id="kvg:04f11-s4" d="M61.43,14c0.82,0.75,1.87,2.12,1.87,3.7c0,8.8,0.05,53.72-0.12,72.05"/>
  </g>
</g>
</kanji>
<kanji id="kvg:kanji_04f11-Kaisho"><g id="x" kvg:element="休"><path d="M1,1L2,2"/></g></kanji>
<kanji id="kvg:kanji_08a9e">
<g id="kvg:08a9e" kvg:element="語">
  <g kvg:element="言" kvg:position="left" kvg:radical="general"><g kvg:element="口"><path d="M10,10L20,20"/></g></g>
  <g kvg:element="吾" kvg:position="right"><g kvg:element="五"><path d="M30,30L40,40"/></g><g kvg:element="口"><path d="M50,50L60,60"/></g></g>
</g>
</kanji>
</kanjivg>`

describe('Đọc KanjiVG', () => {
  const v = parseKanjiVg(XML)

  it('nét viết theo thứ tự, thành phần có vị trí và dạng gốc, bộ thủ', () => {
    const k = v.get('休')!
    expect(k.strokes).toHaveLength(4)
    expect(k.parts).toEqual([
      { c: '亻', original: '人', pos: 'left', radical: true },
      { c: '木', pos: 'right' },
    ])
    expect(k.radicalChar).toBe('人')
    expect(radicalNumber(k.radicalChar)).toBe(9)
  })

  it('thành phần đủ mọi tầng: 語 = 言 + 吾, 吾 = 五 + 口', () => {
    expect(v.get('語')!.parts).toEqual([
      { c: '言', pos: 'left', radical: true, parts: [{ c: '口' }] },
      { c: '吾', pos: 'right', parts: [{ c: '五' }, { c: '口' }] },
    ])
  })

  it('bỏ các biến thể kiểu chữ (-Kaisho), chỉ lấy chữ được hỏi', () => {
    expect([...v.keys()].sort()).toEqual(['休', '語'])
    expect([...parseKanjiVg(XML, new Set(['語'])).keys()]).toEqual(['語'])
  })

  it('bộ thủ Khang Hy theo Unicode: đủ 214 bộ; dạng biến thể KanjiVG quy đúng số', () => {
    expect(KANGXI_RADICALS).toHaveLength(214)
    expect([radicalNumber('一'), radicalNumber('木'), radicalNumber('言'), radicalNumber('龠')]).toEqual([1, 75, 149, 214])
    expect([radicalNumber('戸'), radicalNumber('辶'), radicalNumber('青'), radicalNumber('黄')]).toEqual([63, 162, 174, 201])
    expect(radicalNumber('x')).toBeNull()
  })
})

describe('Chữ gần giống', () => {
  it('đọc đường nét SVG: đoạn thẳng và đường cong tới đúng điểm cuối', () => {
    const line = samplePath('M0,0L10,0', 4)
    expect(line.at(-1)).toEqual([10, 0])
    const curve = samplePath('M10,10c0,10,10,10,10,0', 4)
    expect(curve.at(-1)?.map((n) => Math.round(n))).toEqual([20, 10])
  })

  it('cùng một hình thì trùng 100%, hình khác hẳn thì thấp', () => {
    const a = shapeCells(['M10,50L100,50'])
    expect(overlap(a, a)).toBe(1)
    expect(overlap(a, shapeCells(['M50,5L50,100']))).toBeLessThan(0.3)
  })

  it('trên dữ liệu thật: tìm ra 日/目, 土/士, 大/犬; mỗi chữ không quá 3 cặp', () => {
    const json = JSON.parse(readFileSync(join(process.cwd(), 'data', 'n5', 'kanji_visual.json'), 'utf8')) as { kanji: Record<string, { strokes: string[]; parts: never[] }> }
    const visuals = Object.entries(json.kanji).map(([character, k]) => ({ character, strokes: k.strokes, parts: k.parts, radicalChar: null }))
    const pairs = findSimilarPairs(visuals)
    const has = (a: string, b: string) => pairs.some((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))
    expect(has('日', '目') && has('土', '士') && has('大', '犬')).toBe(true)
    const per = new Map<string, number>()
    for (const p of pairs) for (const c of [p.a, p.b]) per.set(c, (per.get(c) ?? 0) + 1)
    expect(Math.max(...per.values())).toBeLessThanOrEqual(3)
  })

  it('lời giải thích tự động nêu số nét và thành phần khác nhau', () => {
    const k = (character: string, n: number, parts: { c: string }[], hanViet: string, meaning: string) => ({ visual: { character, strokes: Array(n).fill('M0,0'), parts, radicalChar: null }, hanViet, meaning })
    expect(explainPair(k('休', 6, [{ c: '亻' }, { c: '木' }], 'HƯU', 'nghỉ'), k('体', 7, [{ c: '亻' }, { c: '本' }], 'THỂ', 'cơ thể'))).toBe(
      '休 (HƯU, nghỉ) và 体 (THỂ, cơ thể). 休 có 6 nét, 体 có 7 nét. Khác ở thành phần: 休 có 木, 体 có 本.',
    )
    expect(explainPair(k('土', 3, [], 'THỔ', 'đất'), k('士', 3, [], 'SĨ', 'kẻ sĩ'))).toContain('Cả hai đều 3 nét.')
  })
})

describe('File kanji_similar.csv', () => {
  it('ghi rồi đọc lại giữ nguyên; cặp đã duyệt không bị ghi đè, kể cả khi đề xuất mới không còn', () => {
    const rows = [{ a: '日', b: '目', score: 0.9, explanation: 'a, "b"', approved: true }]
    expect(parseSimilarFile(formatSimilarFile(rows))).toEqual(rows)
    const merged = mergeSimilar([{ a: '目', b: '日', score: 0.5, explanation: 'mới' }, { a: '土', b: '士', score: 0.7, explanation: 'x' }], rows)
    expect(merged).toEqual([rows[0], { a: '土', b: '士', score: 0.7, explanation: 'x', approved: false }])
  })
})

describe('Seed dữ liệu Kanji trực quan', () => {
  const radicals = 'number,character,name_vi,approved\n' + Array.from({ length: 214 }, (_, i) => `${i + 1},${KANGXI_RADICALS[i]},Bộ ${i + 1},false`).join('\n') + '\n'
  const files = {
    visual: { name: 'kanji_visual.json', text: JSON.stringify({ source: 'KanjiVG', kanji: { 学: { radical: 39, parts: [{ c: '子' }], strokes: ['M0,0L1,1'] } } }) },
    radicals: { name: 'radicals.csv', text: radicals },
    similar: { name: 'kanji_similar.csv', text: 'a,b,score,explanation,approved\n学,校,0.7,x,false\n' },
  }

  it('dữ liệu lạ bị chặn: chữ không có trong kanji.csv, thiếu bộ thủ', () => {
    expect(validateVisual(files, new Set(['学', '校'])).errors).toEqual([])
    expect(validateVisual(files, new Set(['学'])).errors.length).toBeGreaterThan(0)
    expect(validateVisual({ ...files, radicals: { name: 'radicals.csv', text: radicals.split('\n').slice(0, 10).join('\n') } }, new Set(['学', '校'])).errors.length).toBeGreaterThan(0)
  })

  it('ghi đúng bảng; chạy lại thì không ghi gì vì dữ liệu không đổi', async () => {
    const db = new FakeDb()
    db.tables.kanji = [{ id: 'k1', character: '学' }, { id: 'k2', character: '校' }]
    const data = validateVisual(files, new Set(['学', '校']))
    await seedVisual(db, data, false, quiet)
    expect(db.tables.radicals).toHaveLength(214)
    expect(db.tables.kanji_visuals).toEqual([{ id: expect.any(String), kanji_id: 'k1', radical_number: 39, parts: [{ c: '子' }], strokes: ['M0,0L1,1'], source: 'KanjiVG' }])
    expect(db.tables.kanji_similar_pairs).toHaveLength(1)
    const writes = db.writes
    await seedVisual(db, data, false, quiet)
    expect(db.writes).toBe(writes)
  })
})
