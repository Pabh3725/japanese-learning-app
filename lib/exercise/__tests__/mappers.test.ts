// VOC-04 — Test phần chuyển đổi database ↔ engine, và nghiệm thu bằng một "database giả"
// trong bộ nhớ: mỗi câu đi đủ vòng  đọc → engine → tham số RPC → ghi lại  như ở server thật.
import { describe, expect, it } from 'vitest'
import { applyStageAttempt } from '../../learning/stage'
import { studyDate } from '../../learning/time'
import type { ExerciseCode, Outcome } from '../../learning/types'
import {
  deriveEarned,
  deriveLastSeq,
  parseSubmitExerciseRequest,
  parseSubmitExerciseResult,
  rowToWordState,
  toSubmitExerciseParams,
  type LearnerVocabularyRow,
} from '../mappers'

const vn = (local: string) => new Date(local.replace(' ', 'T') + ':00+07:00')
const LV = '11111111-1111-4111-8111-111111111111'
const EV = '22222222-2222-4222-8222-222222222222'

const row = (over: Partial<LearnerVocabularyRow> = {}): LearnerVocabularyRow => ({
  id: LV,
  current_stage: 2,
  learning_status: 'learning',
  stage_points: 0,
  stage_points_today: 0,
  points_date: null,
  version: 0,
  ...over,
})
const noCtx = { isKanaOnly: false, earned: [], lastSeq: null, lastSeqDate: null }

describe('parseSubmitExerciseRequest — không tin trình duyệt', () => {
  const ok = { learnerVocabularyId: LV, clientEventId: EV, exercise: 'kana_to_meaning', outcome: 'correct', daySeq: 7 }

  it('dữ liệu đúng → giữ đúng các trường cho phép', () => {
    expect(parseSubmitExerciseRequest({ ...ok, responseMs: 1500, stagePoints: 999 })).toEqual({ ...ok, responseMs: 1500 })
  })

  const bad: [string, Record<string, unknown>][] = [
    ['id không phải uuid', { learnerVocabularyId: 'abc' }],
    ['dạng bài lạ', { exercise: 'free_points' }],
    ['kết quả lạ', { outcome: 'perfect' }],
    ['daySeq = 0', { daySeq: 0 }],
    ['daySeq không nguyên', { daySeq: 2.5 }],
    ['responseMs âm', { responseMs: -1 }],
  ]
  it.each(bad)('%s → null', (_name, patch) => {
    expect(parseSubmitExerciseRequest({ ...ok, ...patch })).toBe(null)
  })

  it('không phải object → null', () => {
    expect(parseSubmitExerciseRequest(null)).toBe(null)
    expect(parseSubmitExerciseRequest('x')).toBe(null)
  })
})

describe('rowToWordState — dòng database → trạng thái của engine', () => {
  it('đọc stage, điểm, trần ngày', () => {
    const s = rowToWordState(row({ current_stage: 4, stage_points: -2, stage_points_today: 1, points_date: '2026-11-05' }), noCtx)!
    expect(s).toMatchObject({ stage: 4, points: -2, plusToday: 1, plusDate: '2026-11-05' })
  })

  it('đã hoàn thành vòng đầu → stage "complete"', () => {
    expect(rowToWordState(row({ current_stage: 5, learning_status: 'initial_complete' }), noCtx)!.stage).toBe('complete')
  })

  it('stage ngoài 1–5 → null (không đoán)', () => {
    expect(rowToWordState(row({ current_stage: 7 }), noCtx)).toBe(null)
  })
})

describe('deriveEarned (Q1) và deriveLastSeq (Q3)', () => {
  it('chỉ lấy dạng bài từng được +1, không trùng, bỏ mã lạ', () => {
    const logs = [
      { exercise_type: 'kana_to_meaning', points: 1 },
      { exercise_type: 'meaning_to_kana', points: 0 },
      { exercise_type: 'kana_assembly', points: -1 },
      { exercise_type: 'kana_to_meaning', points: 1 },
      { exercise_type: 'old_v6_choice', points: 1 },
    ]
    expect(deriveEarned(logs)).toEqual(['kana_to_meaning'])
  })

  it('câu gần nhất = số lớn nhất của cả câu học lẫn câu review', () => {
    expect(deriveLastSeq([3, null, 12, 8], '2026-11-05')).toEqual({ lastSeq: 12, lastSeqDate: '2026-11-05' })
    expect(deriveLastSeq([], '2026-11-05')).toEqual({ lastSeq: null, lastSeqDate: null })
  })
})

