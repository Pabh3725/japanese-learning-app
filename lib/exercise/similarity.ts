// Độ giống nhau để chọn đáp án nhiễu khó hơn. Pure.

/** Các nhóm Kanji dễ nhầm vì trông giống nhau. Bảng kanji chưa có dữ liệu bộ thủ nên liệt kê tay. */
const LOOKALIKE_GROUPS = [
  '人入八', '大犬太天夫', '日目白百自', '木本未末', '土士工', '千干', '午牛年', '右石古', '左友在',
  '学字子', '休体', '見貝買', '田町男', '山出', '川州', '水氷永', '口中', '上下', '先生', '小少',
  '夕多名', '今会', '国図', '読語話', '校交', '書昼', '聞門間', '電雷', '車東', '母毎', '西四',
  '金全', '立音', '明暗', '方万', '兄元', '東北', '林森', '食飲', '行待', '店広', '同回', '肉内',
] as const

const LOOKALIKE = new Map<string, Set<string>>()
for (const group of LOOKALIKE_GROUPS) {
  for (const char of group) {
    const set = LOOKALIKE.get(char) ?? new Set<string>()
    for (const other of group) if (other !== char) set.add(other)
    LOOKALIKE.set(char, set)
  }
}

export function lookalikeKanji(char: string): readonly string[] {
  return [...(LOOKALIKE.get(char) ?? [])]
}

const KANJI = /[一-鿿㐀-䶿]/

/** Hai cách viết giống nhau bao nhiêu: chung chữ, có chữ dễ nhầm, cùng số chữ Kanji. */
export function kanjiSimilarity(a: string, b: string): number {
  const charsA = Array.from(a).filter((c) => KANJI.test(c))
  const charsB = Array.from(b).filter((c) => KANJI.test(c))
  let score = charsA.length === charsB.length ? 1 : 0
  for (const char of charsA) {
    if (charsB.includes(char)) score += 3
    else if (charsB.some((other) => LOOKALIKE.get(char)?.has(other))) score += 3
  }
  return score
}

/** Bỏ dấu ゛゜và đưa Katakana về Hiragana: が và か, ぱ và は, カ và か được coi là gần nhau. */
function baseKana(value: string): string {
  return Array.from(value.normalize('NFD'))
    .filter((c) => c !== '゙' && c !== '゚')
    .map((c) => (c >= 'ァ' && c <= 'ヶ' ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c))
    .join('')
}

function editDistance(a: readonly string[], b: readonly string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

/** Hai cách đọc gần nhau bao nhiêu, từ 0 tới khoảng 8: ít khác chữ, cùng độ dài, cùng đầu hoặc cùng cuối. */
export function kanaSimilarity(a: string, b: string): number {
  const charsA = Array.from(baseKana(a))
  const charsB = Array.from(baseKana(b))
  const longest = Math.max(charsA.length, charsB.length)
  let score = 5 * (1 - editDistance(charsA, charsB) / longest)
  if (charsA.length === charsB.length) score += 1
  if (charsA[0] === charsB[0]) score += 1
  if (charsA[charsA.length - 1] === charsB[charsB.length - 1]) score += 1
  return score
}
