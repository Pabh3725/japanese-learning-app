// JLPT đợt 2: mọi mục soạn sẵn (data/jlpt/*.json) dựng được câu hợp lệ — đủ lựa chọn, không trùng, đáp án đúng chỗ sau khi xáo.
import { describe, expect, it } from 'vitest'
import n4 from '../../../data/jlpt/n4.json'
import n5 from '../../../data/jlpt/n5.json'
import { CONTENT_TYPES, contentQuestions, type LevelContent } from '../content'
import { publicQuestion } from '../questions'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const LEVELS: [string, LevelContent][] = [
  ['N5', n5 as LevelContent],
  ['N4', n4 as LevelContent],
]
type AnyItem = Parameters<typeof contentQuestions>[1]

describe.each(LEVELS)('JLPT đợt 2 %s', (level, content) => {
  it('có đủ các dạng (用法 chỉ ở N4)', () => {
    const types = Object.keys(content).sort()
    const expected = CONTENT_TYPES.filter((t) => level === 'N4' || t !== 'usage').sort()
    expect(types).toEqual(expected)
  })

  for (const type of CONTENT_TYPES) {
    const items = (content[type] ?? []) as (AnyItem & { code: string })[]
    if (items.length === 0) continue
    it(`${type}: mỗi mục dựng được câu hợp lệ`, () => {
      const codes = new Set<string>()
      for (const item of items) {
        expect(codes.has(item.code), item.code).toBe(false)
        codes.add(item.code)
        // Xáo nhiều lần: đáp án luôn trỏ đúng lựa chọn gốc
        for (let seed = 1; seed <= 5; seed++) {
          const questions = contentQuestions(type, item, seeded(seed))
          expect(questions.length, item.code).toBeGreaterThan(0)
          for (const q of questions) {
            const n = type === 'verbal_expressions' ? 3 : 4
            expect(q.options, q.ref).toHaveLength(n)
            expect(new Set(q.options).size, q.ref).toBe(n)
            expect(q.answer, q.ref).toBeGreaterThanOrEqual(0)
            expect(q.answer, q.ref).toBeLessThan(n)
            expect(q.explanation.length, q.ref).toBeGreaterThan(0)
            if (q.optionStems) expect(q.optionStems.map((s) => s.map((p) => p.t).join('')), q.ref).toEqual(q.options)
            if (type === 'listening_task' || type === 'verbal_expressions') expect(q.script?.length, q.ref).toBeGreaterThan(0)
            if (type === 'text_grammar') expect(q.passage!.flat().some((p) => p.t === q.blankMark), q.ref).toBe(true)
            expect(publicQuestion(q)).not.toHaveProperty('answer')
          }
        }
      }
    })
  }
})