describe('toSubmitExerciseParams — kết quả engine → tham số RPC', () => {
  it('qua Stage 4 lúc 23:30 giờ VN → card mới hạn 00:00 hôm sau (giờ VN)', () => {
    const now = vn('2026-11-05 23:30')
    const state = {
      ...rowToWordState(row({ current_stage: 4, stage_points: 4 }), noCtx)!,
      earned: ['kanji_recognition', 'kanji_assembly', 'hanviet_recognition'] as ExerciseCode[],
    }
    const attempt = { exercise: 'hanviet_assembly' as const, outcome: 'correct' as const, seq: 9, now }
    const result = applyStageAttempt(state, attempt)
    const p = toSubmitExerciseParams({ learnerVocabularyId: LV, clientEventId: EV, expectedVersion: 3, stageBefore: 4, attempt, result })

    expect(p).toMatchObject({
      p_stage_number: 4,
      p_points: 1,
      p_counted: true,
      p_study_date: '2026-11-05',
      p_day_seq: 9,
      p_new_stage: 5,
      p_completed: false,
      p_stage_points: 0,
      p_expected_version: 3,
    })
    expect(p.p_new_card_types).toEqual(['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet'])
    expect(p.p_new_cards_due_at).toBe(vn('2026-11-06 00:00').toISOString())
  })

  it('chưa qua stage → không có card, không có hạn', () => {
    const now = vn('2026-11-05 20:00')
    const attempt = { exercise: 'kana_to_meaning' as const, outcome: 'wrong' as const, seq: 1, now }
    const result = applyStageAttempt(rowToWordState(row(), noCtx)!, attempt)
    const p = toSubmitExerciseParams({ learnerVocabularyId: LV, clientEventId: EV, expectedVersion: 0, stageBefore: 2, attempt, result })
    expect(p).toMatchObject({ p_points: -1, p_new_stage: 2, p_new_card_types: [], p_new_cards_due_at: null })
  })
})

