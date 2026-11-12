// Đáp án nhiễu chỉ lấy từ chữ đã học, thiếu thì bù bằng chữ sắp học cùng cấp (chủ dự án 2026-11-12).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildStageQuestion, type AssemblyQuestionData, type ChoiceQuestionData, type QuestionPools, type StageWord } from '../../exercise/stage-questions'
import { kanjiTier, rankByTier } from '../distractor-tier'
import { buildKanjiQuestion, type KanjiRow } from '../questions'
import type { KanjiExercise } from '../rules'

const parseArray = (value: string) => (value === '{}' ? [] : value.slice(1, -1).split(',').map((part) => part.replace(/"/g, '')))
const cellsOf = (line: string) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'))
// Thứ tự trong file là thứ tự học; nửa đầu cấp 5, nửa sau cấp 4 (đủ để thử "cùng cấp")
const lines = readFileSync(join(process.cwd(), 'data', 'n5', 'kanji.csv'), 'utf8').trim().split('\n').slice(1)
const all: KanjiRow[] = lines.map((line, i) => {
  const cells = cellsOf(line)
  return { id: String(i), character: cells[0], han_viet: cells[1], meaning_vi: cells[2], onyomi: parseArray(cells[3]), kunyomi: parseArray(cells[4]), jlpt_level: i < lines.length / 2 ? 5 : 4 }
})
const seeded = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296

const CHOICE: KanjiExercise[] = ['kanji_to_meaning', 'kanji_to_hanviet', 'pick_kanji', 'hanviet_to_kanji', 'kanji_reading']
const byText = (question: ReturnType<typeof buildKanjiQuestion>, exercise: KanjiExercise) => {
  if (question.kind !== 'choice') throw new Error('không phải trắc nghiệm')
  const field = exercise === 'kanji_to_meaning' ? 'meaning_vi' : exercise === 'kanji_to_hanviet' ? 'han_viet' : exercise === 'kanji_reading' ? null : 'character'
  return question.options
    .filter((o) => o !== question.answer)
    .map((o) => (field ? all.filter((k) => k[field] === o) : all.filter((k) => [...k.onyomi, ...k.kunyomi].some((r) => r.replace(/[.-]/g, '') === o.replace(/[.-]/g, '')))))
}

describe('Bậc của chữ', () => {
  it('đã học trước, rồi chữ sắp học cùng cấp (gần trước), cuối cùng chữ khác cấp', () => {
    const tier = kanjiTier(all, new Set(['3']), 5)
    expect(tier(all[3])).toBe(0)
    expect(tier(all[0])).toBeLessThan(tier(all[300]))
    expect(tier(all[0])).toBeGreaterThan(0)
    expect(tier(all[all.length - 1])).toBe(2)
  })

  it('cùng bậc thì xáo ngẫu nhiên, mọi phần tử vẫn còn', () => {
    const ranked = rankByTier([1, 2, 3, 4, 5, 6], (x) => (x % 2 === 0 ? 0 : 1), seeded(1))
    expect(ranked.slice(0, 3).sort()).toEqual([2, 4, 6])
    expect([...ranked].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('Câu Kanji: nhiễu chỉ từ chữ đã học', () => {
  const learned = new Set(all.slice(0, 40).map((k) => k.id))
  const tier = kanjiTier(all, learned, 5)

  it('đủ chữ đã học: mọi đáp án nhiễu đều là chữ đã học', () => {
    for (const exercise of CHOICE) {
      for (let seed = 1; seed <= 30; seed++) {
        const target = all[seed]
        const q = buildKanjiQuestion(target, exercise, all, null, seeded(seed), 6, [], tier)
        for (const candidates of byText(q, exercise)) expect(candidates.some((k) => learned.has(k.id))).toBe(true)
      }
    }
  })

  it('mới học 2 chữ: bù bằng chữ sắp học cùng cấp, không lấy chữ khác cấp', () => {
    const few = new Set(['0', '1'])
    const fewTier = kanjiTier(all, few, 5)
    const q = buildKanjiQuestion(all[1], 'pick_kanji', all, null, seeded(7), 6, [], fewTier)
    if (q.kind !== 'choice') throw new Error('không phải trắc nghiệm')
    expect(q.options).toHaveLength(6)
    const wrong = q.options.filter((o) => o !== q.answer).map((o) => all.find((k) => k.character === o)!)
    expect(wrong.some((k) => k.id === '0')).toBe(true)
    for (const k of wrong) expect(k.jlpt_level).toBe(5)
  })

  it('không truyền bậc: như cũ, vẫn đủ lựa chọn', () => {
    const q = buildKanjiQuestion(all[5], 'pick_kanji', all, null, seeded(3))
    expect(q.kind === 'choice' && q.options.length).toBe(4)
  })
})

describe('Câu từ vựng có Kanji (Stage 4–6)', () => {
  const vocab = readFileSync(join(process.cwd(), 'data', 'n5', 'vocabularies.csv'), 'utf8').trim().split('\n')
  const head = cellsOf(vocab[0])
  const words: StageWord[] = vocab.slice(1).map((line) => {
    const c = cellsOf(line)
    const get = (name: string) => c[head.indexOf(name)]
    return { id: get('code'), expression: get('expression'), reading_kana: get('reading_kana'), meaning_vi: get('meaning_vi'), han_viet: get('han_viet') || null, is_kana_only: get('is_kana_only') === 'true', emoji: null } as StageWord
  })
  const learnedChars = new Set(all.slice(0, 60).map((k) => k.character))
  const tierOfId = kanjiTier(all, new Set(all.slice(0, 60).map((k) => k.id)), 5)
  const byChar = new Map(all.map((k) => [k.character, tierOfId(k)]))
  const pools: QuestionPools = { words, kanji: all, kanjiTier: (c) => byChar.get(c) ?? Infinity }
  const target = words.find((w) => w.expression === '学校')!

  it('mảnh Kanji nhiễu là chữ đã học', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const q = buildStageQuestion(target, 'kanji_assembly', pools, seeded(seed)) as AssemblyQuestionData
      for (const piece of q.pool.filter((p) => !'学校'.includes(p))) expect(learnedChars.has(piece)).toBe(true)
    }
  })

  it('nghĩa của chữ trong từ: nhiễu là nghĩa của chữ đã học', () => {
    const learnedMeanings = new Set(all.slice(0, 60).map((k) => k.meaning_vi))
    for (let seed = 1; seed <= 20; seed++) {
      const q = buildStageQuestion(target, 'kanji_char_meaning', pools, seeded(seed)) as ChoiceQuestionData
      for (const o of q.options.filter((o) => o !== q.answer)) expect(learnedMeanings.has(o)).toBe(true)
    }
  })

  it('chọn cách viết Kanji: từ nhiễu chỉ gồm chữ đã học', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const q = buildStageQuestion(target, 'kanji_recognition', pools, seeded(seed)) as ChoiceQuestionData
      for (const o of q.options.filter((o) => o !== q.answer)) {
        for (const c of o.match(/[一-鿿々]/g) ?? []) expect(learnedChars.has(c) || c === '々').toBe(true)
      }
    }
  })
})
