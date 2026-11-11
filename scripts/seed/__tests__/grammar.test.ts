// Grammar G2: kiểm tra nội dung ngữ pháp (docs/grammar-rules.md §4.4) và seed vào DB giả.
import { describe, expect, it } from 'vitest'
import { exercisesFor, type GrammarLessonFile, type GrammarPointData, type GrammarSentenceData } from '../../../lib/grammar/types'
import { seedGrammar, validateGrammar } from '../grammar'
import { FakeDb } from './helpers'

const KNOWN = new Set('私学生先会社員'.split(''))
const vocab = () => KNOWN

/** Câu 「わたしは がくせいです」 có trợ từ は và đủ đánh dấu cho nhiều dạng. */
function sentence(n: number, over: Partial<GrammarSentenceData> = {}): GrammarSentenceData {
  return {
    code: `g01-01-s${String(n).padStart(2, '0')}`,
    level: n <= 10 ? 1 : n <= 20 ? 2 : 3,
    pieces: [{ t: '私', r: 'わたし' }, { t: 'は' }, { t: '学生', r: 'がくせい' }, { t: 'です' }, { t: '。' }],
    meaning: `Tôi là học sinh (${n}).`,
    slots: [{ kind: 'particle', piece: 1, distractors: ['を', 'に', 'で'] }],
    sample: n <= 5,
    ...over,
  }
}

function point(over: Partial<GrammarPointData> = {}): GrammarPointData {
  return {
    code: 'g01-01',
    order: 1,
    pattern: 'N1 は N2 です',
    meaning: 'N1 là N2',
    explanation: 'Nói một người hay vật là gì.',
    approved: true,
    sentences: Array.from({ length: 30 }, (_, i) => sentence(i + 1)),
    ...over,
  }
}

const file = (points: GrammarPointData[], lesson = 1): { name: string; text: string } => ({
  name: `lesson-${String(lesson).padStart(2, '0')}.json`,
  text: JSON.stringify({ lesson, points } satisfies GrammarLessonFile),
})

const messages = (points: GrammarPointData[], lesson = 1) => validateGrammar([file(points, lesson)], vocab).errors.map((e) => `${e.where}: ${e.message}`)

describe('exercisesFor — dạng bài suy từ đánh dấu của câu', () => {
  it('câu có trợ từ và 5 mảnh: chọn trợ từ, Đúng/Sai, tìm chỗ sai, sắp xếp, ★, dịch-ghép, chọn nghĩa, nghe', () => {
    expect(exercisesFor(sentence(1))).toEqual(['particle_choice', 'order', 'meaning_choice', 'translate_build', 'star', 'find_error', 'listening', 'true_false'])
  })
  it('chia động từ mở chọn dạng và gõ dạng; hai vế mở ghép vế; câu đáp mở chọn câu đáp', () => {
    const s = sentence(1, {
      slots: [{ kind: 'form', piece: 3, distractors: ['たべます', 'たべません', 'たべて'], form: 'masu_past', dict: '食べる' }],
      split: 2,
      prompt: { pieces: [{ t: 'きのう なにを しましたか。' }], meaning: 'Hôm qua bạn đã làm gì?' },
    })
    expect(exercisesFor(s)).toEqual(expect.arrayContaining(['form_choice', 'form_typing', 'clause_match', 'reply_choice', 'true_false']))
    expect(exercisesFor(s)).not.toContain('particle_choice')
  })
  it('câu ngắn 2 mảnh không có sắp xếp, ★, dịch-ghép, tìm chỗ sai', () => {
    const s = sentence(1, { pieces: [{ t: 'はい' }, { t: '。' }], slots: [] })
    expect(exercisesFor(s)).toEqual(['meaning_choice', 'listening'])
  })
})

