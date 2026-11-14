// JLPT 漢字読み (docs/jlpt-rules.md §3): nhiễu là cách đọc bị đổi một chỗ hay gặp trong đề. Pure.

/** Xáo Fisher–Yates. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Cột nguyên âm của từng kana (để nhận ra trường âm: こう, しゅう, せい…)
const VOWEL: Record<string, string> = {}
const ROWS: [string, string][] = [
  ['あかさたなはまやらわがざだばぱ', 'a'],
  ['いきしちにひみりぎじぢびぴ', 'i'],
  ['うくすつぬふむゆるぐずづぶぷ', 'u'],
  ['えけせてねへめれげぜでべぺ', 'e'],
  ['おこそとのほもよろをごぞどぼぽ', 'o'],
]
for (const [chars, v] of ROWS) for (const c of chars) VOWEL[c] = v
const SMALL_VOWEL: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o' }

// Âm đục / bán đục
const VOICED: Record<string, string[]> = {
  か: ['が'], き: ['ぎ'], く: ['ぐ'], け: ['げ'], こ: ['ご'],
  さ: ['ざ'], し: ['じ'], す: ['ず'], せ: ['ぜ'], そ: ['ぞ'],
  た: ['だ'], ち: ['ぢ'], つ: ['づ'], て: ['で'], と: ['ど'],
  は: ['ば', 'ぱ'], ひ: ['び', 'ぴ'], ふ: ['ぶ', 'ぷ'], へ: ['べ', 'ぺ'], ほ: ['ぼ', 'ぽ'],
}
for (const [plain, list] of Object.entries({ ...VOICED })) for (const v of list) VOICED[v] = [plain, ...list.filter((x) => x !== v)]

const SMALL_TO_BIG: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' }
const BIG_TO_SMALL: Record<string, string> = { や: 'ゃ', ゆ: 'ゅ', よ: 'ょ' }
// Sau っ chỉ có các hàng này
const GEMINATE_BEFORE = new Set('かきくけこさしすせそたちつてとぱぴぷぺぽ')

const vowelAt = (s: string, i: number) => SMALL_VOWEL[s[i]] ?? VOWEL[s[i]]

// Cùng phụ âm, khác nguyên âm (dự phòng cho từ ngắn: いま → いめ)
const CONSONANT_ROWS = ['かきくけこ', 'がぎぐげご', 'さしすせそ', 'ざじずぜぞ', 'たちつてと', 'だぢづでど', 'なにぬねの', 'はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ', 'まみむめも', 'らりるれろ']
const ROW_OF = new Map<string, string>()
for (const row of CONSONANT_ROWS) for (const c of row) ROW_OF.set(c, row)

export type ReadingChange = 'long' | 'voicing' | 'geminate' | 'small' | 'vowel'

const PLAIN_VOWELS = new Set('あいうえお')

/**
 * Phần kana đi kèm giống nhau ở đầu và cuối giữa cách viết và cách đọc (送り仮名: 休み/やすみ → み; 散歩します → します).
 * Chỉ phần đọc của chữ Hán ở giữa mới được đổi.
 */
export function kanjiSpan(expression: string, reading: string): [number, number] {
  const e = [...expression]
  const r = [...reading]
  let start = 0
  while (start < e.length && start < r.length && e[start] === r[start]) start++
  let end = 0
  while (end < e.length - start && end < r.length - start && e[e.length - 1 - end] === r[r.length - 1 - end]) end++
  return [start, r.length - end]
}

/** Mọi cách đọc sai đổi đúng một chỗ, kèm loại thay đổi. Không trả cách đọc gốc. `span`: chỉ đổi trong khoảng này. */
export function readingMutations(reading: string, span: [number, number] = [0, [...reading].length]): { text: string; kind: ReadingChange }[] {
  const out: { text: string; kind: ReadingChange }[] = []
  const add = (text: string, kind: ReadingChange) => {
    if (text !== reading && text.length > 0 && !/^[っゃゅょー]/.test(text) && !out.some((o) => o.text === text)) out.push({ text, kind })
  }
  const chars = [...reading]
  const [from, to] = span
  for (let i = from; i < to; i++) {
    const c = chars[i]
    const before = chars.slice(0, i).join('')
    const after = chars.slice(i + 1).join('')
    // Trường âm: bỏ う/い kéo dài (こう → こ, せい → せ), hoặc thêm vào sau âm o/u/e
    const prevVowel = i > 0 ? vowelAt(reading, i - 1) : undefined
    if ((c === 'う' && (prevVowel === 'o' || prevVowel === 'u')) || (c === 'い' && prevVowel === 'e')) add(before + after, 'long')
    const v = vowelAt(reading, i)
    const next = chars[i + 1]
    // Không thêm sau một nguyên âm (しゅう → しゅうう) hay trước âm ghép nhỏ
    if ((v === 'o' || v === 'u') && !PLAIN_VOWELS.has(c) && next !== 'う' && !SMALL_VOWEL[next ?? '']) add(before + c + 'う' + after, 'long')
    // Âm đục / bán đục
    for (const alt of VOICED[c] ?? []) add(before + alt + after, 'voicing')
    // Âm ngắt: bỏ っ, hoặc thêm っ trước hàng k/s/t/p (không ở đầu từ)
    if (c === 'っ') add(before + after, 'geminate')
    else if (i > from && GEMINATE_BEFORE.has(c) && chars[i - 1] !== 'っ' && chars[i - 1] !== 'ん') add(before + 'っ' + c + after, 'geminate')
    // Âm ghép: ょ ↔ よ
    if (SMALL_TO_BIG[c]) add(before + SMALL_TO_BIG[c] + after, 'small')
    else if (BIG_TO_SMALL[c] && i > 0 && vowelAt(reading, i - 1) === 'i') add(before + BIG_TO_SMALL[c] + after, 'small')
  }
  // Dự phòng: đổi nguyên âm của một chữ (không đổi chữ đứng trước âm ghép nhỏ)
  for (let i = from; i < to; i++) {
    const row = ROW_OF.get(chars[i])
    if (!row || SMALL_VOWEL[chars[i + 1] ?? '']) continue
    for (const alt of row) if (alt !== chars[i]) add([...chars.slice(0, i), alt, ...chars.slice(i + 1)].join(''), 'vowel')
  }
  return out
}

/** 3 nhiễu khác loại thay đổi khi được; `exclude`: cách đọc đúng khác của cùng cách viết. */
export function readingDistractors(reading: string, rng: () => number, exclude: ReadonlySet<string> = new Set(), count = 3, span?: [number, number]): string[] {
  const all = readingMutations(reading, span).filter((m) => !exclude.has(m.text))
  // Đổi nguyên âm chỉ để lấp khi các kiểu hay gặp trong đề không đủ
  const main = shuffle(all.filter((m) => m.kind !== 'vowel'), rng)
  const filler = shuffle(all.filter((m) => m.kind === 'vowel'), rng)
  const picked: string[] = []
  const kinds = new Set<ReadingChange>()
  for (const m of main) if (picked.length < count && !kinds.has(m.kind)) { picked.push(m.text); kinds.add(m.kind) }
  for (const m of [...main, ...filler]) if (picked.length < count && !picked.includes(m.text)) picked.push(m.text)
  return picked
}
