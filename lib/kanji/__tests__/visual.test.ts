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

const NO_INFO = () => ({ radicalName: null, hanViet: null, meaning: null })

describe('Dạng C — ghép thành phần (V10: 2–3 phần theo vị trí, có giải thích)', () => {
  it('休 = 亻 (trái) + 木 (phải); ghép đúng thứ tự mới đúng; giải thích lấy từ dữ liệu tra được', () => {
    const info = (part: KanjiPart) =>
      part.c === '亻' ? { radicalName: 'Bộ Nhân', hanViet: 'NHÂN', meaning: 'người' } : part.c === '木' ? { radicalName: 'Bộ Mộc', hanViet: 'MỘC', meaning: 'cây' } : NO_INFO()
    const q = buildPartsQuestion({ character: '休', hanViet: 'HƯU', meaning: 'nghỉ', parts: data.kanji['休'].parts }, all, info, seeded(1))!
    expect(q.slots).toEqual(['left', 'right'])
    expect(q.answer).toEqual(['亻', '木'])
    expect(q.pool).toEqual(expect.arrayContaining(['亻', '木']))
    expect(gradeParts(q, ['亻', '木'])).toBe(true)
    expect(gradeParts(q, ['木', '亻'])).toBe(false)
    expect(q.explanation.split('\n')).toEqual(['休 = 亻 + 木', '亻 (left): NHÂN · người · Bộ Nhân, a form of 人', '木 (right): MỘC · cây · Bộ Mộc'])
  })

  it('bao ngoài ghép trước phần bên trong; bố cục 3 phần theo thứ tự trái → trên → dưới', () => {
    const outer = all.find((k) => k.parts.length === 2 && k.parts.some((p) => p.pos === 'tarec'))!
    const q = buildPartsQuestion({ character: outer.character, hanViet: '', meaning: '', parts: outer.parts }, all, NO_INFO, seeded(2))!
    expect(q.slots).toEqual(['outside', 'inside'])
    const three = all.find((k) => k.parts.length === 3 && k.parts.map((p) => p.pos).join() === 'left,top,bottom')!
    expect(buildPartsQuestion({ character: three.character, hanViet: '', meaning: '', parts: three.parts }, all, NO_INFO, seeded(3))!.slots).toEqual(['left', 'top', 'bottom'])
  })

  it('không bịa thông tin: thành phần không tra được chỉ hiện hình và vị trí', () => {
    const q = buildPartsQuestion({ character: '休', hanViet: '', meaning: '', parts: data.kanji['休'].parts }, all, NO_INFO, seeded(1))!
    expect(q.explanation.split('\n').slice(1)).toEqual(['亻 (left)', '木 (right)'])
  })

  it('toàn bộ dữ liệu: đáp án nằm trong mảnh, mảnh nhiễu không trùng đáp án; chữ một khối hoặc thiếu vị trí thì không có câu', () => {
    let built = 0
    for (const k of all) {
      const q = buildPartsQuestion({ character: k.character, hanViet: '', meaning: '', parts: k.parts }, all, NO_INFO, seeded(k.character.codePointAt(0)!))
      if (!q) continue
      built++
      expect(q.slots.length, k.character).toBe(q.answer.length)
      expect(q.answer.length).toBeGreaterThanOrEqual(2)
      expect(q.answer.length).toBeLessThanOrEqual(3)
      const distractors = q.pool.filter((c, i) => q.pool.indexOf(c) === i && !q.answer.includes(c))
      expect(distractors.length).toBeGreaterThanOrEqual(2)
      for (const c of q.answer) expect(q.pool).toContain(c)
    }
    expect(built).toBeGreaterThan(500)
    expect(buildPartsQuestion({ character: '日', hanViet: '', meaning: '', parts: data.kanji['日'].parts }, all, NO_INFO)).toBeNull()
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
