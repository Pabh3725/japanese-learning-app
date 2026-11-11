// RULES_V9 — mọi con số của luật học nằm ở đây, không hard-code chỗ khác.
// Nguồn: docs/learning-rules.md §12. Đổi luật = đổi file này + tăng version.

import type { CardType, ExerciseCode, ExerciseKind, ScoredStage, Skill, Stage } from './types'

export const RULES_V9 = {
  version: 9,
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
    3: { completeAt: 10 },
    5: { unlockNextAt: 10, completeAt: 15 },
    6: { completeAt: 10 },
  },
  /** Các bước trong một stage, đi từ dễ tới khó theo điểm. Tụt dưới mốc thì quay lại bước trước. */
  stageSteps: {
    2: { assemblyFrom: 4, hanVietShare: 0.15 },
    5: { mixedFrom: 3, assemblyFrom: 7 },
    /** Khi đã có đủ dạng bắt buộc, tỷ lệ câu trắc nghiệm trong bước ghép. */
    choiceShareInAssembly: 0.2,
    /** Stage 5: trong các câu trắc nghiệm ở bước ghép, tỷ lệ câu nghe chọn Kanji. */
    listeningShareOfChoice: 0.5,
  },
  /** Lịch FSRS của Stage. Không giới hạn thì đúng mọi câu phải hơn 35 năm mới đạt 10 điểm. */
  stageSchedule: { maximumIntervalDays: 2 },
  /** Vòng ghép ô ở Stage 3: đúng không cộng, ghép sai trừ một lần mỗi từ mỗi vòng. */
  matchRound: { wrongPoints: -1 },
  /** Chỉ đếm câu trong khu Learn. Câu Review và câu vòng boss không tính. */
  spacing: { minGap: 4 },
  /** Lịch FSRS của Card và phần ôn Kanji: đúng liên tục cũng không cách quá 90 ngày. */
  reviewSchedule: { maximumIntervalDays: 90 },
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
  /** V9 R7: bài Learn. Câu kiểm tra nhanh tính vào số câu của bài nhưng không tính vào ngân sách ngày. */
  lesson: { defaultQuestions: 50, minQuestions: 20, maxQuestions: 100 },
  /** V9 R11: Adaptive Interleaving Scheduler. Mọi khoảng cách đếm bằng câu tính điểm (câu Stage, câu Học Kanji). */
  ais: {
    firstRecallGap: [4, 6],
    secondRecallGap: [8, 12],
    wrongRecheckAfter: 2,
    maxPerItemPerLesson: 6,
    maxItemsInLadder: 2,
    introduceEvery: 5,
    minDueShare: 0.4,
    minGroupShare: 0.15,
    topK: 3,
    priority: { ladderDue: 100, recheck: 150, perOverdueDay: 10, maxOverdue: 100, dueToday: 1, intro: 20, star: 5 },
    /** Câu học thêm của từ có sao: tối đa mỗi bài, và cách nhau ít nhất từng này câu tính điểm. */
    starPerLesson: 3,
    starEvery: 10,
  },
  defaults: { newPerDay: 5, learnCap: 200, lessonSize: 50, reviewCap: 120, unlockThreshold: 80, kanjiNewPerDay: 10, kanjiCap: 100, wordKanjiReviewCap: 60, kanjiReviewCap: 60 },
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
  kanji_read_typing: { kind: 'typing', skill: 'S2' },
  kanji_write_self: { kind: 'self', skill: 'S3' },
}

/** Dạng bài được phép xuất hiện ở mỗi Stage tính điểm. */
export const STAGE_EXERCISES: Record<ScoredStage, readonly ExerciseCode[]> = {
  // Từ vựng Kana. Câu Hán Việt chỉ hỏi nhẹ, không bắt buộc.
  2: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly', 'listening', 'hanviet_from_kana'],
  3: ['meaning_assembly', 'meaning_recognition_6', 'kana_free_recall'],
  // Từ vựng Kanji
  5: ['hanviet_from_kana', 'kanji_char_meaning', 'listening_kanji', 'kanji_recognition', 'kanji_assembly', 'hanviet_recognition', 'hanviet_assembly'],
  6: ['kanji_assembly_nohint', 'kanji_recognition_6', 'hanviet_free_recall', 'hanviet_recognition', 'hanviet_assembly'],
}

/** Yêu cầu bắt buộc để mở stage sau ở Stage 2 và 5 (mỗi dạng ≥ 1 lần được +1). */
export const REQUIRED_EXERCISES: Record<2 | 5, readonly ExerciseCode[]> = {
  2: ['kana_to_meaning', 'meaning_to_kana', 'kana_assembly'],
  5: ['hanviet_from_kana', 'kanji_recognition', 'hanviet_recognition', 'kanji_char_meaning', 'hanviet_assembly', 'kanji_assembly'],
}

/** Stage 3 và 6 yêu cầu theo Skill. */
export const REQUIRED_SKILLS: Record<3 | 6, readonly Skill[]> = {
  3: ['S1', 'S2'],
  6: ['S3', 'S4'],
}

/** Card được tạo khi hoàn tất mỗi Stage. Mỗi từ tối đa 2 Card. Card Kana tạo ở Stage 3 để không ôn trùng lúc Stage 3 còn luyện. */
export const CARDS_ON_PASS: Record<Stage, readonly CardType[]> = {
  1: [],
  2: [],
  3: ['vocab.kana'],
  4: [],
  5: [],
  6: ['vocab.kanji'],
}
