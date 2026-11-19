import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isKanaAnswerCorrect, romajiToKanaInput } from '../answer-normalize'
import { isKatakana } from '../questions'
import { typedRomaji, typingTip } from '../typing-tips'

const lines = readFileSync(join(process.cwd(), 'data/n5/vocabularies.csv'), 'utf8').replace(/^﻿/, '').split('\n')
const column = lines[0].split(',').indexOf('reading_kana')
const readings = lines.slice(1).filter(Boolean).map((line) => line.split(',')[column])

describe('typedRomaji', () => {
  it.each([
    ['コーヒー', 'ko-hi-'],
    ['がっこう', 'gakkou'],
    ['ほんや', "hon'ya"],
    ['フォーク', 'fo-ku'],
    ['パーティー', 'pa-thi-'],
  ])('%s gõ là %s', (reading, typed) => {
    expect(typedRomaji(reading)).toBe(typed)
  })

  it('gõ theo hướng dẫn ra đúng chữ và được chấm đúng, với mọi từ', () => {
    expect(readings.length).toBeGreaterThan(900)
    for (const reading of readings) {
      const mode = isKatakana(reading) ? 'katakana' : 'hiragana'
      const shown = romajiToKanaInput(typedRomaji(reading), mode)
      expect(isKanaAnswerCorrect(shown, reading)).toBe(true)
      // Từ pha hai bảng chữ (けしゴム) gõ ra một bảng và vẫn được chấm đúng.
      // Chữ n cuối được giữ nguyên trong ô nhập vì chưa biết là ん hay な.
      if (!/[ぁ-ゖ]/.test(reading) || !/[ァ-ヺ]/.test(reading)) {
        expect(shown.replace(/n$/, mode === 'katakana' ? 'ン' : 'ん')).toBe(reading)
      }
    }
  })
})

describe('typingTip', () => {
  it('chỉ nhắc những chữ có trong từ', () => {
    expect(typingTip('コーヒー').rules).toEqual(['Chữ ー gõ bằng dấu gạch ngang (-).'])
    expect(typingTip('やすみ').rules).toEqual([])
    expect(typingTip('がっこう').rules[0]).toContain('っ')
    expect(typingTip('ほんや').rules[0]).toContain("n'")
    expect(typingTip('きょう').rules[0]).toContain('きょ gõ liền: kyo')
  })
})
