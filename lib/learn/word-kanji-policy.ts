// V9 §6a — chính sách Kanji của từ quyết định khi nào mở Stage 4. Pure. Server kiểm tra lại trong open_word_kanji.

export type KanjiPolicy = 'KANA_ONLY' | 'KANJI_CORE' | 'KANJI_DEFERRED' | 'KANJI_OPTIONAL'

export interface WordPolicy {
  /** null = chưa seed chính sách: dùng cấp JLPT của từ như gói 2. */
  policy: KanjiPolicy | null
  targetLevel: number | null
  /** Cấp JLPT của từ. */
  wordLevel: number
  isKanaOnly: boolean
}

/** Cấp phải học dạng Kanji của từ, hoặc null nếu không tự mở theo cấp. */
export function kanjiTargetLevel(word: WordPolicy): number | null {
  if (word.isKanaOnly) return null
  if (word.policy === null) return word.wordLevel
  return word.policy === 'KANJI_CORE' || word.policy === 'KANJI_DEFERRED' ? word.targetLevel : null
}

/** Từ có thể mở Stage 4 ở cấp Từ vựng Kanji `learnerLevel` không (chưa xét Stage 3). Cấp số nhỏ là khó hơn. */
export function kanjiAllowed(word: WordPolicy, learnerLevel: number, optedIn: boolean): boolean {
  if (word.isKanaOnly || word.policy === 'KANA_ONLY') return false
  if (word.policy === 'KANJI_OPTIONAL') return optedIn
  const target = kanjiTargetLevel(word)
  return target !== null && target >= learnerLevel
}

/** Vì sao từ đã xong Stage 3 mà chưa mở Stage 4. Dùng cho trang chi tiết từ. */
export type KanjiWait = 'none' | 'kana_only' | 'optional' | 'next_level'

export function kanjiWait(word: WordPolicy, learnerLevel: number, optedIn: boolean): KanjiWait {
  if (word.isKanaOnly || word.policy === 'KANA_ONLY') return 'kana_only'
  if (kanjiAllowed(word, learnerLevel, optedIn)) return 'none'
  return word.policy === 'KANJI_OPTIONAL' ? 'optional' : 'next_level'
}
