// Grammar G5 — chia động từ / tính từ: bảng mẫu và kiểm tra trên toàn bộ data/n5/verbs.json.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acceptedOf, conjugate, distractorsOf, VERB_FORMS, type VerbFormId } from '../conjugate'
import type { VerbWord } from '../types'

const words = (JSON.parse(readFileSync(join(process.cwd(), 'data', 'n5', 'verbs.json'), 'utf8')) as { words: VerbWord[] }).words
const byExpr = (e: string) => {
  const w = words.find((x) => x.expression === e)
  if (!w) throw new Error(`không có ${e}`)
  return w
}
const r = (e: string, f: VerbFormId) => conjugate(byExpr(e), f)?.r
const t = (e: string, f: VerbFormId) => conjugate(byExpr(e), f)?.t

describe('Bảng chia mẫu', () => {
  it('nhóm I: âm て/た theo đuôi', () => {
    expect(t('書きます', 'te')).toBe('書いて')
    expect(t('泳ぎます', 'te')).toBe('泳いで')
    expect(t('話します', 'te')).toBe('話して')
    expect(t('待ちます', 'te')).toBe('待って')
    expect(t('遊びます', 'te')).toBe('遊んで')
    expect(t('飲みます', 'ta')).toBe('飲んだ')
    expect(t('帰ります', 'te')).toBe('帰って')
    expect(t('買います', 'te')).toBe('買って')
    expect(t('買います', 'nai')).toBe('買わない')
    expect(r('書きます', 'potential')).toBe('かける')
    expect(r('飲みます', 'volitional')).toBe('のもう')
    expect(r('帰ります', 'imperative')).toBe('かえれ')
    expect(r('待ちます', 'ba')).toBe('まてば')
    expect(r('書きます', 'passive')).toBe('かかれる')
    expect(r('買います', 'causative')).toBe('かわせる')
  })
  it('ngoại lệ: 行く, ある, nhóm II trông như nhóm I', () => {
    expect(t('行きます', 'te')).toBe('行って')
    expect(t('行きます', 'ta')).toBe('行った')
    expect(t('持って行きます', 'te')).toBe('持って行って')
    expect(t('あります', 'nai')).toBe('ない')
    expect(t('あります', 'nakatta')).toBe('なかった')
    expect(conjugate(byExpr('あります'), 'potential')).toBeNull()
    expect(t('入ります', 'te')).toBe('入って')
    expect(t('切ります', 'nai')).toBe('切らない')
  })
  it('nhóm II, 来る, する', () => {
    expect(t('食べます', 'te')).toBe('食べて')
    expect(t('食べます', 'potential')).toBe('食べられる')
    expect(t('見ます', 'nai')).toBe('見ない')
    expect(t('おきます', 'dict')).toBe('おきる')
    expect(t('来ます', 'nai')).toBe('来ない')
    expect(r('来ます', 'nai')).toBe('こない')
    expect(r('来ます', 'te')).toBe('きて')
    expect(r('来ます', 'ba')).toBe('くれば')
    expect(r('持って来ます', 'potential')).toBe('もってこられる')
    expect(t('勉強します', 'potential')).toBe('勉強できる')
    expect(t('勉強します', 'passive')).toBe('勉強される')
    expect(t('帰ってきます', 'nai')).toBe('帰ってこない')
  })
  it('tính từ い, いい, な', () => {
    expect(t('大きい', 'a-plainneg')).toBe('大きくない')
    expect(t('大きい', 'a-past')).toBe('大きかったです')
    expect(conjugate(byExpr('大きい'), 'a-neg')!.alts.map((a) => a.t)).toContain('大きくありません')
    expect(t('いい', 'a-plainneg')).toBe('よくない')
    expect(t('頭がいい', 'a-plainpast')).toBe('頭がよかった')
    expect(t('静か', 'a-neg')).toBe('静かじゃありません')
    expect(acceptedOf(conjugate(byExpr('静か'), 'a-neg')!)).toContain('静かではありません')
    expect(t('静か', 'a-te')).toBe('静かで')
    expect(conjugate(byExpr('静か'), 'te')).toBeNull()
  })
})

describe('Toàn bộ dữ liệu', () => {
  const all = VERB_FORMS.map((f) => f.id)
  it('mọi từ, mọi thể: cách đọc toàn kana; dạng chọn có ≥ 3 đáp án nhiễu, không trùng cách viết đúng', () => {
    let n = 0
    for (const w of words) {
      for (const f of all) {
        const c = conjugate(w, f)
        if (!c) continue
        n++
        expect(c.r, `${w.expression} ${f}`).toMatch(/^[ぁ-ゖァ-ヺー]+$/)
        expect(c.t.length, `${w.expression} ${f}`).toBeGreaterThan(0)
        const d = distractorsOf(w, f, all)
        expect(d.length, `${w.expression} ${f}`).toBeGreaterThanOrEqual(3)
        for (const x of d) expect(acceptedOf(c), `${w.expression} ${f} ${x}`).not.toContain(x)
      }
    }
    expect(n).toBeGreaterThan(5000)
  })
  it('thể ます chia lại đúng bằng mục trong lộ trình', () => {
    for (const w of words.filter((x) => x.expression.endsWith('ます'))) expect(conjugate(w, 'masu')!.t, w.code).toBe(w.expression)
  })
})
