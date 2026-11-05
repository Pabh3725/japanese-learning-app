// VOC-04, SCH-01 — Test phần chuyển đổi database ↔ engine, và nghiệm thu bằng một "database giả"
// trong bộ nhớ: mỗi câu đi đủ vòng  đọc → engine + lịch → tham số RPC → ghi lại  như ở server thật.
import { describe, expect, it } from 'vitest'
import { applyStageAttempt } from '../../learning/stage'
import { studyDate } from '../../learning/time'
import type { ExerciseCode, Outcome } from '../../learning/types'
import { newStageSchedule, reviewStageSchedule } from '../../srs/stage-scheduler'
import {
  deriveEarned,
  deriveLastSeq,
  parseSubmitExerciseRequest,
  parseSubmitExerciseResult,
  rowToSchedule,
  rowToStageState,
  toSubmitStageExerciseParams,
  type StageScheduleRow,
} from '../mappers'

const vn = (local: string) => new Date(local.replace(' ', 'T') + ':00+07:00')
const LV = '11111111-1111-4111-8111-111111111111'
const EV = '22222222-2222-4222-8222-222222222222'
const SCH = '33333333-3333-4333-8333-333333333333'

const row = (over: Partial<StageScheduleRow> = {}): StageScheduleRow => ({
  id: SCH,
  stage_number: 2,
  state: 0,
  due_at: '2026-11-05T13:00:00.000Z',
  stability: 0,
  difficulty: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  last_review_at: null,
  stage_points: 0,
  stage_points_today: 0,
  points_date: null,
  unlocked_next_at: null,
  completed_at: null,
  version: 0,
  ...over,
})
const noCtx = { isKanaOnly: false, earned: [], lastSeq: null, lastSeqDate: null }

