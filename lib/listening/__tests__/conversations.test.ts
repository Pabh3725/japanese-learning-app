// Luyện nghe đợt B: hội thoại bài 1–25 (data/listening/conversations.json) hợp lệ; chấm, chép theo đoạn, câu nghe sai.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import data from '../../../data/listening/conversations.json'
import type { GrammarLessonFile } from '../../grammar/types'
import { blankQuestionOf, buildConversationSession, gradeConversation, passageDictation, passageLineOf, publicLines, type Conversation } from '../conversations'
import { gradeListening } from '../questions'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const all = data as Conversation[]
const points = new Map<string, number>()
for (const f of readdirSync(join(process.cwd(), 'data', 'grammar')).filter((x) => x.endsWith('.json'))) {
  const file = JSON.parse(readFileSync(join(process.cwd(), 'data', 'grammar', f), 'utf8')) as GrammarLessonFile
  for (const p of file.points) points.set(p.code, file.lesson)
}

describe('Hội thoại bài 1–25', () => {
  it('mỗi bài 1–25: 1 ngắn + 1 dài, đúng số lượt / số ô, mẫu ngữ pháp thuộc bài ≤ bài đó', () => {
    for (let lesson = 1; lesson <= 25; lesson++) {
      const list = all.filter((c) => c.lesson === lesson)
      expect(list.map((c) => c.kind).sort(), `bài ${lesson}`).toEqual(['long', 'short'])
    }
    for (const c of all) {
      const [lines, blanks] = c.kind === 'short' ? [[6, 8], [4, 6]] : [[10, 14], [8, 10]]
      expect(c.lines.length, c.code).toBeGreaterThanOrEqual(lines[0])
      expect(c.lines.length, c.code).toBeLessThanOrEqual(lines[1])
      expect(c.blanks.length, c.code).toBeGreaterThanOrEqual(blanks[0])
      expect(c.blanks.length, c.code).toBeLessThanOrEqual(blanks[1])
      for (const code of c.patterns) expect(points.get(code), `${c.code} ${code}`).toBeLessThanOrEqual(c.lesson)
      for (const l of c.lines) expect(l.meaning.length, c.code).toBeGreaterThan(0)
      for (const b of c.blanks) {
        expect(new Set(b.options).size, `${c.code}: ${b.options.join('/')}`).toBe(4)
        // Đáp án chính là chữ trong lời thoại
        expect(c.lines[b.line].pieces[b.piece].t, c.code).toBe(b.options[b.answer])
      }
    }
  })

  it('dựng phiên: xáo lựa chọn, chấm đúng; lời gửi trình duyệt không lộ đáp án', () => {
    for (const [i, c] of all.entries()) {
      const s = buildConversationSession(c, seeded(i))
      s.blanks.forEach((b, j) => expect(b.options[b.answer]).toBe(c.blanks[j].options[c.blanks[j].answer]))
      expect(gradeConversation(s, s.blanks.map((b) => b.answer)).every(Boolean)).toBe(true)
      expect(gradeConversation(s, s.blanks.map(() => null)).some(Boolean)).toBe(false)
      const pub = publicLines(c)
      for (const b of c.blanks) expect(pub[b.line].pieces[b.piece]).toEqual({ t: '', blank: c.blanks.indexOf(b) })
    }
  })

  it('chép theo đoạn: từng lượt theo thứ tự, câu chỉ có kana khi đọc, gõ đúng là đúng', () => {
    let lines = 0
    let dictated = 0
    for (const c of all) {
      const qs = passageDictation(c)
      lines += c.lines.length
      dictated += new Set(qs.map((q) => q.ref.split('@')[1].split('.')[0])).size
      qs.forEach((q, i) => {
        expect(q.before!.length, q.ref).toBeGreaterThanOrEqual(i === 0 ? 0 : 1)
        expect(gradeListening(q, q.answer), q.ref).toEqual({ correct: true })
        expect(passageLineOf(all, q.ref)?.answer).toBe(q.answer)
      })
    }
    // Hầu hết lượt chép được (lượt có chữ số / chữ Latin bị bỏ)
    expect(dictated / lines).toBeGreaterThan(0.85)
  })

  it('ô sai dựng lại thành câu nghe lẻ', () => {
    for (const c of all) {
      c.blanks.forEach((_, i) => {
        const q = blankQuestionOf(all, `${c.code}#${i}`, seeded(i))!
        expect(q.options).toHaveLength(4)
        expect(gradeListening(q, q.answer)).toEqual({ correct: true })
      })
    }
    expect(blankQuestionOf(all, 'khong#1', seeded(1))).toBeNull()
  })
})
