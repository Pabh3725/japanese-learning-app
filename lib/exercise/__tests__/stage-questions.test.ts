// VOC-07, VOC-08, AUD-02 — Dạng bài, câu hỏi và chấm. Nhiều test chạy trên toàn bộ file data.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../../learning/rules'
import type { ExerciseCode } from '../../learning/types'
import { convertAtCaret, isHanVietAnswerCorrect, isKanaAnswerCorrect, romajiToKanaInput } from '../answer-normalize'
import { isKatakana, seededRng } from '../questions'
import { kanaSimilarity, kanjiSimilarity } from '../similarity'
import { buildStageQuestion, type AssemblyQuestionData, type ChoiceQuestionData, type QuestionPools, type StageWord } from '../stage-questions'
import { expressionTemplate, hanVietPieces, kanjiPieces, meaningPieces } from '../word-parts'

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

function readCsv(file: string): Record<string, string>[] {
  const [head, ...rows] = readFileSync(join(process.cwd(), 'data/n5', file), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
  const cols = parseCsvLine(head)
  return rows.map((row) => {
    const cells = parseCsvLine(row)
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']))
  })
}

const vocabRows = readCsv('vocabularies.csv')
const words: StageWord[] = vocabRows.map((r) => ({
  id: r.code,
  expression: r.expression,
  reading_kana: r.reading_kana,
  meaning_vi: r.meaning_vi,
  han_viet: r.han_viet || null,
  is_kana_only: r.is_kana_only === 'true',
  emoji: r.emoji || null,
}))
const pools: QuestionPools = {
  words,
  kanji: readCsv('kanji.csv').map((r) => ({ character: r.character, han_viet: r.han_viet, meaning_vi: r.meaning_vi })),
}
const find = (expr: string) => words.find((w) => w.expression === expr)!

describe('dữ liệu nghĩa', () => {
  it('nghĩa không chứa cách đọc của chính từ, để không lộ đáp án', () => {
    expect(words.filter((w) => w.meaning_vi.includes(w.reading_kana)).map((w) => w.reading_kana)).toEqual([])
  })

  it('mỗi từ có bài từ 1 đến 50, và thứ tự không quay lui giữa các bài', () => {
    const lessons = vocabRows.map((r) => Number(r.lesson))
    expect(lessons.every((n) => n >= 1 && n <= 50)).toBe(true)
    lessons.slice(1).forEach((n, i) => expect(n).toBeGreaterThanOrEqual(lessons[i]))
    expect(new Set(lessons).size).toBe(50)
  })

  it('bài 1–25: mỗi nghĩa chỉ ứng với một cách đọc, để đề nghĩa chỉ có một đáp án khi gõ hoặc ghép', () => {
    const readingsOf = new Map<string, Set<string>>()
    for (const w of words.filter((_, i) => Number(vocabRows[i].lesson) <= 25)) {
      const key = w.meaning_vi.trim().toLowerCase()
      readingsOf.set(key, (readingsOf.get(key) ?? new Set()).add(w.reading_kana))
    }
    expect([...readingsOf].filter(([, readings]) => readings.size > 1).map(([meaning]) => meaning)).toEqual([])
  })
})
const GAKKOU = find('学校')
const TEREBI = find('テレビ')
const TOKIDOKI = find('時々')

describe('Gõ romaji → kana (VOC-08)', () => {
  it("nghiệm thu: gõ 'gakkou' → がっこう chấm đúng; テレビ gõ terebi", () => {
    expect(romajiToKanaInput('gakkou', 'hiragana')).toBe('がっこう')
    expect(romajiToKanaInput('terebi', 'katakana')).toBe('テレビ')
    expect(isKanaAnswerCorrect('がっこう', 'がっこう')).toBe(true)
    expect(isKanaAnswerCorrect('テレビ', 'テレビ')).toBe(true)
  })

  it('giữ chữ n cuối để gõ tiếp, nhưng chấm vẫn đúng', () => {
    expect(romajiToKanaInput('san', 'hiragana')).toBe('さn')
    expect(isKanaAnswerCorrect('さn', 'さん')).toBe(true)
  })

  it('gõ dần từng chữ: minna ra みんな, không phải みんあ', () => {
    let value = ''
    for (const key of 'minna') value = romajiToKanaInput(value + key, 'hiragana')
    expect(value).toBe('みんな')
  })

  it("hon'ya ra ほんや, không phải ほにゃ", () => {
    let value = ''
    for (const key of "hon'ya") value = romajiToKanaInput(value + key, 'hiragana')
    expect(value).toBe('ほんや')
    expect(isKanaAnswerCorrect(value, 'ほんや')).toBe(true)
  })

  it('kotchi, nooto, kiotsukemasu chấm đúng', () => {
    expect(isKanaAnswerCorrect(romajiToKanaInput('kotchi', 'hiragana'), 'こっち')).toBe(true)
    expect(isKanaAnswerCorrect(romajiToKanaInput('nooto', 'katakana'), 'ノート')).toBe(true)
    expect(isKanaAnswerCorrect(romajiToKanaInput('kiotsukemasu', 'hiragana'), 'きをつけます')).toBe(true)
  })

  it('sửa ở giữa từ: con trỏ ở ngay sau chữ vừa gõ, phần sau không đổi', () => {
    // がこう, đặt con trỏ sau が, gõ っ bằng ltu
    expect(convertAtCaret('がltuこう', 4, 'hiragana')).toEqual({ value: 'がっこう', caret: 2 })
  })

  it('gõ ở cuối: con trỏ ở cuối', () => {
    expect(convertAtCaret('がっこu', 4, 'hiragana')).toEqual({ value: 'がっこう', caret: 4 })
  })

  it('nộp khi bàn phím còn giữ romaji vẫn chấm đúng', () => {
    expect(isKanaAnswerCorrect('gakkou', 'がっこう')).toBe(true)
    expect(isKanaAnswerCorrect('terebi', 'テレビ')).toBe(true)
  })

  it('sai hoặc rỗng thì sai', () => {
    expect(isKanaAnswerCorrect('がくせい', 'がっこう')).toBe(false)
    expect(isKanaAnswerCorrect('  ', 'がっこう')).toBe(false)
  })

  it('toàn bộ data: gõ đúng romaji của từ thì được chấm đúng', () => {
    const wrong = vocabRows.filter((r) => {
      const mode = /^[ァ-ヺー]+$/.test(r.reading_kana) ? 'katakana' : 'hiragana'
      // Gõ từng phím như người dùng thật, kết quả đổi dần trong ô nhập
      let value = ''
      for (const key of r.romaji) value = romajiToKanaInput(value + key, mode)
      return !isKanaAnswerCorrect(value, r.reading_kana)
    })
    expect(wrong.map((r) => `${r.reading_kana}/${r.romaji}`)).toEqual([])
  })
})

describe('Hán Việt gõ tay', () => {
  it('bỏ dấu, không phân biệt hoa thường, gộp khoảng trắng', () => {
    for (const typed of ['HỌC HIỆU', 'hoc hieu', ' Hoc   Hieu ', 'học hiệu']) {
      expect(isHanVietAnswerCorrect(typed, 'HỌC HIỆU')).toBe(true)
    }
    expect(isHanVietAnswerCorrect('dai hoc', 'ĐẠI HỌC')).toBe(true)
    expect(isHanVietAnswerCorrect('hoc', 'HỌC HIỆU')).toBe(false)
  })
})

describe('Tách từ (okurigana)', () => {
  it('休みます: chỉ ghép Kanji, kana giữ cố định', () => {
    expect(kanjiPieces('休みます')).toEqual(['休'])
    expect(expressionTemplate('休みます')).toEqual([null, 'みます'])
    expect(expressionTemplate('お名前は')).toEqual(['お', null, null, 'は'])
    expect(expressionTemplate('学校')).toEqual([null, null])
  })

  it('時々: 々 là một mảnh, số âm Hán Việt khớp', () => {
    expect(kanjiPieces('時々')).toEqual(['時', '々'])
    expect(hanVietPieces(TOKIDOKI.han_viet!)).toHaveLength(2)
  })

  it('toàn bộ data: số mảnh Kanji bằng số âm Hán Việt', () => {
    for (const w of words.filter((x) => !x.is_kana_only)) {
      expect(hanVietPieces(w.han_viet!), w.expression).toHaveLength(kanjiPieces(w.expression).length)
    }
  })

  it('ghép nghĩa chỉ dùng cho nghĩa đơn giản', () => {
    expect(meaningPieces('trường học')).toEqual(['trường', 'học'])
    expect(meaningPieces('anh; chị')).toBe(null)
    expect(meaningPieces('vị kia (cách nói lịch sự của あのひと)')).toBe(null)
    expect(meaningPieces('một hai ba bốn năm sáu bảy')).toBe(null)
  })
})

describe('Câu hỏi và chấm trên toàn bộ data', () => {

  it('bài ghép Kanji: đủ mảnh, có mảnh nhiễu, không gửi đáp án xuống trình duyệt', () => {
    const q = buildStageQuestion(GAKKOU, 'kanji_assembly', pools, seededRng(3)) as AssemblyQuestionData
    expect(q.slots).toBe(2)
    expect(q.pool).toContain('学')
    expect(q.pool).toContain('校')
    expect(q.pool.length).toBeGreaterThan(2)
    expect(q).not.toHaveProperty('answer')
    expect(q.template).toEqual([null, null])
  })

  it('ghép không gợi ý có nhiều mảnh nhiễu hơn, và không có gợi ý', () => {
    const hinted = buildStageQuestion(GAKKOU, 'kanji_assembly', pools, seededRng(3)) as AssemblyQuestionData
    const nohint = buildStageQuestion(GAKKOU, 'kanji_assembly_nohint', pools, seededRng(3)) as AssemblyQuestionData
    expect(nohint.pool.length).toBeGreaterThan(hinted.pool.length)
    expect(nohint.prompt.kind).toBe('meaning')
    expect(hinted.prompt.hint).toBe(GAKKOU.meaning_vi)
  })

  it('Câu nghe có chuỗi để đọc, là Kana', () => {
    const q = buildStageQuestion(GAKKOU, 'listening', pools, seededRng(1)) as ChoiceQuestionData
    expect(q.listenTo).toBe('がっこう')
    expect(q.answer).toBe('がっこう')
  })

  it('Stage 3–6 của 学校 không làm lộ đáp án trong đề kana', () => {
    const q = buildStageQuestion(GAKKOU, 'kana_to_meaning', pools, seededRng(1))
    expect(q.prompt.hint).toBeUndefined()
  })

  it('không có câu gõ nghĩa tiếng Việt', () => {
    const typingKinds = Object.entries(EXERCISES).filter(([, v]) => v.kind === 'typing').map(([, v]) => v.skill)
    expect(typingKinds).not.toContain('S1')
  })
})

describe('Đáp án nhiễu khó hơn', () => {
  const firstHundred = new Set(words.slice(0, 100).map((w) => w.id))
  const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

  const optionsOf = (word: StageWord, exercise: ExerciseCode, seed: number, learned?: ReadonlySet<string>) =>
    (buildStageQuestion(word, exercise, { ...pools, learnedWordIds: learned }, seededRng(seed)) as ChoiceQuestionData).options.filter(
      (o) => o !== (exercise === 'meaning_to_kana' ? word.reading_kana : exercise === 'kana_to_meaning' ? word.meaning_vi : word.expression),
    )

  it('chọn nghĩa: ưu tiên nghĩa của từ đã học', () => {
    const learnedMeanings = new Set(words.filter((w) => firstHundred.has(w.id)).map((w) => w.meaning_vi))
    const hits = Array.from({ length: 40 }, (_, i) =>
      optionsOf(GAKKOU, 'kana_to_meaning', i + 1, firstHundred).filter((o) => learnedMeanings.has(o)).length,
    )
    expect(average(hits)).toBeGreaterThan(2) // 3 đáp án nhiễu, phần lớn là từ đã học
  })

  it('chọn Kana: đáp án nhiễu đọc gần với đáp án hơn nhiều so với chọn ngẫu nhiên', () => {
    const near = average(Array.from({ length: 30 }, (_, i) => optionsOf(GAKKOU, 'meaning_to_kana', i + 1).map((o) => kanaSimilarity('がっこう', o))).flat())
    const random = average(words.filter((w) => !isKatakana(w.reading_kana)).map((w) => kanaSimilarity('がっこう', w.reading_kana)))
    expect(near).toBeGreaterThan(random + 1.5)
  })

  it('chọn Kana: từ Katakana chỉ có đáp án Katakana', () => {
    for (const option of optionsOf(TEREBI, 'meaning_to_kana', 3)) expect(isKatakana(option)).toBe(true)
  })

  it('chọn cách viết: có chữ chung hoặc chữ dễ nhầm', () => {
    const shared = Array.from({ length: 30 }, (_, i) => optionsOf(GAKKOU, 'kanji_recognition', i + 1).filter((o) => kanjiSimilarity('学校', o) >= 3).length)
    expect(average(shared)).toBeGreaterThan(2)
  })

  it('mảnh Kanji nhiễu ưu tiên chữ dễ nhầm', () => {
    const q = buildStageQuestion(find('休みます'), 'kanji_assembly', pools, seededRng(5)) as AssemblyQuestionData
    expect(q.pool).toContain('体')
  })

  it('không học từ nào vẫn đủ đáp án; không bao giờ có hai đáp án đúng', () => {
    let seed = 1
    for (const word of words.slice(0, 200)) {
      const q = buildStageQuestion(word, 'kana_to_meaning', { ...pools, learnedWordIds: new Set() }, seededRng(seed++)) as ChoiceQuestionData
      expect(q.options).toHaveLength(4)
      const sameAsAnswer = q.options.filter((o) => o.trim().toLowerCase() === word.meaning_vi.trim().toLowerCase())
      expect(sameAsAnswer).toHaveLength(1)
    }
  })

  it('kanaSimilarity: bỏ qua dấu ゛゜và kiểu chữ', () => {
    expect(kanaSimilarity('がっこう', 'かっこう')).toBeGreaterThan(kanaSimilarity('がっこう', 'てれび'))
    expect(kanaSimilarity('テレビ', 'てれひ')).toBeGreaterThan(5)
  })
})

describe('Câu ghép không cho biết số ô', () => {
  it('bật cờ, vẫn đủ mảnh đáp án, không quá 18 mảnh, số mảnh nhiễu thay đổi', () => {
    let seed = 1
    for (const word of words.filter((w) => !w.is_kana_only)) {
      for (const exercise of ['kanji_assembly_nohint', 'hanviet_assembly', 'kana_assembly'] as const) {
        const q = buildStageQuestion(word, exercise, pools, seededRng(seed++), { blind: true }) as AssemblyQuestionData
        expect(q.blind).toBe(true)
        expect(q.pool.length).toBeLessThanOrEqual(18)
        expect(q.pool.length).toBeGreaterThan(q.slots)
      }
    }
    const sizes = new Set(Array.from({ length: 100 }, (_, i) => (buildStageQuestion(GAKKOU, 'kanji_assembly_nohint', pools, seededRng(i + 1), { blind: true }) as AssemblyQuestionData).pool.length))
    expect(sizes.size).toBeGreaterThan(1)
  })

  it('câu thường không bật cờ; câu chọn không có cờ', () => {
    expect(buildStageQuestion(GAKKOU, 'kana_assembly', pools, seededRng(1))).not.toHaveProperty('blind')
    expect(buildStageQuestion(GAKKOU, 'kana_to_meaning', pools, seededRng(1), { blind: true })).not.toHaveProperty('blind')
  })
})

describe('Dạng bài mới của Stage 5', () => {
  it('trắc nghiệm Hán Việt ở bước 1 không để lộ Kanji', () => {
    const q = buildStageQuestion(GAKKOU, 'hanviet_from_kana', pools, seededRng(1)) as ChoiceQuestionData
    expect(q.answer).toBe(GAKKOU.han_viet)
    expect(JSON.stringify(q)).not.toContain(GAKKOU.expression)
  })

  it('chọn Kanji từ Hán Việt: đề là Hán Việt, đáp án là cách viết', () => {
    const q = buildStageQuestion(GAKKOU, 'kanji_recognition', pools, seededRng(1)) as ChoiceQuestionData
    expect(q.prompt.display).toBe(GAKKOU.han_viet)
    expect(q.answer).toBe(GAKKOU.expression)
  })

  it('chọn nghĩa chữ Kanji: mọi từ, đáp án nhiễu không trùng nghĩa của chữ trong từ', () => {
    let seed = 1
    for (const word of words.filter((w) => !w.is_kana_only)) {
      const q = buildStageQuestion(word, 'kanji_char_meaning', pools, seededRng(seed++)) as ChoiceQuestionData
      const chars = kanjiPieces(word.expression)
      expect(chars).toContain(q.prompt.display)
      const own = pools.kanji.filter((k) => chars.includes(k.character)).map((k) => k.meaning_vi)
      expect(q.options).toHaveLength(4)
      expect(new Set(q.options).size).toBe(4)
      expect(q.options.filter((o) => own.includes(o))).toEqual([q.answer])
    }
  })
})

describe('Đọc lại khi trả lời đúng', () => {
  it('câu chọn có sẵn Kana để đọc, kể cả đề không có Kana', () => {
    const q = buildStageQuestion(GAKKOU, 'hanviet_recognition', pools, seededRng(1)) as ChoiceQuestionData
    expect(q.speak).toBe('がっこう')
  })

  it('câu ghép và câu gõ không gửi Kana trước khi nộp', () => {
    expect(buildStageQuestion(GAKKOU, 'kana_assembly', pools, seededRng(1))).not.toHaveProperty('speak')
    expect(buildStageQuestion(GAKKOU, 'kana_free_recall', pools, seededRng(1))).not.toHaveProperty('speak')
  })
})
