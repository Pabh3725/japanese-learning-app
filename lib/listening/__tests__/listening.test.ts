// LISTENING_V1 trên dữ liệu thật: mọi bài 1–50 dựng đủ câu cho mọi dạng; đề thi thử đủ 4 問題 đúng số câu; đáp án đúng chấm đúng.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toRomaji } from 'wanakana'
import { describe, expect, it } from 'vitest'
import n4 from '../../../data/jlpt/n4.json'
import n5 from '../../../data/jlpt/n5.json'
import { parseCsv } from '../../../scripts/seed/csv'
import type { GrammarLessonFile } from '../../grammar/types'
import { LESSONS_OF, type JlptLevel } from '../../jlpt/catalog'
import { approvedItems, type LevelContent, type ListeningItem, type VerbalItem } from '../../jlpt/content'
import {
  buildLessonSession,
  buildMock,
  dictationDiff,
  gradeListening,
  LESSON_TYPES,
  LISTENING_V1,
  publicListeningQuestion,
  scoreMock,
  type LessonSentence,
  type LessonWord,
  type ListeningQuestion,
} from '../questions'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const NOT_DICTABLE = /[～〜（）()…]/

const dir = join(process.cwd(), 'data', 'grammar')
const sentencesByLesson = new Map<number, LessonSentence[]>()
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const file = JSON.parse(readFileSync(join(dir, f), 'utf8')) as GrammarLessonFile
  for (const p of file.points) {
    const list = sentencesByLesson.get(file.lesson) ?? []
    list.push(...p.sentences.filter((s) => !s.hidden).map((s) => ({ ...s, pattern: p.pattern, patternMeaning: p.meaning, pointCode: p.code })))
    sentencesByLesson.set(file.lesson, list)
  }
}
const [head, ...body] = parseCsv(readFileSync(join(process.cwd(), 'data', 'n5', 'vocabularies.csv'), 'utf8')).records.map((r) => r.cells)
const vocab = body.map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ''])))
const wordsOf = (lesson: number): LessonWord[] =>
  vocab
    .filter((r) => Number(r.lesson) === lesson && !NOT_DICTABLE.test(r.expression))
    .map((r) => ({ id: r.code, code: r.code, expression: r.expression, reading: r.reading_kana, meaning: r.meaning_vi }))

function check(q: ListeningQuestion) {
  expect(q.script.length, q.ref).toBeGreaterThan(0)
  expect(q.script.every((l) => l.text.length > 0), q.ref).toBe(true)
  expect(publicListeningQuestion(q)).not.toHaveProperty('answer')
  expect(publicListeningQuestion(q)).not.toHaveProperty('transcript')
  if (typeof q.answer === 'number') {
    expect(new Set(q.options).size, `${q.ref}: lựa chọn trùng`).toBe(q.options.length)
    expect(q.answer).toBeGreaterThanOrEqual(0)
    expect(q.answer).toBeLessThan(q.options.length)
    expect(gradeListening(q, q.answer)).toEqual({ correct: true })
    expect(gradeListening(q, (q.answer + 1) % q.options.length)).toEqual({ correct: false })
  } else {
    expect(q.options).toEqual([])
    // Gõ đúng kana, hoặc romaji của đáp án (không dấu câu), là đúng; chép đúng thì không tô chữ nào.
    // Kana nhỏ ghép của từ ngoại lai (ティ, フェ…) wanakana đổi ra romaji khác cách người học gõ, nên chỉ thử bằng kana.
    expect(gradeListening(q, q.answer), q.ref).toEqual({ correct: true })
    if (!/[ァィゥェォヮ]/.test(q.answer)) {
      const romaji = toRomaji(q.answer.replace(/[。、？！?!「」\s]/g, ''))
      expect(gradeListening(q, romaji), `${q.ref} gõ ${romaji}`).toEqual({ correct: true })
    }
    expect(dictationDiff(q.answer, q.answer, q.input).every((c) => c.ok)).toBe(true)
  }
}