describe('validateGrammar — không vùng xám', () => {
  it('mẫu đúng chuẩn: không lỗi', () => {
    expect(messages([point()])).toEqual([])
  })

  it('đáp án nhiễu trùng đáp án đúng hoặc trùng cách viết được chấp nhận là lỗi', () => {
    const bad = point({ sentences: [sentence(1, { slots: [{ kind: 'particle', piece: 1, accepted: ['が'], distractors: ['は', 'が', 'を'] }] }), ...point().sentences.slice(1)] })
    const errs = messages([bad])
    expect(errs.some((e) => e.includes('"は" cũng là đáp án đúng'))).toBe(true)
    expect(errs.some((e) => e.includes('"が" cũng là đáp án đúng'))).toBe(true)
  })

  it('mảnh có Kanji phải có cách đọc bằng kana; mảnh không có Kanji không được có cách đọc', () => {
    const s1 = sentence(1, { pieces: [{ t: '私' }, { t: 'は' }, { t: '学生', r: 'gakusei' }, { t: 'です', r: 'です' }] })
    const errs = messages([point({ sentences: [s1, ...point().sentences.slice(1)] })])
    expect(errs.filter((e) => e.includes('cần cách đọc'))).toHaveLength(2)
    expect(errs.some((e) => e.includes('bỏ cách đọc'))).toBe(true)
  })

  it('mẫu đã duyệt cần đủ 30 câu và 5 câu tiêu biểu; chưa duyệt thì chỉ cảnh báo', () => {
    expect(messages([point({ sentences: point().sentences.slice(0, 20) })]).some((e) => e.includes('cần 30'))).toBe(true)
    const draft = validateGrammar([file([point({ approved: false, sentences: point().sentences.slice(0, 20) })])], vocab)
    expect(draft.errors).toEqual([])
    expect(draft.warnings.some((w) => w.message.includes('cần 30'))).toBe(true)
    const noSamples = point({ sentences: point().sentences.map((s) => ({ ...s, sample: false })) })
    expect(messages([noSamples]).some((e) => e.includes('câu tiêu biểu'))).toBe(true)
  })

  it('uses chỉ được trỏ tới mẫu của bài trước hoặc mẫu trước trong cùng bài', () => {
    const s = sentence(30, { uses: ['g02-01'] })
    expect(messages([point({ sentences: [...point().sentences.slice(0, 29), s] })]).some((e) => e.includes('uses "g02-01"'))).toBe(true)
    const second = point({ code: 'g01-02', order: 2, sentences: point().sentences.map((x) => ({ ...x, code: x.code.replace('g01-01', 'g01-02'), uses: ['g01-01'] })) })
    expect(messages([point(), second])).toEqual([])
  })

  it('code sai dạng, trùng code, slot trỏ ra ngoài câu, form thiếu thể là lỗi', () => {
    const s = sentence(2, { code: 'g01-01-s01', slots: [{ kind: 'form', piece: 9, distractors: ['a', 'b', 'c'] }] })
    const errs = messages([point({ sentences: [sentence(1), s, ...point().sentences.slice(2)] })])
    expect(errs.some((e) => e.includes('trùng'))).toBe(true)
    expect(errs.some((e) => e.includes('piece 9'))).toBe(true)
  })

  it('chữ Kanji ngoài từ vựng tới bài đó chỉ là cảnh báo', () => {
    const s = sentence(1, { pieces: [{ t: '彼', r: 'かれ' }, { t: 'は' }, { t: '学生', r: 'がくせい' }, { t: 'です' }] })
    const data = validateGrammar([file([point({ sentences: [s, ...point().sentences.slice(1)] })])], vocab)
    expect(data.errors).toEqual([])
    expect(data.warnings.some((w) => w.message.includes('chữ 彼'))).toBe(true)
  })
})

describe('seedGrammar', () => {
  it('ghi mẫu và câu, chạy lại không ghi gì; câu bỏ khỏi file thì bị ẩn chứ không xoá', async () => {
    const db = new FakeDb()
    const log: string[] = []
    const data = validateGrammar([file([point()])], vocab)
    await seedGrammar(db, data, false, (s) => log.push(s))
    expect(db.tables.grammar_points).toHaveLength(1)
    expect(db.tables.grammar_sentences).toHaveLength(30)
    const pointId = db.tables.grammar_points[0].id
    expect(db.tables.grammar_sentences.every((s) => s.point_id === pointId)).toBe(true)
    expect(db.tables.grammar_sentences[0].japanese).toBe('私は学生です。')

    const writes = db.writes
    await seedGrammar(db, data, false, () => {})
    expect(db.writes).toBe(writes)

    const fewer = validateGrammar([file([point({ approved: false, sentences: point().sentences.slice(0, 29) })])], vocab)
    await seedGrammar(db, fewer, false, () => {})
    expect(db.tables.grammar_sentences).toHaveLength(30)
    expect(db.tables.grammar_sentences.find((s) => s.code === 'g01-01-s30')?.hidden).toBe(true)
    expect(db.tables.grammar_points[0].approved).toBe(false)
  })

  it('dry-run không ghi', async () => {
    const db = new FakeDb()
    await seedGrammar(db, validateGrammar([file([point()])], vocab), true, () => {})
    expect(db.writes).toBe(0)
  })
})
