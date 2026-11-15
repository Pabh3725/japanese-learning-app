// LISTENING_V1 trên dữ liệu thật: mọi bài 1–50 dựng đủ câu cho mọi dạng; đề thi thử đủ 4 問題 đúng số câu; đáp án đúng chấm đúng.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toRomaji } from 'wanakana'
import { describe, expect, it } from 'vitest'
import n4 from '../../../data/jlpt/n4.json'
import n5 from '../../../data/jlpt/n5.json'
import type { GrammarLessonFile } from '../../grammar/types'
import { LESSONS_OF, type JlptLevel } from '../../jlpt/catalog'
import { approvedItems, type LevelContent, type ListeningItem, type VerbalItem } from '../../jlpt/content'
import { buildNumbersSession, editDistance, NUMBER_GROUPS, numberQuestionOf } from '../numbers'
import {
  buildLessonSession,
  buildMock,
  dictationDiff,
  gradeListening,
  LESSON_TYPES,
  LISTENING_V1,
  openMistakes,
  publicListeningQuestion,
  scoreMock,
  sentenceSimilarity,
  type LessonSentence,
  type ListeningQuestion,
} from '../questions'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

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
/** Câu của bài này và các bài trước (nguồn nhiễu nghe câu → chọn nghĩa), như DAL. */
const poolOf = (lesson: number) => [...sentencesByLesson.entries()].filter(([l]) => l <= lesson).flatMap(([, list]) => list)
const session = (lesson: number, mode: Parameters<typeof buildLessonSession>[1], count: number, seed: number) =>
  buildLessonSession(lesson, mode, count, sentencesByLesson.get(lesson) ?? [], poolOf(lesson), seeded(seed))
const charsOf = (q: ListeningQuestion) => q.transcript[0].pieces.map((p) => p.t).join('').replace(/[\s　。、？！?!「」『』・…〜～]/g, '').length

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
    if (q.input === 'digits') {
      expect(gradeListening(q, q.answer), q.ref).toEqual({ correct: true })
      expect(gradeListening(q, `${q.answer}1`), q.ref).toEqual({ correct: false })
      return
    }
    // Gõ đúng kana, hoặc romaji của đáp án (không dấu câu), là đúng; chép đúng thì không tô chữ nào.
    // Kana nhỏ ghép của từ ngoại lai (ティ, フェ…) wanakana đổi ra romaji khác cách người học gõ, nên chỉ thử bằng kana.
    expect(gradeListening(q, q.answer), q.ref).toEqual({ correct: true })
    if (!/[ァィゥェォヮ]/.test(q.answer)) {
      const romaji = toRomaji(q.answer.replace(/[。、？！?!「」\s]/g, ''))
      expect(gradeListening(q, romaji), `${q.ref} gõ ${romaji}`).toEqual({ correct: true })
    }
    expect(dictationDiff(q.answer, q.answer, q.input === 'katakana' ? 'katakana' : 'hiragana').every((c) => c.ok)).toBe(true)
  }
}

