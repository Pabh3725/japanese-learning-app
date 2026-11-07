// Test validator (gộp từ TEST-01): mỗi luật data-spec §7 có một dòng sai cố ý,
// kiểm tra lỗi được báo đúng FILE, DÒNG và CỘT.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCsv } from '../csv'
import { parsePgArray } from '../schema'
import { kanjiOf, validateAll, withStudyOrder, type Issue } from '../validate'
import { KANJI_ROWS, VOCAB_HEADER, VOCAB_ROWS, files, withRow } from './helpers'

/** Dòng 1 là header, nên phần tử thứ i của danh sách nằm ở dòng i + 2. */
const lineOf = (index: number) => index + 2

function errorsOf(f: ReturnType<typeof files>): Issue[] {
  return validateAll(f).errors
}

function expectError(errors: Issue[], match: Omit<Partial<Issue>, 'message'> & { message?: RegExp | string }) {
  const { message, ...rest } = match
  const found = errors.find(
    (e) =>
      Object.entries(rest).every(([k, v]) => e[k as keyof Issue] === v) &&
      (message === undefined || (typeof message === 'string' ? e.message.includes(message) : message.test(e.message))),
  )
  expect(found, `Không thấy lỗi ${JSON.stringify(match)} trong:\n${errors.map((e) => JSON.stringify(e)).join('\n')}`).toBeDefined()
}

describe('CSV parser', () => {
  it('đọc ngoặc kép, "" bên trong, CRLF, BOM và nhớ số dòng', () => {
    const { records, errors } = parseCsv('﻿a,b\r\n"x,1","say ""hi"""\r\n\r\nz,\r\n')
    expect(errors).toEqual([])
    expect(records).toEqual([
      { line: 1, cells: ['a', 'b'] },
      { line: 2, cells: ['x,1', 'say "hi"'] },
      { line: 4, cells: ['z', ''] },
    ])
  })

  it('ô có xuống dòng: dòng sau tính đúng', () => {
    const { records } = parseCsv('a\n"1\n2"\nb\n')
    expect(records.map((r) => r.line)).toEqual([1, 2, 4])
  })

  it('báo ngoặc kép không đóng', () => {
    expect(parseCsv('a\n"oops\n').errors[0].message).toMatch(/không đóng/)
  })
})

describe('Mảng Postgres và Kanji trong từ', () => {
  it('parse {} khác với không có', () => {
    expect(parsePgArray('{}')).toEqual([])
    expect(parsePgArray('{"ひと","ひと.つ"}')).toEqual(['ひと', 'ひと.つ'])
    expect(parsePgArray('{ガク}')).toEqual(['ガク'])
    expect(parsePgArray('ガク')).toBeNull()
  })

  it('々 tính là chữ đứng trước, kana bị bỏ qua', () => {
    expect(kanjiOf('時々')).toEqual(['時', '時'])
    expect(kanjiOf('少々お待ちください')).toEqual(['少', '少', '待'])
    expect(kanjiOf('これ')).toEqual([])
  })
})

describe('Data hợp lệ', () => {
  it('bộ mẫu nhỏ qua sạch, liên kết bắt đầu từ 1', () => {
    const r = validateAll(files())
    expect(r.errors).toEqual([])
    expect(r.links).toEqual([
      { code: 'n5-0001', position: 1, character: '学' },
      { code: 'n5-0001', position: 2, character: '校' },
      { code: 'n5-0003', position: 1, character: '時' },
      { code: 'n5-0003', position: 2, character: '時' },
    ])
  })

  it('ô trống thành null, {} giữ là mảng rỗng (data-spec §1.5–1.6)', () => {
    const r = validateAll(files())
    expect(r.vocabularies[1]).toMatchObject({ romaji: null, han_viet: null, is_kana_only: true, sort_order: 2 })
    expect(r.kanji[1].kunyomi).toEqual([])
    expect(r.kanji[2].stroke_count).toBeNull()
  })

  it('cột emoji tuỳ chọn ở cuối header', () => {
    const r = validateAll(
      files({
        vocabHeader: `${VOCAB_HEADER},emoji`,
        vocab: [`${VOCAB_ROWS[0]},🏫`, `${VOCAB_ROWS[1]},`, `${VOCAB_ROWS[2]},`],
      }),
    )
    expect(r.errors).toEqual([])
    expect(r.hasEmojiColumn).toBe(true)
    expect(r.vocabularies[0].emoji).toBe('🏫')
    expect(r.vocabularies[1].emoji).toBeNull()
  })

  it('2 file data thật trong repo qua sạch', () => {
    const read = (name: string) => ({ name, text: readFileSync(join(process.cwd(), 'data', 'n5', name), 'utf8') })
    const r = validateAll({ kanji: read('kanji.csv'), vocabularies: read('vocabularies.csv') })
    expect(r.errors).toEqual([])
    expect(r.vocabularies.length).toBeGreaterThan(0)
    // data-spec §4: mỗi Kanji của mỗi từ có Kanji đều được liên kết
    const kanjiWords = r.vocabularies.filter((v) => !v.is_kana_only)
    expect(r.links.length).toBe(kanjiWords.reduce((n, v) => n + kanjiOf(v.expression).length, 0))
  })
})

