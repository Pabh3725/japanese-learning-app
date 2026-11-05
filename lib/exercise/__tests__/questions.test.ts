// VOC-02 — Test dựng câu Stage 2: đáp án nhiễu theo data-spec §5, chấm điểm, kế hoạch phiên.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  answerFor,
  buildChoiceQuestion,
  canBeDistractor,
  gradeChoice,
  planStage2Session,
  sameMeaning,
  seededRng,
  STAGE2_CHOICE_EXERCISES,
  type QuestionWord,
} from '../questions'

const w = (id: string, reading_kana: string, meaning_vi: string): QuestionWord => ({ id, reading_kana, meaning_vi })

const GAKKOU = w('1', 'がっこう', 'trường học')
const SMALL_POOL = [
  GAKKOU,
  w('2', 'がくせい', 'học sinh'),
  w('3', 'だいがく', 'đại học'),
  w('4', 'せんせい', 'giáo viên'),
  w('5', 'ばん', 'tối'),
  w('6', 'よる', 'tối'),
  w('7', 'くらい', 'Tối '), // trùng nghĩa sau khi trim + viết thường
  w('8', 'きます', 'đến'),
  w('9', 'きます', 'mặc'), // đồng âm khác nghĩa
  w('10', 'テレビ', 'ti vi'),
  w('11', 'カメラ', 'máy ảnh'),
  w('12', 'ラジオ', 'radio'),
  w('13', 'コーヒー', 'cà phê'),
]

/** Dữ liệu thật trong repo. */
function realWords(): QuestionWord[] {
  const text = readFileSync(join(process.cwd(), 'data', 'n5', 'vocabularies.csv'), 'utf8')
  const lines = text.replace(/\r/g, '').trim().split('\n')
  const header = parseCsvLine(lines[0])
  const col = (name: string) => header.indexOf(name)
  return lines.slice(1).map((line) => {
    const c = parseCsvLine(line)
    return w(c[col('code')], c[col('reading_kana')], c[col('meaning_vi')])
  })
}
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { out.push(cell); cell = '' }
    else cell += ch
  }
  out.push(cell)
  return out
}

describe('Luật đáp án nhiễu (data-spec §5)', () => {
  it('loại chính nó, từ cùng nghĩa (kể cả khác hoa/thường, khoảng trắng) và từ đồng âm', () => {
    const ban = SMALL_POOL[4]
    expect(canBeDistractor(ban, ban)).toBe(false)
    expect(canBeDistractor(ban, SMALL_POOL[5])).toBe(false) // よる "tối"
    expect(canBeDistractor(ban, SMALL_POOL[6])).toBe(false) // くらい "Tối "
    expect(canBeDistractor(SMALL_POOL[7], SMALL_POOL[8])).toBe(false) // きます đến / きます mặc
    expect(canBeDistractor(GAKKOU, SMALL_POOL[1])).toBe(true)
  })

  it('đề "ばん → ?" không bao giờ có "tối" thứ hai trong đáp án', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = buildChoiceQuestion(SMALL_POOL[4], SMALL_POOL, 'kana_to_meaning', seededRng(seed))
      expect(q.options.filter((o) => sameMeaning(o, 'tối'))).toHaveLength(1)
    }
  })

  it('đề "きます → ?" (đến) không bao giờ có "mặc"', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = buildChoiceQuestion(SMALL_POOL[7], SMALL_POOL, 'kana_to_meaning', seededRng(seed))
      expect(q.options.includes('mặc')).toBe(false)
    }
  })

  it('đề chọn kana của từ Katakana → đáp án nhiễu cũng là Katakana', () => {
    const q = buildChoiceQuestion(SMALL_POOL[9], SMALL_POOL, 'meaning_to_kana', seededRng(7))
    expect(q.options.every((o) => /^[ァ-ヺー]+$/.test(o))).toBe(true)
  })

  it('4 đáp án, không trùng, đúng 1 đáp án đúng; cùng hạt giống → cùng đề', () => {
    const a = buildChoiceQuestion(GAKKOU, SMALL_POOL, 'kana_to_meaning', seededRng(42))
    const b = buildChoiceQuestion(GAKKOU, SMALL_POOL, 'kana_to_meaning', seededRng(42))
    expect(a).toEqual(b)
    expect(a.prompt).toBe('がっこう')
    expect(new Set(a.options).size).toBe(4)
    expect(a.options.filter((o) => o === 'trường học')).toHaveLength(1)
  })
})

describe('Dữ liệu thật: 912 từ × 2 dạng câu', () => {
  const words = realWords()

  it('mọi câu có đúng 4 đáp án khác nhau và KHÔNG có đáp án đúng thứ hai', () => {
    expect(words.length).toBeGreaterThan(900)
    const rng = seededRng(2026)
    for (const target of words) {
      for (const ex of STAGE2_CHOICE_EXERCISES) {
        const q = buildChoiceQuestion(target, words, ex, rng)
        expect(new Set(q.options).size).toBe(4)
        expect(q.options.filter((o) => o === q.answer)).toHaveLength(1)
        // Mỗi đáp án nhiễu: không từ nào mang chữ đó lại cũng là đáp án đúng của đề này
        for (const opt of q.options.filter((o) => o !== q.answer)) {
          const owners = words.filter((o) => answerFor(o, ex) === opt)
          const alsoCorrect = owners.some((o) =>
            ex === 'kana_to_meaning' ? o.reading_kana === target.reading_kana : sameMeaning(o.meaning_vi, target.meaning_vi),
          )
          expect(alsoCorrect, `${target.id} ${ex}: "${opt}" cũng đúng`).toBe(false)
        }
      }
    }
  })
})

describe('Chấm điểm (D1 — server chấm)', () => {
  it('so với đáp án thật của từ, bỏ khoảng trắng thừa', () => {
    expect(gradeChoice(GAKKOU, 'kana_to_meaning', 'trường học')).toBe('correct')
    expect(gradeChoice(GAKKOU, 'kana_to_meaning', ' trường học ')).toBe('correct')
    expect(gradeChoice(GAKKOU, 'kana_to_meaning', 'học sinh')).toBe('wrong')
    expect(gradeChoice(GAKKOU, 'meaning_to_kana', 'がっこう')).toBe('correct')
    expect(gradeChoice(GAKKOU, 'meaning_to_kana', 'trường học')).toBe('wrong')
  })
})

describe('Kế hoạch phiên Stage 2', () => {
  it('mỗi từ tối đa 2 câu (đủ 2 dạng), tối đa N câu, không từ nào đứng liền nhau', () => {
    const words = ['a', 'b', 'c', 'd', 'e', 'f']
    const plan = planStage2Session(words, 10, seededRng(3))
    expect(plan).toHaveLength(10)
    for (let i = 1; i < plan.length; i++) expect(plan[i].word === plan[i - 1].word).toBe(false)
    for (const word of words) {
      const types = plan.filter((p) => p.word === word).map((p) => p.exercise)
      expect(new Set(types).size).toBe(types.length) // không lặp dạng trong một từ
    }
  })

  it('ít từ → ít câu (2 từ → 4 câu)', () => {
    expect(planStage2Session(['a', 'b'], 10, seededRng(1))).toHaveLength(4)
  })
})