describe('Theo bài', () => {
  it('mọi bài 1–50: Mix đủ 10 câu (dạng thiếu thì dạng khác bù); dạng riêng chỉ có dạng đó, tối đa 10; câu hợp lệ', () => {
    for (let lesson = 1; lesson <= 50; lesson++) {
      const sentences = sentencesByLesson.get(lesson) ?? []
      const words = wordsOf(lesson)
      for (const mode of ['mix', ...LESSON_TYPES] as const) {
        const qs = buildLessonSession(lesson, mode, 10, sentences, words, seeded(lesson))
        if (mode === 'mix') expect(qs.length, `bài ${lesson} mix`).toBe(10)
        else {
          expect(qs.length, `bài ${lesson} ${mode}`).toBeGreaterThanOrEqual(4)
          expect(qs.length).toBeLessThanOrEqual(10)
          expect(qs.every((q) => q.type === mode)).toBe(true)
        }
        expect(new Set(qs.map((q) => `${q.type}:${q.ref}`)).size, `bài ${lesson} ${mode}: lặp câu`).toBe(qs.length)
        qs.forEach(check)
      }
    }
  })

  it('Mix 10 câu: 4 nghe câu, 3 hỏi–đáp, 3 chép chính tả', () => {
    const qs = buildLessonSession(5, 'mix', 10, sentencesByLesson.get(5)!, wordsOf(5), seeded(1))
    const n = (t: string) => qs.filter((q) => q.type === t).length
    expect([n('sentence_meaning'), n('reply'), n('dictation')]).toEqual([4, 3, 3])
  })

  it('độ dài câu và chép chính tả theo bài', () => {
    const chars = (q: ListeningQuestion) => q.transcript[0].pieces.map((p) => p.t).join('').replace(/[\s　。、？！?!「」『』・…〜～]/g, '').length
    for (const lesson of [3, 8, 15, 22]) {
      const qs = buildLessonSession(lesson, 'sentence_meaning', 20, sentencesByLesson.get(lesson)!, wordsOf(lesson), seeded(lesson))
      for (const q of qs) expect(chars(q), `bài ${lesson} ${q.ref}`).toBeLessThanOrEqual(LISTENING_V1.sentenceMaxChars(lesson))
    }
    // Bài 1–12 chỉ chép từ; từ bài 13 có cả câu ngắn
    const early = buildLessonSession(10, 'dictation', 20, sentencesByLesson.get(10)!, wordsOf(10), seeded(2))
    expect(early.every((q) => q.ref.startsWith('n'))).toBe(true)
    const later = buildLessonSession(20, 'dictation', 20, sentencesByLesson.get(20)!, wordsOf(20), seeded(2))
    expect(later.some((q) => q.ref.startsWith('g'))).toBe(true)
    expect(later.some((q) => q.ref.startsWith('n'))).toBe(true)
  })

  it('từ Katakana: ô gõ Katakana; gõ Hiragana vẫn đúng', () => {
    const q = buildLessonSession(1, 'dictation', 20, [], wordsOf(1), seeded(3)).find((x) => x.input === 'katakana')!
    expect(q).toBeDefined()
    expect(gradeListening(q, String(q.answer).replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)))).toEqual({ correct: true })
  })
})

describe('Thi thử phần nghe JLPT', () => {
  const content: Record<JlptLevel, LevelContent> = { N5: n5 as LevelContent, N4: n4 as LevelContent }
  for (const level of ['N5', 'N4'] as const) {
    it(`${level}: đủ 4 問題 theo thứ tự, đúng số câu, không lặp`, () => {
      const items = approvedItems(content[level], 'listening_task') as ListeningItem[]
      const [first, last] = LESSONS_OF[level]
      const quick = [...sentencesByLesson.entries()].filter(([l]) => l >= first && l <= last).flatMap(([, list]) => list.filter((s) => s.prompt))
      const pools = { task: items.filter((i) => i.kind === 'task'), point: items.filter((i) => i.kind === 'point'), verbal: approvedItems(content[level], 'verbal_expressions') as VerbalItem[], quick }
      const qs = buildMock(level, pools, new Map(), seeded(9))
      const want = LISTENING_V1.mock[level].sections
      expect(([1, 2, 3, 4] as const).map((s) => qs.filter((q) => q.section === s).length)).toEqual(want)
      expect(qs.map((q) => q.section)).toEqual([...qs.map((q) => q.section)].sort())
      expect(new Set(qs.map((q) => q.ref)).size).toBe(qs.length)
      qs.forEach(check)
      // 発話表現 và 即時応答: lựa chọn chỉ được đọc
      expect(qs.filter((q) => q.section! >= 3).every((q) => q.hideOptions)).toBe(true)
      // Đáp đúng hết thì đủ điểm từng 問題
      const answers = Object.fromEntries(qs.map((q, i) => [String(i), q.answer]))
      expect(scoreMock(qs, answers).map((s) => s.correct)).toEqual(want)
      // Đề sau ưu tiên câu chưa có trong đề trước
      const used = new Map(qs.map((q) => [q.ref, 1]))
      const again = buildMock(level, pools, used, seeded(10))
      const repeated = again.filter((q) => used.has(q.ref) && q.section! <= 3).length
      expect(repeated).toBe(0)
    })
  }
})
