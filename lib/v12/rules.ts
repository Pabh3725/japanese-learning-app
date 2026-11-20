// RULES_V12 — mọi con số của luật học V12 nằm ở đây (docs/learning-rules-v12.md). Pure.

export const RULES_V12 = {
  version: 12,
  /** §3.1: điểm theo loại thẻ. */
  /** Stage 2 và 3: 2 điểm mỗi loại thẻ (chủ dự án chốt 2026-11-20, trước là 3); Stage 1: đúng 1 lần. */
  points: { correct: 1, wrong: -1, floor: 0, pass: 2, passStage1: 1 },
  /** §3.1: số lần gặp một loại thẻ mỗi ngày (Stage 2–3): đúng thì 2, có sai thì tối đa 3. */
  perDay: { shows: 2, maxShows: 3 },
  /** §3.1–3.2: sai thì hỏi lại sau chừng này thẻ. Hai lần gặp cùng loại thẻ trong ngày cũng cách ít nhất chừng này. */
  retryAfter: 5,
  /** §3.2: Stage 1 — loại thứ nhất ngay sau thẻ giới thiệu, loại thứ hai sau 5 thẻ, các loại sau cách nhau 10 thẻ. */
  stage1Gaps: { first: 0, second: 5, rest: 10 },
  /** §3.3: Card sai được hỏi lại trong phiên sau 3–5 thẻ, tối đa 3 lần. */
  reviewRetry: { min: 3, max: 5, maxTimes: 3 },
  /** §2: số thẻ mỗi set. */
  set: { default: 20, min: 10, max: 100 },
  /** §2: trần mỗi khu mỗi ngày (số câu, không tính thẻ giới thiệu). */
  caps: { kana: 120, kanji: 100, word_kanji: 80, min: 10, max: 1000 },
  /** §5.1: bộ thủ được học khi có trong ít nhất chừng này chữ N5–N4. */
  radicals: { minKanji: 2 },
  /** §8.1: thời gian ước tính (giây). */
  seconds: { intro: 15, choice: 6, typing: 12, card: 15 },
  /** §8.1: số lần ôn mỗi Card trong 60 ngày đầu. */
  reviewsPerCard: 4,
  /** §8.1: sau chừng này ngày học thì dùng thời gian trả lời thật. */
  realTimeAfterDays: 14,
  /** §2: dự báo vượt trần. */
  forecastDays: 7,
  /** §8.2: mục tiêu mặc định. */
  balance: { defaultMinutes: 20, defaultItems: 10 },
  /** Kế hoạch §7.2: câu học thêm của từ có sao, tối đa mỗi set, không tính điểm. */
  starPerSet: 2,
} as const
