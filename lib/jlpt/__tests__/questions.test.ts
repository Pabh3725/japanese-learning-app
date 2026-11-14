// JLPT đợt 1: dựng câu trên toàn bộ dữ liệu thật — đủ lựa chọn, không trùng, đúng một đáp án.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { GrammarLessonFile } from '../../grammar/types'
import { buildGrammarForm, buildKanjiReading, buildKatakana, buildOrthography, buildQuickResponse, buildSentenceOrder, hasKanji, isKatakanaWord, publicQuestion, wordKind, type JlptGrammarSentence, type JlptQuestion, type JlptWord } from '../questions'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' } else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

const vocab = parseCsv(readFileSync(join(process.cwd(), 'data', 'n5', 'vocabularies.csv'), 'utf8'))
const words: JlptWord[] = vocab.map((r) => ({ id: r.code, code: r.code, expression: r.expression, reading: r.reading_kana, meaning: r.meaning_vi, hanViet: r.han_viet || null }))
const dir = join(process.cwd(), 'data', 'grammar')
const sentences: JlptGrammarSentence[] = readdirSync(dir).flatMap((f) => {
  const file = JSON.parse(readFileSync(join(dir, f), 'utf8')) as GrammarLessonFile
  return file.points.flatMap((p) => p.sentences.filter((s) => !s.hidden).map((s) => ({ ...s, pattern: p.pattern, patternMeaning: p.meaning })))
})

function checkQuestion(q: JlptQuestion, optionCount: number) {
  expect(q.options).toHaveLength(optionCount)
  expect(new Set(q.options).size, `${q.ref}: lựa chọn trùng ${q.options.join(' / ')}`).toBe(optionCount)
  expect(q.answer).toBeGreaterThanOrEqual(0)
  expect(q.answer).toBeLessThan(optionCount)
  expect(q.options.every((o) => o.length > 0)).toBe(true)
  expect(publicQuestion(q)).not.toHaveProperty('answer')
}

describe('JLPT đợt 1 trên dữ liệu thật', () => {
  it('漢字読み: hầu hết từ có Kanji dựng được; đáp án là cách đọc thật, từ được hỏi gạch chân', () => {
    const kanjiWords = words.filter((w) => hasKanji(w.expression))
    const readingsOf = new Map<string, Set<string>>()
    for (const w of words) readingsOf.set(w.expression, (readingsOf.get(w.expression) ?? new Set()).add(w.reading))
    let built = 0
    for (const [i, w] of kanjiWords.entries()) {
      const sentence = sentences.find((s) => s.pieces.some((p) => p.t === w.expression)) ?? null
      const q = buildKanjiReading(w, sentence, readingsOf.get(w.expression)!, seeded(i + 1))
      if (!q) continue
      built++
      checkQuestion(q, 4)
      expect(q.options[q.answer]).toBe(w.reading)
      // Không có nhiễu nào là cách đọc đúng khác của cùng cách viết
      for (const [j, o] of q.options.entries()) if (j !== q.answer) expect(readingsOf.get(w.expression)!.has(o)).toBe(false)
      expect(q.stem!.filter((p) => p.mark === 'underline')).toEqual([{ t: w.expression, mark: 'underline' }])
    }
    expect(built / kanjiWords.length).toBeGreaterThan(0.93)
  })

  it('表記: không nhiễu nào là cách viết của từ có thật cùng cách đọc', () => {
    const byReading = new Map<string, Set<string>>()
    for (const w of words) byReading.set(w.reading, (byReading.get(w.reading) ?? new Set()).add(w.expression))
    const pool = [...new Set(words.filter((w) => hasKanji(w.expression)).flatMap((w) => [...w.expression].filter((c) => /[㐀-鿿]/.test(c))))]
    // Thay thử bằng chữ bất kỳ trong kho (DAL dùng chữ gần giống và chữ cùng âm On)
    const swaps = (c: string) => pool.filter((x) => x !== c).slice(0, 8)
    let built = 0
    const kanjiWords = words.filter((w) => hasKanji(w.expression)).slice(0, 400)
    for (const [i, w] of kanjiWords.entries()) {
      const q = buildOrthography(w, null, swaps, byReading.get(w.reading)!, kanjiWords.map((x) => x.expression), seeded(i + 7))
      if (!q) continue
      built++
      checkQuestion(q, 4)
      expect(q.options[q.answer]).toBe(w.expression)
      for (const [j, o] of q.options.entries()) if (j !== q.answer) expect(byReading.get(w.reading)!.has(o)).toBe(false)
      expect(q.stem).toEqual([{ t: w.reading, mark: 'underline' }])
    }
    expect(built).toBeGreaterThan(380)
  })

  it('文法形式の判断, 文の組み立て, 即時応答: dựng được nhiều câu, lựa chọn hợp lệ', () => {
    let form = 0
    let order = 0
    let reply = 0
    for (const [i, s] of sentences.entries()) {
      const f = buildGrammarForm(s, seeded(i + 3))
      if (f) { form++; checkQuestion(f, 4); expect(f.stem!.filter((p) => p.mark === 'blank')).toHaveLength(1) }
      const o = buildSentenceOrder(s, seeded(i + 5))
      if (o) {
        order++
        checkQuestion(o, 4)
        expect(o.stem!.filter((p) => p.mark === 'star')).toHaveLength(1)
        expect(o.stem!.filter((p) => p.mark === 'hidden')).toHaveLength(3)
      }
      const r = buildQuickResponse(s, seeded(i + 9))
      if (r) { reply++; checkQuestion(r, 3); expect(r.audio?.length).toBeGreaterThan(0) }
    }
    expect(form).toBeGreaterThan(5000)
    expect(order).toBeGreaterThan(2000)
    expect(reply).toBeGreaterThan(700)
  })
})

