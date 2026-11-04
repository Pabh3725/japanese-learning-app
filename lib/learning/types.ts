// Kiểu dữ liệu dùng chung cho engine luật học (ENG-02).
// Nguồn: docs/learning-rules.md (RULES_V2).

/** Kết quả chấm một câu: đúng (không gợi ý), đúng nhờ gợi ý, sai. */
export type Outcome = 'correct' | 'hint' | 'wrong'

export type Stage = 1 | 2 | 3 | 4 | 5

/** S1 Meaning · S2 Kana · S3 Kanji · S4 Hán Việt */
export type Skill = 'S1' | 'S2' | 'S3' | 'S4'

/** Cách trả lời: chọn đáp án, ghép mảnh, gõ. */
export type ExerciseKind = 'choice' | 'assembly' | 'typing'

export type ExerciseCode =
  // Stage 2 (và củng cố ở Stage 4)
  | 'kana_to_meaning'
  | 'meaning_to_kana'
  | 'kana_assembly'
  | 'listening'
  // Stage 4
  | 'kanji_recognition'
  | 'kanji_assembly'
  | 'hanviet_recognition'
  | 'hanviet_assembly'
  // Stage 5
  | 'meaning_assembly'
  | 'meaning_recognition_6'
  | 'kana_free_recall'
  | 'kanji_assembly_nohint'
  | 'kanji_recognition_6'
  | 'hanviet_free_recall'

export type CardType =
  | 'vocab.meaning_kana'
  | 'vocab.kana_hanviet'
  | 'vocab.meaning_kanji'
  | 'vocab.kanji_meaning_hanviet'
  | 'vocab.meaning_hanviet'

export type Rating = 'Again' | 'Hard' | 'Good' | 'Easy'

export type CardStatus = 'active' | 'suspended' | 'retired'

/** Ngày học dạng 'YYYY-MM-DD' theo giờ Việt Nam. */
export type StudyDate = string
