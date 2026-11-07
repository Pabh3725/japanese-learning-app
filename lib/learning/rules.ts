// RULES_V4 — mọi con số của luật học nằm ở đây, không hard-code chỗ khác.
// Nguồn: docs/learning-rules.md §12. Đổi luật = đổi file này + tăng version.

import type { CardType, ExerciseCode, ExerciseKind, Skill, Stage } from './types'

export const RULES_V4 = {
  version: 4,
  timezone: 'Asia/Ho_Chi_Minh',
  /** Việt Nam không có giờ mùa hè nên dùng độ lệch cố định UTC+7. */
  utcOffsetMinutes: 7 * 60,
  stagePoints: {
    correct: 1,
    hint: 0,
    wrong: -2,
    maxPositivePerStagePerDay: 3,
  },
  /** Hoàn tất stage: các câu gần nhất của stage phải đúng liên tiếp, để từ không xong ngay sau một lần sai. */
  completion: { correctStreak: 3 },
  /** Sai liên tiếp từng này câu ở một stage thì hiện lại thẻ giới thiệu của từ. */
  relearnAfterWrong: 3,
  /** V8: mỗi stage có mốc riêng. Mở stage sau ≠ hoàn tất; stage chạy tiếp tới khi hoàn tất. */
  stageThresholds: {
    2: { unlockNextAt: 6, completeAt: 10 },
    4: { unlockNextAt: 10, completeAt: 15 },
    5: { completeAt: { withKanji: 10, kanaOnly: 10 } },
  },
  /** Các bước trong một stage, đi từ dễ tới khó theo điểm. Tụt dưới mốc thì quay lại bước trước. */
  stageSteps: {
    2: { assemblyFrom: 4 },
    /** 3 điểm: mở thẻ Giới thiệu Hán tự, xem xong mới học tiếp bước 2. */
    4: { kanjiIntroAt: 3, assemblyFrom: 7 },
    /** Khi đã có đủ dạng bắt buộc, tỷ lệ câu trắc nghiệm trong bước ghép. */
    choiceShareInAssembly: 0.2,
    /** Stage 4: trong các câu trắc nghiệm ở bước ghép, tỷ lệ câu nghe chọn Kanji. */
    listeningShareOfChoice: 0.5,
  },
  /** Lịch FSRS của Stage. Không giới hạn thì đúng mọi câu phải hơn 35 năm mới đạt 10 điểm. */
  stageSchedule: { maximumIntervalDays: 2 },
  /** Vòng ghép ô ở Stage 5: đúng không cộng, ghép sai trừ một lần mỗi từ mỗi vòng. */
  matchRound: { wrongPoints: -1 },
  /** Chỉ đếm câu trong khu Learn. Câu Review và câu vòng boss không tính. */
  spacing: { minGap: 4 },
  review: {
    easyMaxMs: 3000,
    easyKinds: ['typing', 'assembly'] as readonly ExerciseKind[],
    cardPoints: { Again: -1, Hard: 0, Good: 1, Easy: 2 },
  },
  practice: {
    cardPoints: { wrong: -1, hint: 0, correct: 1 },
    maxPositivePerCardPerDay: 3,
  },
  retireAt: {
    'vocab.meaning_kana': 30,
    'vocab.kana_hanviet': 40,
  } as Partial<Record<CardType, number>>,
  bossRound: { seconds: 30 },
  /** Khu Kanji, giai đoạn Học: 12 câu trong 4 buổi. */
  kanji: {
    completeAt: 12,
    maxPositivePerDay: 3,
    wrong: -2,
    middleFrom: 3,
    recallFrom: 6,
    questionsPerSitting: 3,
    /** Khoảng cách tới buổi kế tiếp: ngày 1, 2, 3, 5. */
    sittingGaps: [1, 1, 2],
    /** Câu đến hạn vượt trần từ chừng này thì gợi ý chỉnh Settings. */
    overloadFrom: 10,
    /** Phần trần dành cho câu Học khi gợi ý số chữ mới. */
    learningShareOfCap: 0.7,
  },
  /** Học lại Stage: còn thiếu từng này điểm so với mốc hoàn tất. */
  relearn: { pointsToComplete: 3 },
  defaults: { newPerDay: 5, stageCap: 200, reviewCap: 120, unlockThreshold: 80, kanjiNewPerDay: 10, kanjiCap: 100 },
  borrow: { maxDaysAhead: 1 },
} as const

