// Vòng ghép ô ở Stage 5. Pure. Vòng này chỉ để ôn vui: đúng không cộng điểm, ghép sai thì từ ở cột trái bị trừ điểm
// một lần mỗi vòng. Không đổi lịch, không tính giãn cách, không đạt kỹ năng bắt buộc.

import type { Rng } from './questions'
import type { StageWord } from './stage-questions'

export const MATCH_PAIR_COUNT = 6
/** Nghĩa dài quá thì ô không hiển thị nổi trên điện thoại. */
const MAX_TEXT_LENGTH = 40

export type MatchPairType = 'kana_meaning' | 'kanji_meaning' | 'kanji_kana' | 'kanji_hanviet'
const PAIR_TYPES: readonly MatchPairType[] = ['kana_meaning', 'kanji_meaning', 'kanji_kana', 'kanji_hanviet']

export interface MatchCandidate extends StageWord {
  learnerVocabularyId: string
  currentStage: number
  /** Đang chạy Stage 5: được ưu tiên và là từ duy nhất bị trừ điểm. */
  stage5Active: boolean
}

export interface MatchPair {
  learnerVocabularyId: string
  clientEventId: string
  left: string
  right: string
  /** Đọc Kana này khi ghép đúng. */
  reading: string
}

export interface MatchRoundData {
  kind: 'match'
  clientEventId: string
  pairType: MatchPairType
  pairs: MatchPair[]
  /** Thứ tự hiện cột phải, là chỉ số trong `pairs`. Cột trái theo thứ tự của `pairs`. */
  rightOrder: number[]
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function sidesOf(word: MatchCandidate, type: MatchPairType): [string, string] | null {
  // Chỉ dùng Kanji của từ đã xem thẻ Stage 3, để không lộ chữ người học chưa gặp
  const kanjiKnown = !word.is_kana_only && word.currentStage >= 4
  switch (type) {
    case 'kana_meaning':
      return [word.reading_kana, word.meaning_vi]
    case 'kanji_meaning':
      return kanjiKnown ? [word.expression, word.meaning_vi] : null
    case 'kanji_kana':
      return kanjiKnown ? [word.expression, word.reading_kana] : null
    case 'kanji_hanviet':
      return kanjiKnown && word.han_viet ? [word.expression, word.han_viet] : null
  }
}

/**
 * Dựng một vòng: chọn ngẫu nhiên kiểu cặp dùng được, ưu tiên từ đang ở Stage 5.
 * Không có hai ô cùng chữ, để mỗi ô chỉ có đúng một đáp án. Trả null nếu không đủ 6 cặp.
 */
export function buildMatchRound(
  candidates: readonly MatchCandidate[],
  newId: () => string,
  rng: Rng = Math.random,
): MatchRoundData | null {
  const ordered = shuffle(candidates, rng).sort((a, b) => Number(b.stage5Active) - Number(a.stage5Active))
  for (const pairType of shuffle(PAIR_TYPES, rng)) {
    const lefts = new Set<string>()
    const rights = new Set<string>()
    const pairs: MatchPair[] = []
    for (const word of ordered) {
      const sides = sidesOf(word, pairType)
      if (!sides) continue
      const [left, right] = sides
      if (left.length > MAX_TEXT_LENGTH || right.length > MAX_TEXT_LENGTH || lefts.has(left) || rights.has(right)) continue
      lefts.add(left)
      rights.add(right)
      pairs.push({ learnerVocabularyId: word.learnerVocabularyId, clientEventId: newId(), left, right, reading: word.reading_kana })
      if (pairs.length === MATCH_PAIR_COUNT) break
    }
    if (pairs.length === MATCH_PAIR_COUNT) {
      const shuffled = shuffle(pairs, rng)
      return {
        kind: 'match',
        clientEventId: newId(),
        pairType,
        pairs: shuffled,
        rightOrder: shuffle(shuffled.map((_, i) => i), rng),
      }
    }
  }
  return null
}

export interface MatchPenalty {
  learnerVocabularyId: string
  clientEventId: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Không tin trình duyệt: tối đa 6 từ, mỗi từ một lần. */
export function parseMatchPenalties(input: unknown): MatchPenalty[] | null {
  if (!Array.isArray(input) || input.length > MATCH_PAIR_COUNT) return null
  const seen = new Set<string>()
  for (const item of input) {
    const v = item as Record<string, unknown> | null
    if (
      typeof v !== 'object' || v === null ||
      typeof v.learnerVocabularyId !== 'string' || !UUID.test(v.learnerVocabularyId) ||
      typeof v.clientEventId !== 'string' || !UUID.test(v.clientEventId) ||
      seen.has(v.learnerVocabularyId)
    ) {
      return null
    }
    seen.add(v.learnerVocabularyId)
  }
  return (input as MatchPenalty[]).map(({ learnerVocabularyId, clientEventId }) => ({ learnerVocabularyId, clientEventId }))
}
