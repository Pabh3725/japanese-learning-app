// JLPT đợt 1 (J3): sinh file mẫu câu 漢字読み và 表記 để chủ dự án duyệt chất lượng đáp án nhiễu.
// Chạy: pnpm exec tsx scripts/jlpt/samples.ts → docs/jlpt-review.md. Dùng đúng hàm dựng câu của app (lib/jlpt/questions.ts),
// dữ liệu đọc từ file (không cần database). Mỗi cấp 30 câu mỗi dạng, seed cố định nên chạy lại ra cùng kết quả.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { GrammarLessonFile } from '../../lib/grammar/types'
import { buildKanjiReading, buildKatakana, buildOrthography, hasKanji, isKatakanaWord, type JlptGrammarSentence, type JlptQuestion, type JlptWord } from '../../lib/jlpt/questions'
import { shuffle } from '../../lib/jlpt/reading'

const root = process.cwd()

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' } else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

let seed = 20261114
const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

const vocab = parseCsv(readFileSync(join(root, 'data/n5/vocabularies.csv'), 'utf8'))
const kanji = parseCsv(readFileSync(join(root, 'data/n5/kanji.csv'), 'utf8'))
const similar = parseCsv(readFileSync(join(root, 'data/n5/kanji_similar.csv'), 'utf8')).filter((r) => r.approved === 'true')
const words = vocab.map((r) => ({ word: { id: r.code, code: r.code, expression: r.expression, reading: r.reading_kana, meaning: r.meaning_vi, hanViet: r.han_viet || null } as JlptWord, level: Number(r.jlpt_level), lesson: Number(r.lesson) }))
const grammar = readdirSync(join(root, 'data/grammar')).flatMap((f) => {
  const file = JSON.parse(readFileSync(join(root, 'data/grammar', f), 'utf8')) as GrammarLessonFile
  return file.points.flatMap((p) => p.sentences.map((s) => ({ ...s, lesson: file.lesson, pattern: p.pattern, patternMeaning: p.meaning })))
})

const readingsOf = new Map<string, Set<string>>()
const byReading = new Map<string, Set<string>>()
for (const { word: w } of words) {
  readingsOf.set(w.expression, (readingsOf.get(w.expression) ?? new Set()).add(w.reading))
  byReading.set(w.reading, (byReading.get(w.reading) ?? new Set()).add(w.expression))
}
const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
const onyomi = (r: Record<string, string>) => (r.onyomi.replace(/[{}"]/g, '').split(',').filter(Boolean)).map(toHira)
const common = kanji
const byOn = new Map<string, string[]>()
for (const k of common) for (const on of onyomi(k)) byOn.set(on, [...(byOn.get(on) ?? []), k.character])
const onOf = new Map(common.map((k) => [k.character, onyomi(k)]))
const simOf = new Map<string, string[]>()
for (const s of similar) {
  simOf.set(s.a, [...(simOf.get(s.a) ?? []), s.b])
  simOf.set(s.b, [...(simOf.get(s.b) ?? []), s.a])
}
const byLesson = new Map<number, JlptWord[]>()
for (const { word: w, lesson } of words) if (hasKanji(w.expression)) byLesson.set(lesson, [...(byLesson.get(lesson) ?? []), w])
const siblingsOf = (w: JlptWord, lesson: number) => (byLesson.get(lesson) ?? []).filter((x) => x.id !== w.id).map((x) => x.reading)
const swaps = (c: string) => [...new Set([...(simOf.get(c) ?? []), ...(onOf.get(c) ?? []).flatMap((on) => byOn.get(on) ?? [])])].filter((x) => x !== c)

const lines: string[] = [
  '# JLPT đợt 1 — mẫu câu 漢字読み và 表記 (chờ duyệt)',
  '',
  '> Sinh bằng `pnpm exec tsx scripts/jlpt/samples.ts`, dùng đúng hàm dựng câu của app. Mỗi cấp 30 câu mỗi dạng, chọn ngẫu nhiên (seed cố định). Đáp án đúng in **đậm**. Duyệt chất lượng đáp án nhiễu: nhiễu phải sai chắc chắn và trông hợp lý.',
  '',
]
const stemText = (q: JlptQuestion) => (q.stem ?? []).map((p) => (p.mark === 'underline' ? `__${p.t}__` : p.t)).join('')
const optionsText = (q: JlptQuestion) => q.options.map((o, i) => (i === q.answer ? `**${i + 1}. ${o}**` : `${i + 1}. ${o}`)).join(' · ')

for (const level of [5, 4]) {
  const [first, last] = level === 5 ? [1, 25] : [26, 50]
  const levelWords = words.filter((w) => w.level === level && hasKanji(w.word.expression))
  const sentences = grammar.filter((s) => s.lesson >= first && s.lesson <= last) as unknown as JlptGrammarSentence[]
  const contextOf = (e: string) => sentences.find((s) => s.pieces.some((p) => p.t === e)) ?? null
  for (const [type, title] of [['kanji_reading', '漢字読み'], ['orthography', '表記']] as const) {
    lines.push(`## N${level} · ${title}`, '')
    let n = 0
    for (const { word: w, lesson } of shuffle(levelWords, rng)) {
      if (n >= 30) break
      const q =
        type === 'kanji_reading'
          ? buildKanjiReading(w, contextOf(w.expression), readingsOf.get(w.expression) ?? new Set(), rng, siblingsOf(w, lesson))
          : buildOrthography(w, contextOf(w.expression), swaps, byReading.get(w.reading) ?? new Set(), [], rng)
      if (!q) continue
      n++
      lines.push(`${n}. ${stemText(q)}  `, `   ${optionsText(q)}  `, `   _${w.meaning}_`, '')
    }
  }
  // N5: 表記 Katakana
  if (level === 5) {
    lines.push('## N5 · 表記 (Katakana)', '')
    let n = 0
    for (const { word: w } of shuffle(words.filter((x) => x.level === 5 && isKatakanaWord(x.word.expression)), rng)) {
      if (n >= 15) break
      const q = buildKatakana(w, contextOf(w.expression), rng)
      if (!q) continue
      n++
      lines.push(`${n}. ${stemText(q)}  `, `   ${optionsText(q)}  `, `   _${w.meaning}_`, '')
    }
  }
}
writeFileSync(join(root, 'docs/jlpt-review.md'), lines.join('\n'))
console.log('Đã ghi docs/jlpt-review.md')

// Độ phủ: bao nhiêu từ có Kanji dựng được câu mỗi dạng
for (const level of [5, 4]) {
  const levelWords = words.filter((w) => w.level === level && hasKanji(w.word.expression))
  let r = 0
  let o = 0
  for (const { word: w } of levelWords) {
    if (buildKanjiReading(w, null, readingsOf.get(w.expression) ?? new Set(), rng)) r++
    if (buildOrthography(w, null, swaps, byReading.get(w.reading) ?? new Set(), [], rng)) o++
  }
  console.log(`N${level}: ${levelWords.length} từ có Kanji · 漢字読み ${r} · 表記 ${o}`)
}
