// V12: các loại thẻ của từng khu và từng Stage (docs/learning-rules-v12.md §4–6). Pure.

/** Loại mục. Bộ thủ và chữ cùng thuộc khu Kanji. */
export type Area = 'kana' | 'radical' | 'kanji' | 'word_kanji'
/** Ba khu học (§1). */
export type Zone = 'kana' | 'kanji' | 'word_kanji'
export const ZONES: readonly Zone[] = ['kana', 'kanji', 'word_kanji']
export const zoneOf = (area: Area): Zone => (area === 'radical' ? 'kanji' : area)

export type Stage = 1 | 2 | 3
/** Trả lời: chọn trong nhiều đáp án, ghép mảnh, hay gõ. */
export type AnswerKind = 'choice' | 'assembly' | 'typing'

export const CARD_TYPES = {
  // Từ vựng Kana (§4)
  kana_meaning: { kind: 'choice', label: 'Kana → meaning' },
  meaning_kana: { kind: 'choice', label: 'Meaning → Kana' },
  listen_kana: { kind: 'choice', label: 'Listen → Kana' },
  meaning_type_kana: { kind: 'typing', label: 'Meaning → type Kana' },
  listen_type_kana: { kind: 'typing', label: 'Listen → type Kana' },
  // Bộ thủ (§5.1)
  radical_hanviet: { kind: 'choice', label: 'Radical → name' },
  radical_meaning: { kind: 'choice', label: 'Radical → meaning' },
  hanviet_radical: { kind: 'choice', label: 'Name → radical' },
  meaning_radical: { kind: 'choice', label: 'Meaning → radical' },
  // Chữ Kanji (§5.2)
  kanji_hanviet: { kind: 'choice', label: 'Kanji → Sino-Vietnamese' },
  kanji_meaning: { kind: 'choice', label: 'Kanji → meaning' },
  hanviet_kanji: { kind: 'choice', label: 'Sino-Vietnamese → Kanji' },
  meaning_kanji: { kind: 'choice', label: 'Meaning → Kanji' },
  kanji_type_hanviet: { kind: 'typing', label: 'Kanji → type Sino-Vietnamese' },
  kanji_similar: { kind: 'choice', label: 'Tell look-alikes apart' },
  // Từ vựng Kanji (§6)
  word_hanviet: { kind: 'choice', label: 'Word → Sino-Vietnamese' },
  word_meaning: { kind: 'choice', label: 'Word → meaning' },
  hanviet_word: { kind: 'choice', label: 'Sino-Vietnamese → word' },
  meaning_word: { kind: 'choice', label: 'Meaning → word' },
  word_type_hanviet: { kind: 'typing', label: 'Word → type Sino-Vietnamese' },
  // Chủ dự án chốt 2026-11-26: Từ vựng Kanji trọng tâm Hán Việt
  meaning_hanviet: { kind: 'choice', label: 'Meaning → Sino-Vietnamese' },
  meaning_type_hanviet: { kind: 'typing', label: 'Meaning → type Sino-Vietnamese' },
  // Chủ dự án chốt 2026-11-19: ghép chữ chỉ còn ở Từ vựng Kanji (Intro 2), bỏ ghép Kana
  word_assembly: { kind: 'assembly', label: 'Build the word in Kanji' },
} as const satisfies Record<string, { kind: AnswerKind; label: string }>

export type CardType = keyof typeof CARD_TYPES
export const kindOf = (type: CardType): AnswerKind => CARD_TYPES[type].kind

/**
 * Loại thẻ theo Stage. Bộ thủ không có Stage 3 (§5.1).
 * Chủ dự án chốt 2026-11-22: mỗi Stage một chiều riêng, bỏ câu trùng giữa các Stage —
 * Stage 1 nhận ra (nhìn chữ / từ → Hán Việt, nghĩa), Stage 2 nhớ lại (Hán Việt, nghĩa, âm → chọn chữ / từ), Stage 3 tự viết ra (gõ).
 */
