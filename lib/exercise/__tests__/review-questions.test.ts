import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CardType } from '../../learning/types'
import { seededRng } from '../questions'
import { buildReviewQuestion, chooseReviewExercise, reviewExercises } from '../review-questions'
import { starRoundExercises } from '../../learn/star-round'
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

const ALL_KNOWN = { currentStage: 5, kanjiIntroSeen: true }

describe('Câu hỏi khi ôn Card', () => {
  it('mọi từ × mọi loại card × mọi dạng: dựng được câu, đáp án đúng được chấm đúng', () => {
    let seed = 1
    for (const word of words) {
      const types: CardType[] = word.is_kana_only ? ['vocab.meaning_kana'] : ['vocab.meaning_kana', ...KANJI_CARDS]
      for (const type of types) {
        for (const exercise of reviewExercises(type, word, ALL_KNOWN)) {
          const q = buildReviewQuestion(type, word, exercise, pools, seededRng(seed++))
          const graded = q.kind === 'choice' ? gradeStageAnswer(word, exercise, q.answer, pools.kanji).outcome : 'correct'
          expect(graded, `${word.expression} ${type} ${exercise}`).toBe('correct')
        }
      }
    }
  }, 120_000)

  it('card kana–Hán Việt có từ trước thẻ Hán tự nên không lộ Kanji', () => {
    for (const exercise of reviewExercises('vocab.kana_hanviet', GAKKOU, ALL_KNOWN)) {
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
      expect(chooseReviewExercise('vocab.meaning_kanji', GAKKOU, ALL_KNOWN, 'kanji_assembly_nohint', seededRng(seed))).toBe('kanji_recognition_6')
    }
  })

  it('nghĩa không ghép được thì bỏ dạng ghép nghĩa', () => {
    const complex = words.find((w) => !w.is_kana_only && w.meaning_vi.includes(';'))!
    expect(reviewExercises('vocab.kanji_meaning_hanviet', complex, ALL_KNOWN)).not.toContain('meaning_assembly')
  })
})

describe('Card riêng của từ có sao', () => {
  const word = GAKKOU
  it('chỉ gõ và ghép; Hán Việt, Kanji chỉ có sau khi giới thiệu', () => {
    const early = reviewExercises('vocab.star_recall', word, { currentStage: 2, kanjiIntroSeen: false })
    expect(early).toEqual(['kana_free_recall', 'kana_assembly'])
    const late = reviewExercises('vocab.star_recall', word, ALL_KNOWN)
    expect(late).toEqual(['kana_free_recall', 'kana_assembly', 'hanviet_free_recall', 'kanji_assembly_nohint'])
  })
  it('mọi từ dựng được câu của Card riêng và của vòng học thêm, không lộ thứ chưa giới thiệu', () => {
    let seed = 1
    for (const word of words) {
      for (const known of [{ currentStage: 2, kanjiIntroSeen: false }, ALL_KNOWN]) {
        const exercises = [...reviewExercises('vocab.star_recall', word, known), ...starRoundExercises(word, known)]
        for (const exercise of exercises) {
          const q = buildReviewQuestion('vocab.star_recall', word, exercise, pools, seededRng(seed++))
          expect(q.prompt.display, `${word.reading_kana} ${exercise}`).toBeTruthy()
          if (!known.kanjiIntroSeen && !word.is_kana_only && word.expression !== word.reading_kana) {
            expect(q.prompt.display).not.toBe(word.expression)
          }
        }
      }
    }
  }, 120_000)
  it('từ chỉ có Kana không hỏi Hán Việt, Kanji', () => {
    expect(reviewExercises('vocab.star_recall', { ...word, is_kana_only: true }, ALL_KNOWN)).toEqual(['kana_free_recall', 'kana_assembly'])
  })
})
