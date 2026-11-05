// VOC-07, VOC-08, AUD-02 — Dạng bài, câu hỏi và chấm. Nhiều test chạy trên toàn bộ file data.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EXERCISES } from '../../learning/rules'
import { allowedExercises } from '../../learning/stage'
import type { ExerciseCode, ScoredStage } from '../../learning/types'
import { isHanVietAnswerCorrect, isKanaAnswerCorrect, romajiToKanaInput } from '../answer-normalize'
import { seededRng } from '../questions'
import {
  buildStageQuestion,
  chooseStageExercise,
  gradeStageAnswer,
  parseStageAnswerRequest,
  usableExercises,
  type AssemblyQuestionData,
  type ChoiceQuestionData,
  type QuestionPools,
  type StageWord,
} from '../stage-questions'
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
  kanji: readCsv('kanji.csv').map((r) => ({ character: r.character, han_viet: r.han_viet })),
}
const find = (expr: string) => words.find((w) => w.expression === expr)!
const GAKKOU = find('学校')
const TEREBI = find('テレビ')
const YASUMI = find('休みます')
const TOKIDOKI = find('時々')

const correctAnswerFor = (word: StageWord, q: ReturnType<typeof buildStageQuestion>): string | string[] => {
  if (q.kind === 'choice') return q.answer
  if (q.kind === 'typing') return q.exercise === 'kana_free_recall' ? word.reading_kana : word.han_viet!
  switch (q.exercise) {
    case 'kana_assembly':
      return word.reading_kana.length ? Array.from(q.pool).filter(() => false).concat(splitForTest(word.reading_kana)) : []
    case 'hanviet_assembly':
      return hanVietPieces(word.han_viet!)
    case 'meaning_assembly':
      return meaningPieces(word.meaning_vi)!
    default:
      return kanjiPieces(word.expression)
  }
}
const SMALL = new Set('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ')
function splitForTest(s: string) {
  const out: string[] = []
  for (const c of s) {
    if (SMALL.has(c) && out.length) out[out.length - 1] += c
    else out.push(c)
  }
  return out
}

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