describe('Lỗi từng dòng — báo đúng dòng và cột', () => {
  const vocabCases: [string, number, string, string, RegExp][] = [
    ['code sai định dạng', 0, 'N5-1,1,学校,がっこう,trường học,,HỌC HIỆU,false,5', 'code', /n5-0001/],
    ['sort_order không phải số', 0, 'n5-0001,một,学校,がっこう,trường học,,HỌC HIỆU,false,5', 'sort_order', /số nguyên/],
    ['sort_order = 0', 0, 'n5-0001,0,学校,がっこう,trường học,,HỌC HIỆU,false,5', 'sort_order', /khoảng/],
    ['expression rỗng', 1, 'n5-0002,2,,これ,cái này,,,true,5', 'expression', /rỗng/],
    ['meaning_vi rỗng', 1, 'n5-0002,2,これ,これ,,,,true,5', 'meaning_vi', /rỗng/],
    ['reading_kana có Kanji', 0, 'n5-0001,1,学校,学こう,trường học,,HỌC HIỆU,false,5', 'reading_kana', /Hiragana/],
    ['is_kana_only sai giá trị', 1, 'n5-0002,2,これ,これ,cái này,,,yes,5', 'is_kana_only', /true hoặc false/],
    ['is_kana_only không khớp expression', 0, 'n5-0001,1,学校,がっこう,trường học,,HỌC HIỆU,true,5', 'is_kana_only', /phải là false/],
    ['từ có Kanji thiếu Hán Việt', 0, 'n5-0001,1,学校,がっこう,trường học,,,false,5', 'han_viet', /bắt buộc/],
    ['từ chỉ Kana lại có Hán Việt', 1, 'n5-0002,2,これ,これ,cái này,,THỬ,true,5', 'han_viet', /để trống/],
    ['Hán Việt viết thường', 0, 'n5-0001,1,学校,がっこう,trường học,,học hiệu,false,5', 'han_viet', /HOA/],
    ['khoảng trắng thừa', 0, 'n5-0001,1,学校,がっこう,trường  học,,HỌC HIỆU,false,5', 'meaning_vi', /khoảng trắng/],
    ['"( x )"', 0, 'n5-0001,1,学校,がっこう,trường học ( cấp 1 ),,HỌC HIỆU,false,5', 'meaning_vi', /\( x \)/],
    ['"; ;"', 0, 'n5-0001,1,学校,がっこう,trường; ; học,,HỌC HIỆU,false,5', 'meaning_vi', /;;/],
    ['JLPT ngoài 1–5', 0, 'n5-0001,1,学校,がっこう,trường học,,HỌC HIỆU,false,6', 'jlpt_level', /khoảng/],
  ]

  it.each(vocabCases)('vocabularies: %s', (_name, index, row, column, message) => {
    expectError(errorsOf(files({ vocab: withRow(VOCAB_ROWS, index, row) })), {
      file: 'vocabularies.csv',
      line: lineOf(index),
      column,
      message,
    })
  })

  const kanjiCases: [string, number, string, string, RegExp][] = [
    ['2 ký tự', 0, '学校,HỌC,học,"{""ガク""}",{},,5', 'character', /1 chữ/],
    ['Hán Việt 2 âm', 0, '学,HỌC TẬP,học,"{""ガク""}",{},,5', 'han_viet', /một âm/],
    ['onyomi không phải Katakana', 0, '学,HỌC,học,"{""がく""}",{},,5', 'onyomi', /Katakana/],
    ['kunyomi trống thay vì {}', 1, '校,HIỆU,trường,"{""コウ""}",,,5', 'kunyomi', /\{\}/],
    ['mảng sai cú pháp', 0, '学,HỌC,học,ガク,{},,5', 'onyomi', /định dạng mảng/],
    ['stroke_count không phải số', 0, '学,HỌC,học,"{""ガク""}",{},tám,5', 'stroke_count', /số nguyên/],
  ]

  it.each(kanjiCases)('kanji: %s', (_name, index, row, column, message) => {
    expectError(errorsOf(files({ kanji: withRow(KANJI_ROWS, index, row) })), {
      file: 'kanji.csv',
      line: lineOf(index),
      column,
      message,
    })
  })

  it('thiếu cột trong một dòng', () => {
    expectError(errorsOf(files({ vocab: withRow(VOCAB_ROWS, 2, 'n5-0003,3,時々') })), {
      file: 'vocabularies.csv',
      line: lineOf(2),
      message: /3 cột, cần 9/,
    })
  })

  it('header sai tên cột', () => {
    expectError(errorsOf(files({ vocabHeader: VOCAB_HEADER.replace('meaning_vi', 'meaning') })), {
      file: 'vocabularies.csv',
      line: 1,
      message: /Header sai/,
    })
  })
})

