// DAL cho một lần ôn (SRS-03). Server-only: lịch và điểm do SERVER tính, không tin trình duyệt.
//   1. requireUser — bạn là ai
//   2. đọc card (+ từ chỉ có Kana? từ có bị loại?)
//   3. lib/srs tính lịch + điểm mới (giờ ôn = giờ server)
//   4. gọi public.submit_review — cập nhật card + ghi nhật ký trong MỘT transaction
// Giao diện (REV-02) gọi hàm này qua một Server Function.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import type { ReviewAnswer } from '@/lib/learning/scoring'
import { studyDate } from '@/lib/learning/time'
import { createScheduler, type ReviewCard } from '@/lib/srs/scheduler'
import {
  parseSubmitReviewResult,
  rowToReviewCard,
  toSubmitReviewParams,
  type ReviewCardRow,
  type SubmitReviewStatus,
} from '@/lib/srs/mappers'

const scheduler = createScheduler() // production: fuzz bật

const CARD_COLUMNS =
  'id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, ' +
  'last_review_at, card_points, retired_at, practice_points_today, practice_points_date, version, ' +
  'learner_vocabulary!inner(vocabulary_id, vocabularies!inner(is_kana_only))'

export interface SubmitReviewRequest {
  cardId: string
  /** Mã riêng cho MỖI lần bấm, do trình duyệt tạo (crypto.randomUUID()). Gửi lại → cùng mã. */
  clientEventId: string
  answer: ReviewAnswer
  /** Vị trí câu trong ngày (SES-01 cung cấp; chưa có thì bỏ trống). Ngày học do SERVER tính (SRS-04). */
  daySeq?: number
}

export interface SubmitReviewResponse {
  status: SubmitReviewStatus
  /** Card sau khi lưu — chỉ có khi status = 'saved'. */
  card?: ReviewCard
}

type CardQueryRow = ReviewCardRow & {
  learner_vocabulary: { vocabulary_id: string; vocabularies: { is_kana_only: boolean } }
}

export async function submitReview(req: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const user = await requireUser()
  const supabase = await createClient()

  // 2. Đọc card (RLS + lọc user_id: chỉ card của chính mình)
  const { data, error } = await supabase
    .from('review_cards')
    .select(CARD_COLUMNS)
    .eq('id', req.cardId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được review_cards: ${error.message}`)
  if (!data) return { status: 'not_found' }
  const row = data as unknown as CardQueryRow

  const { data: exclusion, error: exclusionError } = await supabase
    .from('learner_vocabulary_exclusions')
    .select('vocabulary_id')
    .eq('user_id', user.id)
    .eq('vocabulary_id', row.learner_vocabulary.vocabulary_id)
    .not('excluded_at', 'is', null)
    .maybeSingle()
  if (exclusionError) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${exclusionError.message}`)

  const card = rowToReviewCard(row, {
    isKanaOnly: row.learner_vocabulary.vocabularies.is_kana_only,
    excluded: exclusion !== null,
  })
  if (!card) throw new Error(`Card ${req.cardId} sai dạng (thiếu card_type?)`)
  if (card.points.status !== 'active') return { status: 'not_active' }

  // 3. Tính lịch + điểm. Giờ ôn và ngày học là của SERVER, không lấy từ trình duyệt (SRS-04).
  const now = new Date()
  const result = scheduler.reviewCard(card, req.answer, now)

  // 4. Lưu trong một transaction
  const params = toSubmitReviewParams({
    cardId: req.cardId,
    clientEventId: req.clientEventId,
    expectedVersion: row.version,
    answer: req.answer,
    result,
    studyDate: studyDate(now),
    daySeq: req.daySeq,
  })
  const { data: saved, error: rpcError } = await supabase.rpc('submit_review', params)
  if (rpcError) throw new Error(`submit_review lỗi: ${rpcError.message}`)

  const status = parseSubmitReviewResult(saved)
  return status === 'saved' ? { status, card: result.card } : { status }
}
