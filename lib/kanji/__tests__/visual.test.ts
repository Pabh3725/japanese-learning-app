// V9 R12 — câu hỗ trợ Kanji trực quan, chạy trên toàn bộ dữ liệu thật.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPartsQuestion, buildSimilarQuestion, gradeParts, pickMatchItems, type KanjiPart } from '../visual'

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const data = JSON.parse(readFileSync(join(process.cwd(), 'data', 'n5', 'kanji_visual.json'), 'utf8')) as { kanji: Record<string, { parts: KanjiPart[]; strokes: string[] }> }
const all = Object.entries(data.kanji).map(([character, k]) => ({ character, parts: k.parts }))

describe('Dạng C — ghép thành phần', () => {
  it('休 = 亻 + 木 theo hàng ngang; ghép đúng thứ tự mới đúng', () => {
    const q = buildPartsQuestion({ character: '休', hanViet: 'HƯU', meaning: 'nghỉ', parts: data.kanji['休'].parts }, all, seeded(1))!
    expect(q.layout).toBe('row')
    expect(q.answer).toEqual(['亻', '木'])
    expect(q.pool).toEqual(expect.arrayContaining(['亻', '木']))
    expect(gradeParts(q, ['亻', '木'])).toBe(true)
    expect(gradeParts(q, ['木', '亻'])).toBe(false)
  })

  it('toàn bộ dữ liệu: câu dựng được thì đáp án nằm trong mảnh, không mảnh nhiễu nào trùng đáp án; chữ một khối thì không có câu', () => {
    let built = 0
    for (const k of all) {
      const q = buildPartsQuestion({ character: k.character, hanViet: '', meaning: '', parts: k.parts }, all, seeded(k.character.codePointAt(0)!))
      if (!q) continue
      built++
      expect(new Set(q.pool).size, k.character).toBe(q.pool.length)
      for (const c of q.answer) expect(q.pool).toContain(c)
    }
    expect(built).toBeGreaterThan(200)
    expect(buildPartsQuestion({ character: '日', hanViet: '', meaning: '', parts: data.kanji['日'].parts }, all)).toBeNull()
  })
})

describe('Dạng E — phân biệt chữ gần giống', () => {
  it('đáp án là chữ đúng, chữ nhiễu là các chữ gần giống đã duyệt, có giải thích', () => {
    const q = buildSimilarQuestion({ character: '日', hanViet: 'NHẬT', meaning: 'ngày' }, [{ other: '目', explanation: '日 có 4 nét, 目 có 5 nét.' }], seeded(2))!
    expect(q.options.sort()).toEqual(['日', '目'])
    expect(q.answer).toBe('日')
    expect(q.explanation).toContain('5 nét')
    expect(buildSimilarQuestion({ character: '日', hanViet: '', meaning: '' }, [])).toBeNull()
  })
})

describe('Dạng F — ghép cặp', () => {
  const item = (character: string, meaning: string, hanViet: string) => ({ id: character, character, meaning, hanViet, reading: '' })
  it('cần ít nhất 4 chữ; nghĩa trùng nhau thì chỉ giữ một để không có hai đáp án đúng', () => {
    const items = [item('日', 'ngày', 'NHẬT'), item('月', 'tháng', 'NGUYỆT'), item('火', 'lửa', 'HỎA'), item('水', 'nước', 'THỦY'), item('曜', 'ngày', 'DIỆU')]
    const picked = pickMatchItems(items, 'meaning', seeded(3))!
    expect(picked.filter((k) => k.meaning === 'ngày')).toHaveLength(1)
    expect(pickMatchItems(items.slice(0, 3), 'meaning')).toBeNull()
  })
})