describe('sửa theo đề thật (jlpt.jp)', () => {
  it('漢字読み: nhiễu từ cùng bài phải cùng loại từ, không phải cụm có です', () => {
    const w: JlptWord = { id: 'x', code: 'x', expression: '雨', reading: 'あめ', meaning: 'mưa', hanViet: null }
    const q = buildKanjiReading(w, null, new Set(['あめ']), seeded(3), ['ゆき', 'はれ', 'いきます', 'たかい', 'しつれいですが'])!
    for (const [i, o] of q.options.entries()) if (i !== q.answer) expect(['verb', 'adj']).not.toContain(wordKind(o))
    expect(q.options).not.toContain('しつれいですが')
  })
  it('表記: từ hai chữ Hán dùng lưới 2×2', () => {
    const w: JlptWord = { id: 'g', code: 'g', expression: '学校', reading: 'がっこう', meaning: 'trường', hanViet: null }
    const swaps = (c: string) => (c === '学' ? ['宇'] : c === '校' ? ['枚'] : [])
    const q = buildOrthography(w, null, swaps, new Set(['学校']), [], seeded(1))!
    expect([...q.options].sort()).toEqual(['学校', '学枚', '宇校', '宇枚'].sort())
  })
  it('表記 Katakana: lưới 2×2 chữ dễ nhầm, đề viết Hiragana; từ thiếu chỗ dễ nhầm thì bỏ', () => {
    const kata = words.filter((w) => isKatakanaWord(w.expression))
    let built = 0
    for (const [i, w] of kata.entries()) {
      const q = buildKatakana(w, null, seeded(i + 1))
      if (!q) continue
      built++
      checkQuestion(q, 4)
      expect(q.options[q.answer]).toBe(w.expression)
      expect(q.stem![0].t).toMatch(/^[\u3041-\u3096]+$/)
    }
    expect(built).toBeGreaterThan(60)
  })
  it('文の組み立て: ★ không cố định ở một ô', () => {
    const positions = new Set<number>()
    for (const [i, s] of sentences.slice(0, 400).entries()) {
      const q = buildSentenceOrder(s, seeded(i + 11))
      if (!q) continue
      const blanks = q.stem!.filter((p) => p.mark === 'hidden' || p.mark === 'star')
      positions.add(blanks.findIndex((p) => p.mark === 'star'))
    }
    expect(positions.size).toBe(4)
  })
})