describe('Theo bài', () => {
  it('mọi bài 1–50: Mix đủ 10 câu (dạng thiếu thì dạng khác bù); dạng riêng chỉ có dạng đó, tối đa 10; câu hợp lệ', () => {
    for (let lesson = 1; lesson <= 50; lesson++) {
      for (const mode of ['mix', ...LESSON_TYPES] as const) {
        const qs = session(lesson, mode, 10, lesson)
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

  it('Grammar · Mix 10 câu: 4 chọn câu đã nghe, 3 nghe câu → nghĩa, 3 hỏi–đáp; không có chép chính tả', () => {
    const qs = session(5, 'mix', 10, 1)
    const n = (t: string) => qs.filter((q) => q.type === t).length
    expect([n('heard_sentence'), n('sentence_meaning'), n('reply'), n('dictation')]).toEqual([4, 3, 3, 0])
  })

  it('chọn câu đã nghe: 4 câu chỉ khác nhau một chỗ, đáp án là câu được đọc', () => {
    for (let lesson = 1; lesson <= 50; lesson++) {
      for (const q of session(lesson, 'heard_sentence', 10, lesson)) {
        const right = q.options[q.answer as number]
        expect(right, q.ref).toBe(q.transcript[0].pieces.map((p) => p.t).join(''))
        for (const o of q.options) {
          if (o === right) continue
          // Cùng phần đầu và phần cuối, chỉ khác ở giữa (một chỗ hỏi; thể dài như 高くなかった / 高いじゃありませんでした)
          let head = 0
          while (head < o.length && o[head] === right[head]) head++
          let tail = 0
          while (tail < o.length - head && tail < right.length - head && o[o.length - 1 - tail] === right[right.length - 1 - tail]) tail++
          expect(o.length - head - tail, `${q.ref}: ${right} / ${o}`).toBeLessThanOrEqual(14)
        }
      }
    }
  })

  it('nghe câu → chọn nghĩa: câu trong giới hạn độ dài của bài; nhiễu là nghĩa của câu na ná (không cùng nghĩa)', () => {
    let total = 0
    let scoreSum = 0
    for (let lesson = 1; lesson <= 50; lesson++) {
      const bySentence = new Map(poolOf(lesson).map((s) => [s.meaning, s]))
      for (const q of session(lesson, 'sentence_meaning', 10, lesson)) {
        expect(charsOf(q), `bài ${lesson} ${q.ref}`).toBeLessThanOrEqual(LISTENING_V1.sentenceMaxChars(lesson))
        const right = bySentence.get(q.options[q.answer as number])!
        for (const [i, o] of q.options.entries()) {
          if (i === q.answer) continue
          const wrong = bySentence.get(o)!
          expect(wrong, `${q.ref}: nhiễu lấy từ bài ≤ ${lesson}`).toBeDefined()
          scoreSum += sentenceSimilarity(right, wrong)
          total++
        }
      }
    }
    // Nhiễu giống đáp án đáng kể (trung bình): chung nhiều chữ tiếng Việt và mảnh tiếng Nhật
    expect(scoreSum / total).toBeGreaterThan(0.3)
  })

  it('chép chính tả: chỉ câu (không từ), câu chỉ có kana khi đọc, ngắn theo bài', () => {
    for (let lesson = 1; lesson <= 50; lesson++) {
      const qs = session(lesson, 'dictation', 10, lesson)
      expect(qs.length, `bài ${lesson}`).toBe(10)
      expect(qs.every((q) => q.ref.startsWith('g')), `bài ${lesson}: chỉ câu`).toBe(true)
      expect(qs.every((q) => /^[ぁ-ゖァ-ヺー。、？！?!「」\s　]+$/.test(String(q.answer))), `bài ${lesson}: chỉ kana`).toBe(true)
      // Phần lớn câu trong giới hạn; bài ít câu ngắn thì lấy câu ngắn nhất
      const within = qs.filter((q) => charsOf(q) <= LISTENING_V1.dictationMaxChars(lesson)).length
      expect(within, `bài ${lesson}`).toBeGreaterThanOrEqual(lesson <= 2 ? 3 : 7)
    }
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

describe('Numbers listening (§V2.5)', () => {
  it('chọn: đáp án là cách viết được đọc, nhiễu nghe na ná (khoảng cách chỉnh sửa nhỏ), mọi nhóm', () => {
    for (const group of NUMBER_GROUPS) {
      const qs = buildNumbersSession([group], 'choose', 20, seeded(group.length))
      expect(qs.length, group).toBe(20)
      expect(new Set(qs.map((q) => q.ref)).size).toBe(20)
      for (const q of qs) {
        check(q)
        expect(q.options[q.answer as number]).toBe(q.transcript[0].pieces[0].t)
      }
    }
  })

  it('gõ số: đáp án là chữ số của cách viết; không hỏi giờ rưỡi (半)', () => {
    const qs = buildNumbersSession(NUMBER_GROUPS, 'type', 20, seeded(4))
    expect(qs.length).toBe(20)
    for (const q of qs) {
      check(q)
      expect(q.input).toBe('digits')
      expect(q.transcript[0].pieces[0].t.includes('半')).toBe(false)
    }
    // 14:30 gõ 1430; dấu phẩy, số toàn góc vẫn đúng
    const price = numberQuestionOf('yen:3000', seeded(1))!
    expect(price.options[price.answer as number]).toBe('3,000円')
    expect(editDistance('よじ', 'しちじ')).toBe(2)
  })

  it('dựng lại từ mã (danh sách câu nghe sai)', () => {
    expect(numberQuestionOf('num:1430', seeded(1))?.script[0].text).toBe('せんよんひゃくさんじゅう')
    expect(numberQuestionOf('day:4日', seeded(1))?.script[0].text).toBe('よっか')
    expect(numberQuestionOf('khong-co:1', seeded(1))).toBeNull()
  })
})

describe('Danh sách câu nghe sai (§V2.6)', () => {
  const log = (ref: string, correct: boolean, at: number) => ({ type: 'reply', ref, correct, at })
  it('sai thì vào danh sách; đúng 2 lần liên tiếp thì ra; sai lại thì vào lại; cũ nhất trước', () => {
    const open = openMistakes([
      log('a', false, 1),
      log('b', true, 2),
      log('c', false, 3),
      log('a', true, 4),
      log('c', true, 5),
      log('c', true, 6),
      log('d', false, 7),
      log('d', true, 8),
      log('d', false, 9),
    ])
    expect(open.map((m) => m.ref)).toEqual(['a', 'd'])
    // d sai lúc 7, mới đúng 1 lần thì lại sai: vẫn trong danh sách từ lúc 7
    expect(open[1].since).toBe(7)
  })
})
