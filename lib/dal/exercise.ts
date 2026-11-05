// DAL cho một câu học ở Stage (VOC-04). Server-only: điểm, stage, card do SERVER tính.
//   1. kiểm tra dữ liệu trình duyệt gửi lên
//   2. requireUser — bạn là ai
//   3. đọc trạng thái từ: learner_vocabulary + suy ra từ nhật ký (earned, câu gần nhất hôm nay)
//   4. lib/learning (ENG-02) tính điểm / qua stage / card cần tạo (giờ = giờ server)
//   5. gọi public.submit_exercise — ghi nhật ký + tiến độ + card mới trong MỘT transaction
// Không có lệnh nào sửa review_cards đã có → không đụng due_at.
// Giao diện (VOC-02, REV-02…) gọi hàm này qua một Server Function.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { applyStageAttempt, type StageAttemptResult } from '@/lib/learning/stage'
import { studyDate } from '@/lib/learning/time'
import {
  canAnswer,
  deriveEarned,
  deriveLastSeq,
  parseSubmitExerciseRequest,
  parseSubmitExerciseResult,
  rowToWordState,
  toSubmitExerciseParams,
  type LearnerVocabularyRow,
  type SubmitExerciseStatus,
} from '@/lib/exercise/mappers'

const WORD_COLUMNS =
  'id, current_stage, learning_status, stage_points, stage_points_today, points_date, version, ' +
  'vocabularies!inner(is_kana_only)'

type WordQueryRow = LearnerVocabularyRow & { vocabularies: { is_kana_only: boolean } }

export interface SubmitExerciseResponse {
  /** 'invalid' = trình duyệt gửi dữ liệu sai dạng. Còn lại: kết quả của submit_exercise. */
  status: SubmitExerciseStatus | 'invalid'
  /** Chỉ có khi status = 'saved' — để giao diện hiện phản hồi (+1, lên stage…). */
  result?: Pick<StageAttemptResult, 'delta' | 'counted' | 'passedStage' | 'cardsCreated'> & {
    stage: StageAttemptResult['state']['stage']
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

  // 3a. Đọc từ (RLS + lọc user_id: chỉ từ của chính mình)
  const { data, error } = await supabase
    .from('learner_vocabulary')
    .select(WORD_COLUMNS)
    .eq('id', lvId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return { status: 'not_found' }
  const row = data as unknown as WordQueryRow

  // Giờ trả lời là giờ server, không lấy từ trình duyệt
  const now = new Date()
  const today = studyDate(now)

  // 3b. Q1 — dạng bài đã được +1 ở stage hiện tại
  const { data: earnedLogs, error: earnedError } = await supabase
    .from('exercise_logs')
    .select('exercise_type, points')
    .eq('learner_vocabulary_id', lvId)
    .eq('stage_number', row.current_stage)
    .gt('points', 0)
  if (earnedError) throw new Error(`Không đọc được exercise_logs: ${earnedError.message}`)

  // 3c. Q3 — câu gần nhất của từ hôm nay: câu học VÀ câu review
  const { data: lastExercise, error: lastExerciseError } = await supabase
    .from('exercise_logs')
    .select('day_seq')
    .eq('learner_vocabulary_id', lvId)
    .eq('study_date', today)
    .order('day_seq', { ascending: false })
    .limit(1)
  if (lastExerciseError) throw new Error(`Không đọc được exercise_logs: ${lastExerciseError.message}`)

  const { data: lastReview, error: lastReviewError } = await supabase
    .from('review_logs')
    .select('day_seq, review_cards!inner(learner_vocabulary_id)')
    .eq('review_cards.learner_vocabulary_id', lvId)
    .eq('study_date', today)
    .not('day_seq', 'is', null)
    .order('day_seq', { ascending: false })
    .limit(1)
  if (lastReviewError) throw new Error(`Không đọc được review_logs: ${lastReviewError.message}`)

  const state = rowToWordState(row, {
    isKanaOnly: row.vocabularies.is_kana_only,
    earned: deriveEarned(earnedLogs ?? []),
    ...deriveLastSeq([...(lastExercise ?? []), ...(lastReview ?? [])].map((l) => l.day_seq as number | null), today),
  })
  if (!state) throw new Error(`learner_vocabulary ${lvId} sai dạng`)

  // Từ đã sang stage khác / đã học xong / đang ở Stage giới thiệu → giao diện cũ, không tính
  if (!canAnswer(state, req.exercise)) return { status: 'stage_changed' }
  const stageBefore = state.stage as 2 | 4 | 5

  // 4. Engine ENG-02 tính
  const attempt = { exercise: req.exercise, outcome: req.outcome, seq: req.daySeq, now }
  const result = applyStageAttempt(state, attempt)

  // 5. Lưu trong một transaction
  const params = toSubmitExerciseParams({
    learnerVocabularyId: lvId,
    clientEventId: req.clientEventId,
    expectedVersion: row.version,
    stageBefore,
    attempt,
    result,
    responseMs: req.responseMs,
  })
  const { data: saved, error: rpcError } = await supabase.rpc('submit_exercise', params)
  if (rpcError) throw new Error(`submit_exercise lỗi: ${rpcError.message}`)

  const status = parseSubmitExerciseResult(saved)
  if (status !== 'saved') return { status }
  return {
    status,
    result: {
      delta: result.delta,
      counted: result.counted,
      passedStage: result.passedStage,
      cardsCreated: result.cardsCreated,
      stage: result.state.stage,
      points: result.state.points,
    },
  }
}