describe('chooseStageExercise — ưu tiên phần còn thiếu (R9)', () => {
  it('Stage 2: thiếu một dạng thì luôn chọn dạng đó', () => {
    for (let seed = 1; seed < 20; seed++) {
      expect(chooseStageExercise(GAKKOU, 2, ['kana_to_meaning', 'meaning_to_kana'], seededRng(seed))).toBe('kana_assembly')
    }
  })

  it('Stage 2: đủ rồi thì có cả câu nghe', () => {
    const seen = new Set(
      Array.from({ length: 80 }, (_, s) => chooseStageExercise(GAKKOU, 2, ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'], seededRng(s + 1))),
    )
    expect(seen).toContain('listening')
  })

  it('Stage 4: chưa đủ thì chỉ chọn trong 4 dạng bắt buộc', () => {
    const required = ['kanji_recognition', 'kanji_assembly', 'hanviet_recognition', 'hanviet_assembly']
    for (let seed = 1; seed < 40; seed++) expect(required).toContain(chooseStageExercise(GAKKOU, 4, [], seededRng(seed)))
  })

  it('Stage 5: chọn dạng của kỹ năng còn thiếu', () => {
    const earned: ExerciseCode[] = ['meaning_recognition_6', 'kana_free_recall', 'kanji_recognition_6']
    for (let seed = 1; seed < 20; seed++) {
      expect(EXERCISES[chooseStageExercise(GAKKOU, 5, earned, seededRng(seed))].skill).toBe('S4')
    }
  })

  it('テレビ: Stage 5 không có bài Kanji, Hán Việt', () => {
    const skills = new Set(usableExercises(TEREBI, 5).map((code) => EXERCISES[code].skill))
    expect(skills).toEqual(new Set(['S1', 'S2']))
  })

  it('từ nghĩa phức tạp không có ghép nghĩa', () => {
    const complex = words.find((w) => meaningPieces(w.meaning_vi) === null)!
    expect(usableExercises(complex, 5)).not.toContain('meaning_assembly')
  })
})

describe('Câu hỏi và chấm trên toàn bộ data', () => {
  const stagesOf = (w: StageWord): ScoredStage[] => (w.is_kana_only ? [2, 5] : [2, 4, 5])

  it('mọi từ × mọi dạng dùng được: dựng được câu, đáp án đúng được chấm đúng, câu sai bị chấm sai', () => {
    let seed = 1
    for (const word of words) {
      for (const stage of stagesOf(word)) {
        for (const exercise of usableExercises(word, stage)) {
          const q = buildStageQuestion(word, exercise, pools, seededRng(seed++))
          expect(gradeStageAnswer(word, exercise, correctAnswerFor(word, q)).outcome, `${word.expression} ${exercise}`).toBe('correct')
          const wrongGiven = q.kind === 'assembly' ? ['✗'] : '✗'
          expect(gradeStageAnswer(word, exercise, wrongGiven).outcome).toBe('wrong')
        }
      }
    }
  })

  it('câu chọn: không trùng đáp án, có đáp án đúng, đúng số lựa chọn, không có đáp án nhiễu đúng nghĩa', () => {
    let seed = 1
    for (const word of words.slice(0, 300)) {
      for (const exercise of ['kana_to_meaning', 'meaning_recognition_6', 'meaning_to_kana', 'listening'] as const) {
        if (!allowedExercises(exercise === 'meaning_recognition_6' ? 5 : 2, word.is_kana_only).includes(exercise)) continue
        const q = buildStageQuestion(word, exercise, pools, seededRng(seed++)) as ChoiceQuestionData
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(q.options).toContain(q.answer)
        expect(q.options).toHaveLength(exercise === 'meaning_recognition_6' ? 6 : 4)
      }
    }
  })

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

  it('okurigana: chấm phần Kanji; câu chọn hiện cả từ', () => {
    const q = buildStageQuestion(YASUMI, 'kanji_assembly', pools, seededRng(1)) as AssemblyQuestionData
    expect(q.slots).toBe(1)
    expect(gradeStageAnswer(YASUMI, 'kanji_assembly', ['休']).outcome).toBe('correct')
    expect(gradeStageAnswer(YASUMI, 'kanji_assembly', ['休']).answer).toBe('休みます')
  })

  it('Câu nghe có chuỗi để đọc, là Kana', () => {
    const q = buildStageQuestion(GAKKOU, 'listening', pools, seededRng(1)) as ChoiceQuestionData
    expect(q.listenTo).toBe('がっこう')
    expect(q.answer).toBe('がっこう')
  })

  it('Stage 3–5 của 学校 không làm lộ đáp án trong đề kana', () => {
    const q = buildStageQuestion(GAKKOU, 'kana_to_meaning', pools, seededRng(1))
    expect(q.prompt.hint).toBeUndefined()
  })

  it('không có câu gõ nghĩa tiếng Việt', () => {
    const typingKinds = Object.entries(EXERCISES).filter(([, v]) => v.kind === 'typing').map(([, v]) => v.skill)
    expect(typingKinds).not.toContain('S1')
  })
})

describe('parseStageAnswerRequest — không tin trình duyệt', () => {
  const ok = {
    learnerVocabularyId: '11111111-1111-4111-8111-111111111111',
    clientEventId: '22222222-2222-4222-8222-222222222222',
    stage: 4,
    exercise: 'kanji_assembly',
    answer: ['学', '校'],
  }
  it('dữ liệu đúng, làm tròn thời gian, bỏ trường lạ', () => {
    expect(parseStageAnswerRequest({ ...ok, responseMs: 12.4, points: 99 })).toEqual({ ...ok, responseMs: 12 })
  })
  it.each([
    ['stage không tính điểm', { stage: 3 }],
    ['dạng bài lạ', { exercise: 'x' }],
    ['câu trả lời rỗng', { answer: '' }],
    ['mảng rỗng', { answer: [] }],
    ['mảng sai kiểu', { answer: [1] }],
    ['id sai', { clientEventId: 'x' }],
    ['thời gian âm', { responseMs: -1 }],
  ])('%s → null', (_n, patch) => {
    expect(parseStageAnswerRequest({ ...ok, ...patch })).toBeNull()
  })
})
