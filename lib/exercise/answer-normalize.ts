// VOC-08 — Chuẩn hoá câu trả lời gõ tay. Pure. Dùng ở cả trình duyệt (đổi chữ khi gõ) và server (chấm).
import { toHiragana, toKana, toKatakana } from 'wanakana'

/** Nguyên âm của dòng kana, để đổi ー thành nguyên âm tương ứng. */
const VOWEL_OF: Record<string, string> = {}
for (const [vowel, row] of Object.entries({
  あ: 'あかがさざただなはばぱまやらわぁゃゎ',
  い: 'いきぎしじちぢにひびぴみりぃ',
  う: 'うくぐすずつづぬふぶぷむゆるぅゅ',
  え: 'えけげせぜてでねへべぺめれぇ',
  お: 'おこごそぞとどのほぼぽもよろをぉょ',
})) {
  for (const kana of row) VOWEL_OF[kana] = vowel
}

/** Romaji kiểu Hepburn viết `tch` (kotchi), wanakana chỉ hiểu `cch`. */
function fixRomaji(value: string): string {
  return value.replace(/tch/gi, 'cch')
}

/**
 * Đổi romaji đang gõ thành kana. Giữ các chữ `n`, `ny` ở cuối chưa đổi vì chưa biết là ん hay な, に, にゅ…
 * Không dùng IMEMode của wanakana: chế độ đó đổi `nn` thành ん, nên `minna` ra みんあ.
 */
export function romajiToKanaInput(value: string, mode: 'hiragana' | 'katakana'): string {
  const fixed = fixRomaji(value)
  const trailing = fixed.match(/n+y?$/i)?.[0] ?? '' // `ny` đang gõ dở にゃ, にゅ, にょ
  const head = fixed.slice(0, fixed.length - trailing.length)
  const converted = mode === 'katakana' ? toKatakana(head) : toKana(head.toLowerCase())
  return converted + trailing
}

/**
 * Đổi phần trước con trỏ và giữ con trỏ đúng chỗ. Nếu đổi cả ô rồi gán lại, trình duyệt
 * đưa con trỏ về cuối, nên sửa một chữ ở giữa thì con trỏ nhảy đi.
 */
export function convertAtCaret(
  value: string,
  caret: number,
  mode: 'hiragana' | 'katakana',
): { value: string; caret: number } {
  const before = romajiToKanaInput(value.slice(0, caret), mode)
  return { value: before + value.slice(caret), caret: before.length }
}

/**
 * Dạng so sánh của kana: đưa về Hiragana, ー thành nguyên âm đứng trước, を thành お.
 * Nhờ vậy ノート, のおと và nooto cùng một dạng; きをつけます và kiotsukemasu cùng một dạng.
 */
export function kanaComparisonForm(value: string): string {
  const hiragana = toHiragana(toKana(fixRomaji(value.trim())), { convertLongVowelMark: false })
  let out = ''
  for (const char of hiragana) {
    if (char === 'ー') out += VOWEL_OF[out[out.length - 1]] ?? ''
    else out += char === 'を' ? 'お' : char
  }
  // ティ thường được gõ là ti, wanakana đổi thành チ. づ, ぢ thường được gõ là zu, ji, wanakana đổi thành ず, じ.
  return out.replace(/てぃ/g, 'ち').replace(/づ/g, 'ず').replace(/ぢ/g, 'じ')
}

export function isKanaAnswerCorrect(typed: string, reading: string): boolean {
  return typed.trim().length > 0 && kanaComparisonForm(typed) === kanaComparisonForm(reading)
}

/** Hán Việt: bỏ dấu, không phân biệt hoa thường, gộp khoảng trắng (spec §5.5). */
export function normalizeHanViet(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
}

export function isHanVietAnswerCorrect(typed: string, hanViet: string): boolean {
  return typed.trim().length > 0 && normalizeHanViet(typed) === normalizeHanViet(hanViet)
}
