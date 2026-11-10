// Cấp của từng kỹ năng: học xong mục mới của cấp thì app hỏi, đồng ý mới mở cấp sau. Pure.

export const SKILLS = ['vocabulary', 'word_kanji', 'kanji'] as const
export type LearnSkill = (typeof SKILLS)[number]

export const FIRST_LEVEL = 5

export function isLearnSkill(value: unknown): value is LearnSkill {
  return SKILLS.includes(value as LearnSkill)
}

/** Mục có thuộc phạm vi cấp đang học không. Cấp số nhỏ là khó hơn; chưa có cấp thì coi là khó nhất. */
export function inLevel(itemLevel: number | null, currentLevel: number): boolean {
  return (itemLevel ?? 1) >= currentLevel
}

/** Cấp kế tiếp có mục để học, hoặc null nếu đã hết. */
export function nextLevel(currentLevel: number, levelsInData: readonly (number | null)[]): number | null {
  const below = levelsInData.map((level) => level ?? 1).filter((level) => level < currentLevel)
  return below.length > 0 ? Math.max(...below) : null
}

export function levelLabel(level: number): string {
  return `N${level}`
}
