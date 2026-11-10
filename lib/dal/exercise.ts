// DAL cho một câu học ở Stage (VOC-04, SCH-01). Server-only: điểm, lịch, stage, card do SERVER tính.
//   1. kiểm tra dữ liệu trình duyệt gửi lên
//   2. requireUser — bạn là ai
//   3. đọc song song lịch của từ ở stage này + nhật ký (earned, câu gần nhất hôm nay)
//   4. lib/learning tính điểm / mở stage sau / hoàn tất; lib/srs tính lịch mới (giờ = giờ server)
//   5. gọi public.submit_stage_exercise — ghi tất cả trong MỘT transaction
// Không có lệnh nào sửa review_cards đã có → không đụng lịch của Card.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { RULES_V9 } from '@/lib/learning/rules'
import { applyStageAttempt, trailingCount, type StageAttemptResult } from '@/lib/learning/stage'
import type { Outcome } from '@/lib/learning/types'
import { studyDate } from '@/lib/learning/time'
import {
  canAnswer,
  deriveEarned,
  deriveLastSeq,
  parseSubmitExerciseRequest,
  parseSubmitExerciseResult,
  rowToSchedule,
  rowToStageState,
  toSubmitStageExerciseParams,
  type StageScheduleRow,
  type SubmitExerciseStatus,
} from '@/lib/exercise/mappers'
import { reviewStageSchedule } from '@/lib/srs/stage-scheduler'

const SCHEDULE_COLUMNS =
  'id, stage_number, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, ' +
  'last_review_at, stage_points, stage_points_today, points_date, unlocked_next_at, completed_at, version, ' +
  'learner_vocabulary!inner(kanji_intro_seen_at, vocabularies!inner(is_kana_only))'

type ScheduleQueryRow = StageScheduleRow & {
  learner_vocabulary: { kanji_intro_seen_at: string | null; vocabularies: { is_kana_only: boolean } }
}

export interface SubmitExerciseResponse {
  /** 'invalid' = trình duyệt gửi dữ liệu sai dạng. Còn lại: kết quả của submit_stage_exercise. */
  status: SubmitExerciseStatus | 'invalid'
  /** Chỉ có khi status = 'saved' — để giao diện hiện phản hồi (+1, mở stage sau…). */
  result?: Pick<StageAttemptResult, 'delta' | 'counted' | 'unlockedStage' | 'completed' | 'cardsCreated'> & {
    points: number
  }
}

export async function submitExercise(input: unknown): Promise<SubmitExerciseResponse> {
  // 1. Không tin trình duyệt
  const req = parseSubmitExerciseRequest(input)
  if (!req) return { status: 'invalid' }

  const user = await requireUser()
  const supabase = await createClient()
  const lvId = req.learnerVocabularyId

  // Giờ trả lời là giờ server, không lấy từ trình duyệt
  const now = new Date()
  const today = studyDate(now)

  // 3. Đọc song song: các truy vấn không phụ thuộc nhau, chờ nối tiếp sẽ làm người học phải đợi lâu.
  const [schedule_, earnedLogs, lastExercise, recentLogs] = await Promise.all([
    // 3a. Lịch (RLS + lọc user_id: chỉ của chính mình)
    supabase
      .from('learner_stage_schedules')
      .select(SCHEDULE_COLUMNS)
      .eq('learner_vocabulary_id', lvId)
      .eq('stage_number', req.stage)
      .eq('user_id', user.id)
      .maybeSingle(),
    // 3b. Q1 — dạng bài đã được +1 ở stage này
    supabase
      .from('exercise_logs')
      .select('exercise_type, points')
      .eq('learner_vocabulary_id', lvId)
      .eq('stage_number', req.stage)
      .gt('points', 0),
    // 3c. Q3 — câu gần nhất của từ hôm nay trong khu Learn, ở mọi stage. Câu Review không tính (V8).
    supabase
      .from('exercise_logs')
      .select('day_seq')
      .eq('learner_vocabulary_id', lvId)
      .eq('study_date', today)
      .eq('source', 'lesson') // câu vòng ghép ô không tính giãn cách
      .order('day_seq', { ascending: false })
      .limit(1),
    // 3d. Các câu gần nhất ở stage này, để biết chuỗi đúng liên tiếp
    supabase
      .from('exercise_logs')
      .select('outcome')
      .eq('learner_vocabulary_id', lvId)
      .eq('stage_number', req.stage)
      .eq('source', 'lesson')
      .order('answered_at', { ascending: false })
      .limit(RULES_V9.completion.correctStreak),
  ])
  if (schedule_.error) throw new Error(`Không đọc được learner_stage_schedules: ${schedule_.error.message}`)
  if (earnedLogs.error) throw new Error(`Không đọc được exercise_logs: ${earnedLogs.error.message}`)
  if (lastExercise.error) throw new Error(`Không đọc được exercise_logs: ${lastExercise.error.message}`)
  if (recentLogs.error) throw new Error(`Không đọc được exercise_logs: ${recentLogs.error.message}`)

  if (!schedule_.data) {
    // Không có lịch: hoặc từ không phải của mình, hoặc stage này chưa mở
    const { data: word, error: wordError } = await supabase
      .from('learner_vocabulary')
      .select('id')
      .eq('id', lvId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (wordError) throw new Error(`Không đọc được learner_vocabulary: ${wordError.message}`)
    return { status: word ? 'stage_changed' : 'not_found' }
  }
  const row = schedule_.data as unknown as ScheduleQueryRow
  if (row.completed_at) return { status: 'stage_changed' }

  const state = rowToStageState(row, {
    earned: deriveEarned(earnedLogs.data ?? []),
    ...deriveLastSeq((lastExercise.data ?? []).map((l) => l.day_seq as number | null), today),
    correctStreak: trailingCount((recentLogs.data ?? []).map((l) => l.outcome as Outcome), 'correct'),
  })
  if (!state) throw new Error(`learner_stage_schedules ${row.id} sai dạng`)

  // Dạng bài không thuộc stage này → giao diện cũ, không tính
  if (!canAnswer(state, req.exercise)) return { status: 'stage_changed' }

  // 4. Engine tính điểm và mốc; bộ lịch tính lần hỏi tới
  const attempt = { exercise: req.exercise, outcome: req.outcome, seq: req.daySeq, now }
  const result = applyStageAttempt(state, attempt)
  const schedule = reviewStageSchedule(rowToSchedule(row), req.outcome, now)

  // 5. Lưu trong một transaction
  const params = toSubmitStageExerciseParams({
    scheduleId: row.id,
    clientEventId: req.clientEventId,
    expectedVersion: row.version,
    attempt,
    result,
    schedule,
    responseMs: req.responseMs,
  })
  const { data: saved, error: rpcError } = await supabase.rpc('submit_stage_exercise', params)
  if (rpcError) throw new Error(`submit_stage_exercise lỗi: ${rpcError.message}`)

  const status = parseSubmitExerciseResult(saved)
  if (status !== 'saved') return { status }
  return {
    status,
    result: {
      delta: result.delta,
      counted: result.counted,
      unlockedStage: result.unlockedStage,
      completed: result.completed,
      // Học lại Stage hoàn tất lần hai thì Card đã có sẵn, không tạo thêm
      cardsCreated: (saved as { cards_created?: number }).cards_created ? result.cardsCreated : [],
      points: result.state.points,
    },
  }
}
