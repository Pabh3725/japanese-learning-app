// Đề xuất chính sách Kanji cho từng từ. docs/learning-rules.md §6a (RULES_V9). Pure.

import type { JmMatch } from './jmdict'

export const POLICIES = ['KANA_ONLY', 'KANJI_CORE', 'KANJI_DEFERRED', 'KANJI_OPTIONAL'] as const
export type Policy = (typeof POLICIES)[number]
export type Confidence = 'high' | 'medium' | 'low'

export interface ClassifyInput {
  expression: string
  isKanaOnly: boolean
  /** Cấp của từ (5 = N5, 4 = N4). */
  wordLevel: number
  /** Cấp của từng chữ Kanji trong từ; null = chữ chưa có cấp. */
  kanji: { character: string; level: number | null }[]
  /** null = không tìm thấy trong JMdict. */
  jm: JmMatch | null
  /** Tên nguồn cấp chữ, ghi vào cột source. */
  levelSource: string
}

export interface PolicyProposal {
  policy: Policy
  /** Cấp phải học dạng Kanji; null với KANA_ONLY và KANJI_OPTIONAL. */
  targetLevel: number | null
  confidence: Confidence
  reason: string
  source: string
}

const N = (level: number) => `N${level}`

export function classifyWord(input: ClassifyInput): PolicyProposal {
  if (input.isKanaOnly) {
    return { policy: 'KANA_ONLY', targetLevel: null, confidence: 'high', reason: 'Từ không có Kanji', source: 'data' }
  }
  const { jm } = input
  // Chủ dự án chọn 2026-11-10: từ có Kanji đều phải học dạng Kanji. Nhãn "thường viết Kana" của JMdict chỉ ghi chú,
  // không còn đưa từ vào KANJI_OPTIONAL. KANJI_OPTIONAL chỉ còn khi người duyệt tự gắn.
  const jmNote = jm?.usuallyKana ? 'JMdict ghi thường viết bằng Kana' : jm && jm.rareForm.length > 0 ? `JMdict ghi cách viết là ${jm.rareForm.join(', ')}` : null

  // Không có trong JMdict thường là cụm câu (お名前は, から来ました): học dạng Kanji ở cấp của cụm (chủ dự án chọn 2026-11-10)
  if (!jm) {
    return {
      policy: 'KANJI_CORE',
      targetLevel: input.wordLevel,
      confidence: 'medium',
      reason: `Không có trong JMdict (thường là cụm câu): học dạng Kanji ở ${N(input.wordLevel)}`,
      source: 'chủ dự án chọn cho cụm câu',
    }
  }

  // Chữ chưa có cấp coi như khó nhất (N1) và để người duyệt xem lại
  const unknown = input.kanji.filter((k) => k.level === null).map((k) => k.character)
  const levels = input.kanji.map((k) => k.level ?? 1)
  const hardest = Math.min(...levels)
  const target = Math.min(input.wordLevel, hardest)
  const hardChars = input.kanji.filter((k) => (k.level ?? 1) === hardest).map((k) => k.character).join('')
  const source = `JMdict + cấp Kanji (${input.levelSource})`
  const confidence: Confidence = unknown.length > 0 ? 'low' : jmNote ? 'medium' : 'high'
  const notes = [...(unknown.length > 0 ? [`chữ chưa có cấp: ${unknown.join('')}`] : []), ...(jmNote ? [jmNote] : [])]
  const suffix = notes.length > 0 ? `; ${notes.join('; ')}` : ''

  if (target === input.wordLevel) {
    return { policy: 'KANJI_CORE', targetLevel: target, confidence, reason: `Mọi chữ thuộc ${N(input.wordLevel)} hoặc dễ hơn${suffix}`, source }
  }
  return { policy: 'KANJI_DEFERRED', targetLevel: target, confidence, reason: `Có chữ ${hardChars} cấp ${N(target)}, học dạng Kanji ở ${N(target)}${suffix}`, source }
}

/** Kiểm tra một dòng chính sách (đề xuất hoặc người duyệt sửa) có hợp lệ với từ không. Trả lỗi, rỗng = hợp lệ. */
export function policyIssues(row: { policy: string; targetLevel: number | null }, word: { isKanaOnly: boolean; wordLevel: number }): string[] {
  if (!(POLICIES as readonly string[]).includes(row.policy)) return [`policy phải là một trong ${POLICIES.join(', ')}`]
  const issues: string[] = []
  if (word.isKanaOnly !== (row.policy === 'KANA_ONLY')) issues.push(word.isKanaOnly ? 'từ không có Kanji phải là KANA_ONLY' : 'từ có Kanji không được là KANA_ONLY')
  if (row.policy === 'KANA_ONLY' || row.policy === 'KANJI_OPTIONAL') {
    if (row.targetLevel !== null) issues.push(`${row.policy} để trống target_level`)
  } else if (row.targetLevel === null || row.targetLevel < 1 || row.targetLevel > 5) {
    issues.push(`${row.policy} cần target_level từ 1 đến 5`)
  } else if (row.policy === 'KANJI_CORE' && row.targetLevel !== word.wordLevel) {
    issues.push(`KANJI_CORE học ở đúng cấp của từ (N${word.wordLevel})`)
  } else if (row.policy === 'KANJI_DEFERRED' && row.targetLevel >= word.wordLevel) {
    issues.push(`KANJI_DEFERRED phải học ở cấp sau N${word.wordLevel} (số nhỏ hơn)`)
  }
  return issues
}
