// Kiểu dữ liệu dùng chung cho engine luật học (ENG-02).
// Nguồn: docs/learning-rules.md (RULES_V9).

/** Kết quả chấm một câu: đúng (không gợi ý), đúng nhờ gợi ý, sai. */
export type Outcome = 'correct' | 'hint' | 'wrong'

/** Từ vựng Kana: 1 → 2 → 3. Từ vựng Kanji: 4 → 5 → 6. */
export type Stage = 1 | 2 | 3 | 4 | 5 | 6

/** Stage có điểm và lịch riêng. Stage 1 và 4 chỉ có xem. */
export type ScoredStage = 2 | 3 | 5 | 6

/** S1 Meaning · S2 Kana · S3 Kanji · S4 Hán Việt */
export type Skill = 'S1' | 'S2' | 'S3' | 'S4'

/** Cách trả lời: chọn đáp án, ghép mảnh, gõ, tự chấm. */
export type ExerciseKind = 'choice' | 'assembly' | 'typing' | 'self'

export type ExerciseCode =
  // Stage 2
  | 'kana_to_meaning'
  | 'meaning_to_kana'
  | 'kana_assembly'
  | 'listening'
  // Stage 5
  | 'hanviet_from_kana'
  | 'kanji_char_meaning'
  | 'listening_kanji'
  | 'kanji_recognition'
  | 'kanji_assembly'
  | 'hanviet_recognition'
  | 'hanviet_assembly'
  // Stage 3 và 6
  | 'meaning_assembly'
  | 'meaning_recognition_6'
  | 'kana_free_recall'
  | 'kanji_assembly_nohint'
  | 'kanji_recognition_6'
  | 'hanviet_free_recall'
  // Review, Card Kanji
  | 'kanji_read_typing'
  | 'kanji_write_self'

export type CardType =
  /** Mọi từ: nghĩa → gõ Kana. */
  | 'vocab.kana'
  /** Từ có Kanji: nhìn Kanji → gõ Kana và Hán Việt; nhìn nghĩa → viết rồi tự chấm. */
  | 'vocab.kanji'
  /** Card riêng của từ có sao, chạy song song với lộ trình chính. */
  | 'vocab.star_recall'

export type Rating = 'Again' | 'Hard' | 'Good'

/** suspended: từ đã đánh dấu là đã biết, hoặc Card riêng của từ đã bỏ sao. */
export type CardStatus = 'active' | 'suspended'

/** Ngày học dạng 'YYYY-MM-DD' theo giờ Việt Nam. */
export type StudyDate = string