describe('Lỗi chéo nhiều dòng', () => {
  it('trùng code: báo dòng sau, chỉ ra dòng trước', () => {
    const vocab = [...VOCAB_ROWS, 'n5-0001,4,学生,がくせい,học sinh,,HỌC SINH,false,5']
    expectError(errorsOf(files({ vocab, kanji: [...KANJI_ROWS, '生,SINH,sống,"{""セイ""}","{""い.きる""}",,5'] })), {
      line: lineOf(3),
      column: 'code',
      message: /trùng với dòng 2/,
    })
  })

  it('trùng sort_order', () => {
    expectError(errorsOf(files({ vocab: withRow(VOCAB_ROWS, 2, VOCAB_ROWS[2].replace('n5-0003,3', 'n5-0003,1')) })), {
      line: lineOf(2),
      column: 'sort_order',
    })
  })

  it('trùng cặp expression + reading_kana', () => {
    const vocab = [...VOCAB_ROWS, 'n5-0004,4,これ,これ,cái này nữa,,,true,5']
    expectError(errorsOf(files({ vocab })), { line: lineOf(3), column: 'expression', message: /trùng/ })
  })

  it('số âm Hán Việt khác số Kanji', () => {
    expectError(errorsOf(files({ vocab: withRow(VOCAB_ROWS, 2, 'n5-0003,3,時々,ときどき,thỉnh thoảng,,THỜI,false,5') })), {
      line: lineOf(2),
      column: 'han_viet',
      message: /2 Kanji nhưng/,
    })
  })

  it('âm Hán Việt không khớp bảng kanji', () => {
    expectError(errorsOf(files({ vocab: withRow(VOCAB_ROWS, 0, 'n5-0001,1,学校,がっこう,trường học,,HỌC HIẾU,false,5') })), {
      line: lineOf(0),
      column: 'han_viet',
      message: /âm thứ 2/,
    })
  })

  it('Kanji chưa có trong kanji.csv', () => {
    expectError(errorsOf(files({ vocab: [...VOCAB_ROWS, 'n5-0004,4,先生,せんせい,giáo viên,,TIÊN SINH,false,5'] })), {
      line: lineOf(3),
      message: /chưa có trong kanji.csv/,
    })
  })
})

describe('Cảnh báo không chặn', () => {
  it('nghĩa trùng nhau và nghĩa chứa chữ Nhật', () => {
    const vocab = [...VOCAB_ROWS, 'n5-0004,4,それ,それ,cái này,,,true,5', 'n5-0005,5,あれ,あれ,cái kia (~を見ます),,,true,5']
    const r = validateAll(files({ vocab }))
    expect(r.errors).toEqual([])
    expect(r.warnings.map((w) => w.message).join('\n')).toMatch(/"cái này" dùng chung/)
    expect(r.warnings.some((w) => w.line === lineOf(4) && /chữ Nhật/.test(w.message))).toBe(true)
  })
})

describe('Thứ tự học Kanji', () => {
  const kanji = [
    { character: '難', jlpt_level: 1 },
    { character: '学', jlpt_level: 5 },
    { character: '校', jlpt_level: 5 },
    { character: '林', jlpt_level: 5 },
    { character: '駅', jlpt_level: 4 },
    { character: '誰', jlpt_level: null },
  ]
  const words = [
    { sort_order: 2, expression: '学校' },
    { sort_order: 1, expression: '駅' },
    { sort_order: 3, expression: '校長' },
  ]

  it('cấp dễ trước; trong cấp thì theo từ vựng; chữ không có trong từ nào cuối cấp; chưa có cấp cuối cùng', () => {
    const order = withStudyOrder(kanji, words).sort((a, b) => a.study_order - b.study_order).map((k) => k.character)
    expect(order).toEqual(['学', '校', '林', '駅', '難', '誰'])
  })

  it('data thật: N5 đứng trước N4, thứ tự liền mạch từ 1', () => {
    const read = (name: string) => ({ name, text: readFileSync(join(process.cwd(), 'data', 'n5', name), 'utf8') })
    const { kanji: rows } = validateAll({ kanji: read('kanji.csv'), vocabularies: read('vocabularies.csv') })
    const sorted = [...rows].sort((a, b) => a.study_order - b.study_order)
    expect(sorted.map((k) => k.study_order)).toEqual(sorted.map((_, i) => i + 1))
    const levels = sorted.map((k) => k.jlpt_level ?? 0)
    expect(levels).toEqual([...levels].sort((a, b) => b - a))
  })
})