/** Thông tin từng dạng bài: cách trả lời và Skill mà nó kiểm tra. */
export const EXERCISES: Record<ExerciseCode, { kind: ExerciseKind; skill: Skill }> = {
  kana_to_meaning: { kind: 'choice', skill: 'S1' },
  meaning_to_kana: { kind: 'choice', skill: 'S2' },
  kana_assembly: { kind: 'assembly', skill: 'S2' },
  listening: { kind: 'choice', skill: 'S2' },
  listening_kanji: { kind: 'choice', skill: 'S3' },
  kanji_recognition: { kind: 'choice', skill: 'S3' },
  kanji_char_meaning: { kind: 'choice', skill: 'S3' },
  kanji_assembly: { kind: 'assembly', skill: 'S3' },
  hanviet_from_kana: { kind: 'choice', skill: 'S4' },
  hanviet_recognition: { kind: 'choice', skill: 'S4' },
  hanviet_assembly: { kind: 'assembly', skill: 'S4' },
  meaning_assembly: { kind: 'assembly', skill: 'S1' },
  meaning_recognition_6: { kind: 'choice', skill: 'S1' },
  kana_free_recall: { kind: 'typing', skill: 'S2' },
  kanji_assembly_nohint: { kind: 'assembly', skill: 'S3' },
  kanji_recognition_6: { kind: 'choice', skill: 'S3' },
  hanviet_free_recall: { kind: 'typing', skill: 'S4' },
}

/** Dạng bài được phép xuất hiện ở mỗi Stage tính điểm. */
export const STAGE_EXERCISES: Record<2 | 4 | 5, readonly ExerciseCode[]> = {
  2: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly', 'listening'],
  // Stage 4: 6 dạng chính + câu củng cố Kana/Meaning (chỉ còn để nhận câu từ màn hình đã mở trước khi đổi luật)
  4: [
    'hanviet_from_kana',
    'kanji_char_meaning',
    'listening_kanji',
    'kanji_recognition',
    'kanji_assembly',
    'hanviet_recognition',
    'hanviet_assembly',
    'kana_to_meaning',
    'meaning_to_kana',
    'listening',
  ],
  5: [
    'meaning_assembly',
    'meaning_recognition_6',
    'kana_free_recall',
    'kanji_assembly_nohint',
    'kanji_recognition_6',
    'hanviet_free_recall',
    'hanviet_recognition',
    'hanviet_assembly',
  ],
}

/** Yêu cầu bắt buộc để mở stage sau ở Stage 2 và 4 (mỗi dạng ≥ 1 lần được +1). */
export const REQUIRED_EXERCISES: Record<2 | 4, readonly ExerciseCode[]> = {
  2: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'],
  4: ['hanviet_from_kana', 'kanji_recognition', 'hanviet_recognition', 'kanji_char_meaning', 'hanviet_assembly', 'kanji_assembly'],
}

/** Stage 5 yêu cầu theo Skill. */
export const REQUIRED_SKILLS_STAGE5 = {
  withKanji: ['S1', 'S2', 'S3', 'S4'] as readonly Skill[],
  kanaOnly: ['S1', 'S2'] as readonly Skill[],
}

/** Card được tạo khi hoàn tất mỗi Stage (từ có Kanji). */
export const CARDS_ON_PASS: Record<Stage, readonly CardType[]> = {
  1: [],
  2: ['vocab.meaning_kana'],
  3: ['vocab.kana_hanviet'],
  4: ['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet'],
  5: ['vocab.meaning_hanviet'],
}