describe('parseSubmitExerciseResult', () => {
  it('đọc trạng thái đã biết, lạ thì báo lỗi', () => {
    expect(parseSubmitExerciseResult({ status: 'stage_changed' })).toBe('stage_changed')
    expect(() => parseSubmitExerciseResult({ status: 'ok' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Nghiệm thu VOC-04 bằng database giả (mô phỏng đúng việc submit_exercise ghi)
// ---------------------------------------------------------------------------

interface FakeDb {
  row: LearnerVocabularyRow
  isKanaOnly: boolean
  logs: { stage_number: number; exercise_type: string; points: number; study_date: string; day_seq: number }[]
  reviewSeqs: { study_date: string; day_seq: number }[]
  cards: string[]
}

function fakeDb(over: Partial<LearnerVocabularyRow> = {}, isKanaOnly = false): FakeDb {
  return { row: row(over), isKanaOnly, logs: [], reviewSeqs: [], cards: [] }
}

/** Đúng các bước của lib/dal/exercise.ts, nhưng đọc/ghi vào FakeDb. */
function answer(db: FakeDb, exercise: ExerciseCode, outcome: Outcome, seq: number, now: Date) {
  const today = studyDate(now)
  const state = rowToWordState(db.row, {
    isKanaOnly: db.isKanaOnly,
    earned: deriveEarned(db.logs.filter((l) => l.stage_number === db.row.current_stage)),
    ...deriveLastSeq(
      [...db.logs, ...db.reviewSeqs].filter((l) => l.study_date === today).map((l) => l.day_seq),
      today,
    ),
  })!
  const attempt = { exercise, outcome, seq, now }
  const result = applyStageAttempt(state, attempt)
  const p = toSubmitExerciseParams({
    learnerVocabularyId: LV,
    clientEventId: EV,
    expectedVersion: db.row.version,
    stageBefore: state.stage as 2 | 4 | 5,
    attempt,
    result,
  })
  // Những gì submit_exercise ghi:
  db.logs.push({ stage_number: p.p_stage_number, exercise_type: p.p_exercise_type, points: p.p_points, study_date: p.p_study_date, day_seq: p.p_day_seq })
  db.row = {
    ...db.row,
    current_stage: p.p_new_stage,
    learning_status: p.p_completed ? 'initial_complete' : db.row.learning_status,
    stage_points: p.p_stage_points,
    stage_points_today: p.p_stage_points_today,
    points_date: p.p_points_date,
    version: db.row.version + 1,
  }
  for (const c of p.p_new_card_types) if (!db.cards.includes(c)) db.cards.push(c)
  return result
}

describe('Nghiệm thu VOC-04', () => {
  const day1 = vn('2026-11-05 20:00')
  const day2 = vn('2026-11-06 20:00')

  it('đúng 5 câu liên tiếp cùng một từ → chỉ +1 (spam không được cộng)', () => {
    const db = fakeDb()
    for (let seq = 1; seq <= 5; seq++) answer(db, 'kana_to_meaning', 'correct', seq, day1)
    expect(db.row.stage_points).toBe(1)
    expect(db.logs.map((l) => l.points)).toEqual([1, 0, 0, 0, 0])
    expect(db.logs).toHaveLength(5) // vẫn ghi đủ nhật ký
  })

  it('câu review xen giữa cũng tính vào khoảng cách (Q3)', () => {
    const db = fakeDb()
    answer(db, 'kana_to_meaning', 'correct', 1, day1) // +1
    db.reviewSeqs.push({ study_date: '2026-11-05', day_seq: 5 }) // review card khác của cùng từ ở câu 5
    // Câu 7: cách câu học số 1 là 5 câu, nhưng chỉ cách câu review số 5 có 1 câu → không tính
    const r = answer(db, 'meaning_to_kana', 'correct', 7, day1)
    expect(r.counted).toBe(false)
    expect(db.row.stage_points).toBe(1)
  })

  it('学校 qua Stage 2 sau 2 ngày → sang Stage 3, tạo đúng card nghĩa–hira', () => {
    const db = fakeDb()
    answer(db, 'kana_to_meaning', 'correct', 1, day1)
    answer(db, 'meaning_to_kana', 'correct', 6, day1)
    answer(db, 'kana_to_meaning', 'correct', 11, day1)
    answer(db, 'meaning_to_kana', 'correct', 16, day1) // chạm trần 3/ngày → 0
    expect(db.row).toMatchObject({ current_stage: 2, stage_points: 3, stage_points_today: 3 })

    answer(db, 'kana_to_meaning', 'correct', 1, day2) // 4
    const r = answer(db, 'kana_assembly', 'correct', 6, day2) // 5 + đủ 3 dạng bắt buộc
    expect(r.passedStage).toBe(2)
    expect(db.row).toMatchObject({ current_stage: 3, stage_points: 0 })
    expect(db.cards).toEqual(['vocab.meaning_kana'])
  })

  it('"refresh vẫn thấy điểm": đọc lại từ dữ liệu đã lưu cho đúng trạng thái engine đang có', () => {
    const db = fakeDb()
    answer(db, 'kana_to_meaning', 'correct', 1, day1)
    answer(db, 'kana_assembly', 'correct', 6, day1)
    const reloaded = rowToWordState(db.row, {
      isKanaOnly: false,
      earned: deriveEarned(db.logs.filter((l) => l.stage_number === db.row.current_stage)),
      ...deriveLastSeq(db.logs.map((l) => l.day_seq), '2026-11-05'),
    })!
    expect(reloaded).toMatchObject({ stage: 2, points: 2, plusToday: 2, lastSeq: 6 })
    expect([...reloaded.earned].sort()).toEqual(['kana_assembly', 'kana_to_meaning'])
  })

  it('テレビ (chỉ Kana) qua Stage 5 → hoàn thành, không tạo thêm card', () => {
    const db = fakeDb({ current_stage: 5, stage_points: 4 }, true)
    db.cards.push('vocab.meaning_kana')
    answer(db, 'meaning_recognition_6', 'correct', 1, day1) // S1, điểm 5 nhưng thiếu S2
    expect(db.row.current_stage).toBe(5)
    const r = answer(db, 'kana_free_recall', 'correct', 6, day1) // S2 → đủ
    expect(r.passedStage).toBe(5)
    expect(db.row.learning_status).toBe('initial_complete')
    expect(db.cards).toEqual(['vocab.meaning_kana'])
  })
})
