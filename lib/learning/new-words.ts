

/** Các giới hạn khối lượng trong Settings. Khoảng cho phép: docs/PROJECT_SPEC.md §18.5. */
export const STUDY_LIMITS = {
  lesson_size: { label: 'Questions per lesson', hint: 'Each Learn lesson has this many questions, including quick checks.', min: 20, max: 100 },
  learn_cap: { label: 'Learn questions per day', hint: 'Shared by Vocabulary, Kanji words and Kanji learning. Quick checks and Kanji cards do not count.', min: 20, max: 1000 },
  review_cap: { label: 'Vocabulary cards per day', hint: 'Review · Vocabulary. Extra cards move to the next day.', min: 10, max: 500 },
  word_kanji_review_cap: { label: 'Kanji word cards per day', hint: 'Review · Kanji words. Extra cards move to the next day.', min: 10, max: 500 },
  review_session_size: { label: 'Cards per review session', hint: 'Review · Vocabulary and Kanji words. After a session you can start the next one.', min: 10, max: 100 },
  unlock_threshold: { label: 'Cards before pausing new words', hint: 'New words pause when this many cards are due.', min: 0, max: 500 },
  kanji_new_per_day: { label: 'New Kanji per day', hint: 'Counts Kanji already opened today. New ones pause when questions need the room.', min: 0, max: 50 },
  kanji_cap: { label: 'Kanji learning questions per day', hint: 'Questions for Kanji still in the Learning stage (4 sittings). Counts toward Learn questions per day. New Kanji pause when they need the room.', min: 10, max: 500 },
  kanji_review_cap: { label: 'Kanji cards per day', hint: 'Review cards for Kanji you have finished learning, shown in Learn lessons. Do not count toward Learn questions per day. Extra cards move to the next day.', min: 10, max: 500 },
  grammar_new_per_day: { label: 'New grammar patterns per day', hint: 'Day 1: intro, examples, Intro 1 and 2. Day 2: Intro 3. Then reviews. Each step is a set of 5 questions.', min: 1, max: 10 },
  grammar_review_cap: { label: 'Grammar patterns to review per day', hint: 'Each pattern due gets 4 questions of different types, grouped into sets of 5. Extra patterns move to the next day.', min: 5, max: 50 },
} as const

export type StudyLimitKey = keyof typeof STUDY_LIMITS

export function isValidStudyLimit(key: unknown, value: unknown): key is StudyLimitKey {
  if (typeof key !== 'string' || !Object.hasOwn(STUDY_LIMITS, key) || !Number.isInteger(value)) return false
  const { min, max } = STUDY_LIMITS[key as StudyLimitKey]
  return (value as number) >= min && (value as number) <= max
}