describe('parseSubmitExerciseRequest — không tin trình duyệt', () => {
  const ok = { learnerVocabularyId: LV, stage: 2, clientEventId: EV, exercise: 'kana_to_meaning', outcome: 'correct', daySeq: 7 }

  it('dữ liệu đúng → giữ đúng các trường cho phép', () => {
    expect(parseSubmitExerciseRequest({ ...ok, responseMs: 1500, stagePoints: 999 })).toEqual({ ...ok, responseMs: 1500 })
  })

  const bad: [string, Record<string, unknown>][] = [
    ['id không phải uuid', { learnerVocabularyId: 'abc' }],
    ['thiếu stage', { stage: undefined }],
    ['stage không tính điểm', { stage: 3 }],
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

describe('rowToStageState và rowToSchedule — dòng database → engine, lịch', () => {
  it('đọc stage, điểm, trần ngày, trạng thái đã mở', () => {
    const s = rowToStageState(
      row({ stage_number: 4, stage_points: -2, stage_points_today: 1, points_date: '2026-11-05', unlocked_next_at: '2026-11-05T13:00:00Z' }),
      noCtx,
    )!
    expect(s).toMatchObject({ stage: 4, points: -2, plusToday: 1, plusDate: '2026-11-05', unlockedNext: true })
  })

  it('stage không tính điểm → null (không đoán)', () => {
    expect(rowToStageState(row({ stage_number: 3 }), noCtx)).toBe(null)
  })

  it('đọc lịch, chuyển chuỗi thời gian thành Date', () => {
    const s = rowToSchedule(row({ state: 2, last_review_at: '2026-11-04T13:00:00.000Z' }))
    expect(s.state).toBe(2)
    expect(s.due.toISOString()).toBe('2026-11-05T13:00:00.000Z')
    expect(s.lastReviewAt?.toISOString()).toBe('2026-11-04T13:00:00.000Z')
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

  it('câu gần nhất = số lớn nhất trong các câu Learn hôm nay', () => {
    expect(deriveLastSeq([3, null, 12, 8], '2026-11-05')).toEqual({ lastSeq: 12, lastSeqDate: '2026-11-05' })
    expect(deriveLastSeq([], '2026-11-05')).toEqual({ lastSeq: null, lastSeqDate: null })
  })
})

describe('toSubmitStageExerciseParams — kết quả engine → tham số RPC', () => {
  const params = (state: ReturnType<typeof rowToStageState>, exercise: ExerciseCode, outcome: Outcome, now: Date) => {
    const attempt = { exercise, outcome, seq: 9, now }
    return toSubmitStageExerciseParams({
      scheduleId: SCH,
      clientEventId: EV,
      expectedVersion: 3,
      attempt,
      result: applyStageAttempt(state!, attempt),
      schedule: reviewStageSchedule(newStageSchedule(now), outcome, now),
    })
  }

  it('hoàn tất Stage 4 lúc 23:30 giờ VN → card mới hạn 00:00 hôm sau, không mở thêm', () => {
    const now = vn('2026-11-05 23:30')
    const state = rowToStageState(row({ stage_number: 4, stage_points: 9, unlocked_next_at: '2026-11-01T00:00:00Z' }), noCtx)
    const p = params(state, 'hanviet_assembly', 'correct', now)
    expect(p).toMatchObject({
      p_schedule_id: SCH,
      p_points: 1,
      p_counted: true,
      p_study_date: '2026-11-05',
      p_day_seq: 9,
      p_stage_points: 10,
      p_expected_version: 3,
      p_completed: true,
      p_unlocked_stage: null,
      p_open_schedule: false,
      p_required_stages: [2, 4, 5],
    })
    expect(p.p_new_card_types).toEqual(['vocab.meaning_kanji', 'vocab.kanji_meaning_hanviet'])
    expect(p.p_new_cards_due_at).toBe(vn('2026-11-06 00:00').toISOString())
  })

  it('từ có Kanji mở Stage 3: chỉ có xem nên không tạo lịch', () => {
    const state = rowToStageState(row({ stage_points: 4 }), { ...noCtx, earned: ['kana_to_meaning', 'meaning_to_kana'] })
    const p = params(state, 'kana_assembly', 'correct', vn('2026-11-05 20:00'))
    expect(p).toMatchObject({ p_unlocked_stage: 3, p_open_schedule: false, p_completed: false, p_new_card_types: [] })
  })

  it('từ chỉ Kana mở Stage 5: có điểm nên phải tạo lịch', () => {
    const state = rowToStageState(row({ stage_points: 4 }), { ...noCtx, isKanaOnly: true, earned: ['kana_to_meaning', 'meaning_to_kana'] })
    const p = params(state, 'kana_assembly', 'correct', vn('2026-11-05 20:00'))
    expect(p).toMatchObject({ p_unlocked_stage: 5, p_open_schedule: true, p_required_stages: [2, 5] })
  })

  it('câu sai → không có card, không có hạn card', () => {
    const p = params(rowToStageState(row(), noCtx), 'kana_to_meaning', 'wrong', vn('2026-11-05 20:00'))
    expect(p).toMatchObject({ p_points: -1, p_stage_points: -1, p_new_card_types: [], p_new_cards_due_at: null })
  })
})

describe('parseSubmitExerciseResult', () => {
  it('đọc trạng thái đã biết, lạ thì báo lỗi', () => {
    expect(parseSubmitExerciseResult({ status: 'stage_changed' })).toBe('stage_changed')
    expect(() => parseSubmitExerciseResult({ status: 'ok' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Nghiệm thu bằng database giả (mô phỏng đúng việc submit_stage_exercise ghi)
// ---------------------------------------------------------------------------

interface FakeDb {
  isKanaOnly: boolean
  currentStage: number
  schedules: Map<number, StageScheduleRow>
  logs: { stage_number: number; exercise_type: string; points: number; study_date: string; day_seq: number }[]
  cards: string[]
  dueBefore: Map<string, Date>
}

function fakeDb(isKanaOnly = false): FakeDb {
  return { isKanaOnly, currentStage: 2, schedules: new Map([[2, row()]]), logs: [], cards: [], dueBefore: new Map() }
}

/** Đúng các bước của lib/dal/exercise.ts, nhưng đọc/ghi vào FakeDb. */
function answer(db: FakeDb, stage: 2 | 4 | 5, exercise: ExerciseCode, outcome: Outcome, seq: number, now: Date) {
  const today = studyDate(now)
  const r = db.schedules.get(stage)!
  const state = rowToStageState(r, {
    isKanaOnly: db.isKanaOnly,
    earned: deriveEarned(db.logs.filter((l) => l.stage_number === stage)),
    ...deriveLastSeq(db.logs.filter((l) => l.study_date === today).map((l) => l.day_seq), today),
  })!
  const attempt = { exercise, outcome, seq, now }
  const result = applyStageAttempt(state, attempt)
  const schedule = reviewStageSchedule(rowToSchedule(r), outcome, now)
  const p = toSubmitStageExerciseParams({ scheduleId: r.id, clientEventId: EV, expectedVersion: r.version, attempt, result, schedule })
  // Những gì submit_stage_exercise ghi:
  db.logs.push({ stage_number: stage, exercise_type: p.p_exercise_type, points: p.p_points, study_date: p.p_study_date, day_seq: p.p_day_seq })
  db.schedules.set(stage, {
    ...r,
    state: p.p_state,
    due_at: p.p_due_at,
    stability: p.p_stability,
    difficulty: p.p_difficulty,
    scheduled_days: p.p_scheduled_days,
    learning_steps: p.p_learning_steps,
    reps: p.p_reps,
    lapses: p.p_lapses,
    last_review_at: p.p_last_review_at,
    stage_points: p.p_stage_points,
    stage_points_today: p.p_stage_points_today,
    points_date: p.p_points_date,
    unlocked_next_at: p.p_unlocked_stage ? attempt.now.toISOString() : r.unlocked_next_at,
    completed_at: p.p_completed ? attempt.now.toISOString() : r.completed_at,
    version: r.version + 1,
  })
  if (p.p_open_schedule) db.schedules.set(5, row({ stage_number: 5 }))
  if (p.p_unlocked_stage) db.currentStage = Math.max(db.currentStage, p.p_unlocked_stage)
  for (const c of p.p_new_card_types) if (!db.cards.includes(c)) db.cards.push(c)
  return { result, params: p }
}

describe('Nghiệm thu SCH-01', () => {
  const day = (n: number) => vn(`2026-11-${String(n).padStart(2, '0')} 20:00`)

  it('đúng 5 câu liên tiếp cùng một từ → chỉ +1 (spam không được cộng)', () => {
    const db = fakeDb()
    for (let seq = 1; seq <= 5; seq++) answer(db, 2, 'kana_to_meaning', 'correct', seq, day(5))
    expect(db.schedules.get(2)!.stage_points).toBe(1)
    expect(db.logs.map((l) => l.points)).toEqual([1, 0, 0, 0, 0])
    expect(db.logs).toHaveLength(5) // vẫn ghi đủ nhật ký
  })

  it('学校: 5 điểm mở Stage 3 nhưng Stage 2 chạy tiếp; 8 điểm mới tạo card', () => {
    const db = fakeDb()
    answer(db, 2, 'kana_to_meaning', 'correct', 1, day(5))
    answer(db, 2, 'meaning_to_kana', 'correct', 6, day(5))
    answer(db, 2, 'kana_assembly', 'correct', 11, day(5))
    answer(db, 2, 'kana_to_meaning', 'correct', 16, day(5)) // chạm trần 3/ngày → 0
    expect(db.schedules.get(2)).toMatchObject({ stage_points: 3, stage_points_today: 3 })

    answer(db, 2, 'kana_to_meaning', 'correct', 1, day(6)) // 4
    const open = answer(db, 2, 'meaning_to_kana', 'correct', 6, day(6)) // 5 + đủ 3 dạng
    expect(open.result.unlockedStage).toBe(3)
    expect(db.currentStage).toBe(3)
    expect(db.schedules.get(2)).toMatchObject({ stage_points: 5, completed_at: null })
    expect(db.cards).toEqual([]) // chưa có card ở mốc 5
    expect(db.schedules.has(4)).toBe(false) // Stage 4 mở khi xem xong Stage 3

    answer(db, 2, 'kana_assembly', 'correct', 11, day(6)) // 6
    answer(db, 2, 'kana_to_meaning', 'correct', 1, day(7)) // 7
    const done = answer(db, 2, 'meaning_to_kana', 'correct', 6, day(7)) // 8
    expect(done.result.completed).toBe(true)
    expect(db.schedules.get(2)!.completed_at).not.toBe(null)
    expect(db.cards).toEqual(['vocab.meaning_kana'])
  })

  it('テレビ: 5 điểm tạo lịch Stage 5; hai stage giữ điểm và lịch riêng', () => {
    const db = fakeDb(true)
    answer(db, 2, 'kana_to_meaning', 'correct', 1, day(5))
    answer(db, 2, 'meaning_to_kana', 'correct', 6, day(5))
    answer(db, 2, 'kana_assembly', 'correct', 11, day(5))
    answer(db, 2, 'kana_to_meaning', 'correct', 1, day(6))
    answer(db, 2, 'meaning_to_kana', 'correct', 6, day(6))
    expect(db.currentStage).toBe(5)
    expect(db.schedules.get(5)).toMatchObject({ stage_points: 0, completed_at: null })

    answer(db, 5, 'meaning_assembly', 'correct', 11, day(6))
    expect(db.schedules.get(5)!.stage_points).toBe(1)
    expect(db.schedules.get(2)!.stage_points).toBe(5) // điểm Stage 2 không đổi
  })

  it('giãn cách tính chung cho cả từ, kể cả câu ở stage khác', () => {
    const db = fakeDb(true)
    db.schedules.set(5, row({ stage_number: 5 }))
    answer(db, 2, 'kana_to_meaning', 'correct', 1, day(5))
    const close = answer(db, 5, 'meaning_assembly', 'correct', 3, day(5)) // chỉ cách 1 câu
    expect(close.result.counted).toBe(false)
  })

  it('lịch không bao giờ vượt 2 ngày; câu hoàn tất vẫn trả về lịch hợp lệ', () => {
    const db = fakeDb()
    for (let d = 1; d <= 20; d++) {
      const { params } = answer(db, 2, 'kana_to_meaning', d % 3 === 0 ? 'hint' : 'correct', 1, vn(`2026-11-${String(d).padStart(2, '0')} 20:00`))
      expect(params.p_scheduled_days).toBeLessThanOrEqual(2)
      if (db.schedules.get(2)!.stage_points >= 8) break
    }
  })

  it('"refresh vẫn thấy điểm": đọc lại từ dữ liệu đã lưu cho đúng trạng thái', () => {
    const db = fakeDb()
    answer(db, 2, 'kana_to_meaning', 'correct', 1, day(5))
    answer(db, 2, 'kana_assembly', 'correct', 6, day(5))
    const reloaded = rowToStageState(db.schedules.get(2)!, {
      isKanaOnly: false,
      earned: deriveEarned(db.logs),
      ...deriveLastSeq(db.logs.map((l) => l.day_seq), '2026-11-05'),
    })!
    expect(reloaded).toMatchObject({ stage: 2, points: 2, plusToday: 2, lastSeq: 6 })
    expect([...reloaded.earned].sort()).toEqual(['kana_assembly', 'kana_to_meaning'])
  })
})
