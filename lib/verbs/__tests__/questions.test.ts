// Grammar G5 — câu luyện chia: mọi câu có đúng một đáp án đúng; gõ kana, Kanji hay romaji đều chấm được.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toRomaji } from 'wanakana'
import { describe, expect, it } from 'vitest'
import { conjugate, VERB_FORMS } from '../conjugate'
import { buildVerbQuestion, gradeVerbQuestion, VERB_EXERCISES } from '../questions'
import type { VerbWord } from '../types'

const words = (JSON.parse(readFileSync(join(process.cwd(), 'data', 'n5', 'verbs.json'), 'utf8')) as { words: VerbWord[] }).words
const all = VERB_FORMS.map((f) => f.id)

describe('Câu luyện chia trên toàn bộ dữ liệu', () => {
  it('dạng chọn và nhận diện: đúng một lựa chọn được chấm đúng', () => {
    let n = 0
    for (const w of words) for (const f of all) for (const ex of ['choose', 'recognize'] as const) {
      const q = buildVerbQuestion(w, f, ex, all, 11)
      if (!q) continue
      n++
      const right = q.options!.filter((o) => gradeVerbQuestion(w, q, o.id, all).correct)
      expect(right, `${w.expression} ${f} ${ex}`).toHaveLength(1)
      expect(new Set(q.options!.map((o) => o.id)).size).toBe(4)
    }
    expect(n).toBeGreaterThan(5000)
  })

  it('dạng gõ và đổi ngược: chấp nhận Kanji, kana và romaji; đáp án sai bị chấm sai', () => {
    for (const w of words) for (const f of all) for (const ex of ['type', 'reverse'] as const) {
      const q = buildVerbQuestion(w, f, ex, all, 5)
      if (!q) continue
      const g = gradeVerbQuestion(w, q, '', all)
      for (const a of [g.expected, g.expectedReading, toRomaji(g.expectedReading)]) expect(gradeVerbQuestion(w, q, a, all).correct, `${w.expression} ${f} ${ex} ${a}`).toBe(true)
      expect(gradeVerbQuestion(w, q, `${g.expectedReading}か`, all).correct).toBe(false)
    }
  })

  it('nhận diện bỏ qua chữ mơ hồ: 食べられる vừa là khả năng vừa là bị động', () => {
    const w = words.find((x) => x.expression === '食べます')!
    expect(conjugate(w, 'potential')!.t).toBe(conjugate(w, 'passive')!.t)
    expect(buildVerbQuestion(w, 'potential', 'recognize', all, 1)).toBeNull()
    expect(buildVerbQuestion(w, 'potential', 'recognize', all.filter((f) => f !== 'passive'), 1)).not.toBeNull()
  })

  it('mỗi dạng đều dựng được trên phần lớn động từ', () => {
    const verbs = words.filter((w) => !w.kind.startsWith('adj'))
    for (const ex of VERB_EXERCISES) {
      const ok = verbs.filter((w) => buildVerbQuestion(w, 'te', ex, all, 3) !== null).length
      expect(ok / verbs.length, ex).toBeGreaterThan(0.9)
    }
  })
})
