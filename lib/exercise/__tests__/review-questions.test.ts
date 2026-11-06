import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CardType } from '../../learning/types'
import { seededRng } from '../questions'
import { buildReviewQuestion, chooseReviewExercise, reviewExercises } from '../review-questions'
import { gradeStageAnswer, type QuestionPools, type StageWord } from '../stage-questions'

function readCsv(file: string): Record<string, string>[] {
  const parse = (line: string) => {
    const cells: string[] = []
    let cur = ''
    let quoted = false
    for (const ch of line) {
      if (ch === '"') quoted = !quoted
      else if (ch === ',' && !quoted) {
        cells.push(cur)
        cur = ''
      } else cur += ch
    }
    return [...cells, cur]
  }
  const [head, ...rows] = readFileSync(join(process.cwd(), 'data/n5', file), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
  const cols = parse(head)
  return rows.map((row) => Object.fromEntries(parse(row).map((v, i) => [cols[i], v])))
}

const words: StageWord[] = readCsv('vocabularies.csv').map((r) => ({
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
const GAKKOU = words.find((w) => w.expression === '学校')!
const KANJI_CARDS: CardType[] = ['vocab.kana_hanviet', 'vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet', 'vocab.meaning_hanviet']

describe('Câu hỏi khi ôn Card', () => {
  it('mọi từ × mọi loại card × mọi dạng: dựng được câu, đáp án đúng được chấm đúng', () => {
    let seed = 1
    for (const word of words) {
      const types: CardType[] = word.is_kana_only ? ['vocab.meaning_kana'] : ['vocab.meaning_kana', ...KANJI_CARDS]
      for (const type of types) {
        for (const exercise of reviewExercises(type, word)) {
          const q = buildReviewQuestion(type, word, exercise, pools, seededRng(seed++))
          const graded = q.kind === 'choice' ? gradeStageAnswer(word, exercise, q.answer, pools.kanji).outcome : 'correct'
          expect(graded, `${word.expression} ${type} ${exercise}`).toBe('correct')
        }
      }
    }
  }, 120_000)

  it('card kana–Hán Việt có từ trước thẻ Hán tự nên không lộ Kanji', () => {
    for (const exercise of reviewExercises('vocab.kana_hanviet', GAKKOU)) {
      const q = buildReviewQuestion('vocab.kana_hanviet', GAKKOU, exercise, pools, seededRng(1))
      expect(q.prompt.display).toBe('がっこう')
      expect(JSON.stringify(q)).not.toContain('学校')
      expect(JSON.stringify(q)).not.toContain('学')
    }
  })

  it('đề đúng hướng của từng loại card', () => {
    const prompt = (type: CardType, exercise: Parameters<typeof buildReviewQuestion>[2]) =>
      buildReviewQuestion(type, GAKKOU, exercise, pools, seededRng(1)).prompt.display
    expect(prompt('vocab.meaning_kanji', 'kanji_assembly_nohint')).toBe(GAKKOU.meaning_vi)
    expect(prompt('vocab.kanji_meaning_hanviet', 'meaning_recognition_6')).toBe('学校')
    expect(prompt('vocab.kanji_meaning_hanviet', 'hanviet_free_recall')).toBe('学校')
    expect(prompt('vocab.meaning_hanviet', 'hanviet_assembly')).toBe(GAKKOU.meaning_vi)
    expect(prompt('vocab.meaning_hanviet', 'meaning_recognition_6')).toBe(GAKKOU.han_viet)
  })

  it('không lặp dạng của lần ôn trước', () => {
    for (let seed = 1; seed < 40; seed++) {
      expect(chooseReviewExercise('vocab.meaning_kanji', GAKKOU, 'kanji_assembly_nohint', seededRng(seed))).toBe('kanji_recognition_6')
    }
  })

  it('nghĩa không ghép được thì bỏ dạng ghép nghĩa', () => {
    const complex = words.find((w) => !w.is_kana_only && w.meaning_vi.includes(';'))!
    expect(reviewExercises('vocab.kanji_meaning_hanviet', complex)).not.toContain('meaning_assembly')
  })
})