export const STAGE_TYPES: Record<Area, Record<Stage, readonly CardType[]>> = {
  kana: {
    // Chủ dự án chốt 2026-11-26 (lần 3): Intro 1 Kana → nghĩa (2 điểm); Intro 2 nghĩa → Kana (2 điểm) · nghe → Kana (1 điểm)
    1: ['kana_meaning'],
    2: ['meaning_kana', 'listen_kana'],
    // Chủ dự án chốt 2026-11-24: bớt câu nghe — bỏ "nghe → gõ Kana", câu nghe chỉ còn ở Stage 2
    3: ['meaning_type_kana'],
  },
  radical: {
    1: ['radical_hanviet', 'radical_meaning'],
    2: ['hanviet_radical', 'meaning_radical'],
    3: [],
  },
  // Chủ dự án chốt 2026-11-26 (lần 3): Intro 1 mỗi loại 2 điểm; Intro 2 bỏ "nghĩa → chọn chữ", phân biệt chữ giống chuyển
  // từ Intro 3 lên Intro 2; Intro 3 chỉ còn gõ Hán Việt
  kanji: {
    1: ['kanji_hanviet', 'kanji_meaning'],
    2: ['hanviet_kanji', 'kanji_similar'],
    3: ['kanji_type_hanviet'],
  },
  // Chủ dự án chốt 2026-11-26: trọng tâm Hán Việt, bỏ ghép chữ. Intro 1 từ → Hán Việt · từ → nghĩa; Intro 2 nghĩa → Hán Việt ·
  // Hán Việt → từ; Intro 3 nghĩa (kèm cách đọc) → gõ Hán Việt. Không hỏi cách đọc (đã học ở khu Kana), chỉ hiện để nhắc lại
  word_kanji: {
    1: ['word_hanviet', 'word_meaning'],
    2: ['meaning_hanviet', 'hanviet_word'],
    3: ['meaning_type_hanviet'],
  },
}

/**
 * Điểm cần của một loại thẻ (§3.1): Stage 1 cần 2 điểm (chủ dự án chốt 2026-11-26, lần 3), riêng bộ thủ vẫn đúng 1 lần;
 * Stage 2–3 cần 2 điểm, riêng "nghe → chọn Kana" 1 điểm.
 */
export function passFor(area: Area, stage: Stage, type: CardType): number {
  if (type === 'listen_kana') return 1
  if (stage === 1 && area === 'radical') return 1
  return 2
}

/**
 * Xong Stage 1 thì Stage 2 bắt đầu ngay trong ngày (2026-11-26): chỉ còn bộ thủ. Các khu khác Stage 2 từ ngày học kế tiếp
 * (chủ dự án chốt 2026-11-26, lần 3).
 */
export const stage2SameDay = (area: Area) => area === 'radical'

/** Stage cuối của loại mục: xong Stage này thì tạo Card. */
export const lastStage = (area: Area): Stage => (area === 'radical' ? 2 : 3)

/**
 * Loại thẻ của mục ở Stage này. `kanji_similar` chỉ có khi chữ có cặp gần giống đã duyệt (§5.2).
 */
export function typesFor(area: Area, stage: Stage, opts: { hasSimilar?: boolean } = {}): CardType[] {
  return STAGE_TYPES[area][stage].filter((t) => t !== 'kanji_similar' || opts.hasSimilar === true)
}

/** Card Review (§3.3–6): mỗi Card gồm các phần trên cùng một thẻ; sai một phần là sai cả Card. */
export const REVIEW_CARDS = {
  // Chủ dự án chốt 2026-11-22: Từ vựng Kana còn 1 Card (bỏ "Kana → chọn nghĩa"); bộ thủ không còn Card ôn.
  // Card cũ của hai loại đã bỏ vẫn nằm trong item_cards nhưng không được đọc (isReviewCard).
  kana_type: { area: 'kana', parts: ['type_kana'], label: 'Meaning → type Kana' },
  kanji: { area: 'kanji', parts: ['type_hanviet', 'choose_meaning'], label: 'Kanji' },
  // Chủ dự án chốt 2026-11-19: bỏ gõ Kana khỏi Card Từ vựng Kanji (cách đọc vẫn hiện và đọc to sau khi chấm)
  word_kanji: { area: 'word_kanji', parts: ['type_hanviet', 'choose_meaning'], label: 'Kanji word' },
} as const satisfies Record<string, { area: Area; parts: readonly string[]; label: string }>

export type ReviewCardType = keyof typeof REVIEW_CARDS
export type ReviewPart = (typeof REVIEW_CARDS)[ReviewCardType]['parts'][number]

/** Card tạo khi mục xong Stage cuối: Từ vựng Kana, chữ Kanji, Từ vựng Kanji mỗi mục 1 Card; bộ thủ không có Card (2026-11-22). */
/** Loại Card còn dùng (lọc Card cũ đã bỏ khi đọc item_cards). */
export const isReviewCard = (type: string): type is ReviewCardType => Object.hasOwn(REVIEW_CARDS, type)

export function reviewCardsFor(area: Area): ReviewCardType[] {
  return (Object.keys(REVIEW_CARDS) as ReviewCardType[]).filter((c) => REVIEW_CARDS[c].area === area)
}
