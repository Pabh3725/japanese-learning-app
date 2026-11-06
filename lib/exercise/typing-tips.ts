// Mẹo gõ Kana hiện cùng kết quả của câu gõ. Pure. Mẹo chỉ nói về những chữ có trong từ đang hỏi.
// Test đối chiếu chuỗi gõ với romajiToKanaInput trên toàn bộ từ, để mẹo không bao giờ dạy cách gõ không ra chữ.
import { toRomaji } from 'wanakana'

const SMALL_KANA = 'ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ'
const COMBINED = new RegExp(`[^${SMALL_KANA}][${SMALL_KANA}]`)
/** ん đứng trước nguyên âm hoặc hàng や: gõ n sẽ thành な, に, にゃ… */
const N_BEFORE_VOWEL = /[んン][あいうえおやゆよアイウエオヤユヨ]/

/** Âm ngoại lai: toRomaji đọc ファ thành fua và ティ thành tei, gõ lại sẽ ra フア, テイ. */
const FOREIGN_SOUNDS: Record<string, string> = {
  ファ: 'fa',
  フィ: 'fi',
  フェ: 'fe',
  フォ: 'fo',
  ティ: 'thi',
  ディ: 'dhi',
  ウィ: 'wi',
  ウェ: 'we',
  シェ: 'she',
  ジェ: 'je',
  チェ: 'che',
}
const FOREIGN = new RegExp(Object.keys(FOREIGN_SOUNDS).join('|'), 'g')

export interface TypingTip {
  /** Chuỗi gõ đúng ra từ này, ví dụ ko-hi-. */
  typed: string
  /** Các chữ cần chú ý trong từ. Rỗng nếu từ chỉ gồm chữ thường. */
  rules: string[]
}

/** Romaji gõ ra đúng từ này trong ô nhập: ー là dấu gạch ngang, ん trước nguyên âm là n'. */
export function typedRomaji(reading: string): string {
  return reading
    .split(FOREIGN)
    .map((part) => part.split('ー').map((piece) => toRomaji(piece)).join('-'))
    .reduce((typed, part, i) => typed + (FOREIGN_SOUNDS[reading.match(FOREIGN)?.[i - 1] ?? ''] ?? '') + part)
}

export function typingTip(reading: string): TypingTip {
  const rules: string[] = []
  if (reading.includes('ー')) rules.push('Chữ ー gõ bằng dấu gạch ngang (-).')
  if (/[っッ]/.test(reading)) rules.push('Chữ っ gõ bằng cách lặp phụ âm đứng sau nó, ví dụ kk, tt, ss.')
  if (N_BEFORE_VOWEL.test(reading)) rules.push("Chữ ん đứng trước nguyên âm hoặc y thì gõ n', ví dụ hon'ya.")
  const combined = reading.match(COMBINED)?.[0]
  if (combined) rules.push(`Âm ghép như ${combined} gõ liền: ${typedRomaji(combined)}.`)
  if (reading.includes('を')) rules.push('Chữ を gõ là wo.')
  return { typed: typedRomaji(reading), rules }
}
