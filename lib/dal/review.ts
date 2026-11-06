// DAL cho một lần ôn (SRS-03). Server-only: lịch và điểm do SERVER tính, không tin trình duyệt.
//   1. requireUser — bạn là ai
//   2. đọc card (+ từ chỉ có Kana? từ có bị loại?)
//   3. lib/srs tính lịch + điểm mới (giờ ôn = giờ server)
//   4. gọi public.submit_review — cập nhật card + ghi nhật ký trong MỘT transaction
// Giao diện (REV-02) gọi submitReviewAnswer qua một Server Function.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { randomUUID } from 'node:crypto'
import { loadPools } from '@/lib/dal/stage-session'
import { buildReviewQuestion, chooseReviewExercise, reviewExercises } from '@/lib/exercise/review-questions'
import { gradeStageAnswer, wordReveal, type QuestionData, type StageWord, type WordReveal } from '@/lib/exercise/stage-questions'
import { EXERCISES, RULES_V4 } from '@/lib/learning/rules'
import type { ReviewAnswer } from '@/lib/learning/scoring'
import { nextStudyDayStart, studyDate } from '@/lib/learning/time'
import type { CardType, ExerciseCode, Outcome } from '@/lib/learning/types'
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

const PAGE = 1000
/** Số card mỗi phiên, khoảng 5 phút. Làm xong có thể ôn tiếp nếu còn card. */
const CARDS_PER_ROUND = 20
const DAY_MS = 86_400_000
const WORD_COLUMNS = 'id, expression, reading_kana, meaning_vi, han_viet, is_kana_only, emoji, romaji'

type DueCardRow = {
  id: string
  card_type: CardType
  due_at: string
  learner_vocabulary: {
    vocabulary_id: string
    current_stage: number
    kanji_intro_seen_at: string | null
    vocabularies: StageWord
  }
}

async function readReviewCap(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<number> {
  const { data, error } = await supabase.from('learner_settings').select('review_cap').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  return data?.review_cap ?? RULES_V4.defaults.reviewCap
}

async function countReviewedToday(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('review_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('study_date', studyDate(new Date()))
  if (error) throw new Error(`Không đọc được review_logs: ${error.message}`)
  return count ?? 0
}

async function readExcludedIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('learner_vocabulary_exclusions')
    .select('vocabulary_id')
    .eq('user_id', userId)
    .not('excluded_at', 'is', null)
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${error.message}`)
  return new Set(data?.map((r) => r.vocabulary_id))
}

export interface ReviewOverview {
  /** Số card còn được ôn hôm nay, sau khi áp trần mỗi ngày. */
  dueNow: number
  /** Card đến hạn nhưng vượt trần hôm nay, dời sang hôm sau. */
  deferred: number
  reviewedToday: number
  dueTomorrow: number
  dueIn3Days: number
  dueThisWeek: number
  byType: Record<CardType, number>
}

export async function getReviewOverview(): Promise<ReviewOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const [cap, reviewedToday, excludedIds] = await Promise.all([
    readReviewCap(supabase, user.id),
    countReviewedToday(supabase, user.id),
    readExcludedIds(supabase, user.id),
  ])

  // Mỗi từ có tới 5 card, nên số dòng có thể vượt 1000 mỗi lần của Data API
  const rows: { card_type: CardType; due_at: string; learner_vocabulary: { vocabulary_id: string } }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('review_cards')
      .select('card_type, due_at, learner_vocabulary!inner(vocabulary_id)')
      .eq('user_id', user.id)
      .is('retired_at', null)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được review_cards: ${error.message}`)
    rows.push(...((data ?? []) as unknown as typeof rows))
    if ((data?.length ?? 0) < PAGE) break
  }

  const active = rows.filter((r) => !excludedIds.has(r.learner_vocabulary.vocabulary_id))
  const now = Date.now()
  const startOfTomorrow = nextStudyDayStart(new Date()).getTime()
  const before = (ms: number) => active.filter((r) => Date.parse(r.due_at) < ms).length
  const due = active.filter((r) => Date.parse(r.due_at) <= now).length
  const dueNow = Math.min(due, Math.max(0, cap - reviewedToday))

  const byType: ReviewOverview['byType'] = {
    'vocab.meaning_kana': 0,
    'vocab.kana_hanviet': 0,
    'vocab.meaning_kanji': 0,
    'vocab.kanji_meaning_hanviet': 0,
    'vocab.meaning_hanviet': 0,
  }
  for (const row of active) byType[row.card_type]++

  return {
    dueNow,
    deferred: due - dueNow,
    reviewedToday,
    dueTomorrow: before(startOfTomorrow + DAY_MS) - before(startOfTomorrow),
    dueIn3Days: before(startOfTomorrow + 3 * DAY_MS) - before(startOfTomorrow),
    dueThisWeek: before(startOfTomorrow + 7 * DAY_MS) - before(startOfTomorrow),
    byType,
  }
}

export type ReviewQuestion = QuestionData & {
  cardId: string
  /** Mã cho lần nộp câu này, cấp ở server. */
  clientEventId: string
  /** Thông tin từ khi trả lời sai. Câu chọn đã có đáp án ở trình duyệt nên gửi sẵn. */
  reveal?: WordReveal
}

export interface ReviewSessionData {
  questions: ReviewQuestion[]
  /** Đã ôn đủ trần hôm nay. */
  capReached: boolean
}

/** Card quá hạn lâu nhất trước, không vượt trần mỗi ngày. */
export async function getReviewSession(): Promise<ReviewSessionData> {
  const user = await requireUser()
  const supabase = await createClient()
  const [cap, reviewedToday, excludedIds] = await Promise.all([
    readReviewCap(supabase, user.id),
    countReviewedToday(supabase, user.id),
    readExcludedIds(supabase, user.id),
  ])
  const remaining = Math.max(0, cap - reviewedToday)
  if (remaining === 0) return { questions: [], capReached: true }

  const { data, error } = await supabase
    .from('review_cards')
    .select(`id, card_type, due_at, learner_vocabulary!inner(vocabulary_id, current_stage, kanji_intro_seen_at, vocabularies!inner(${WORD_COLUMNS}))`)
    .eq('user_id', user.id)
    .is('retired_at', null)
    .lte('due_at', new Date().toISOString())
    .order('due_at')
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được review_cards: ${error.message}`)

  const cards = ((data ?? []) as unknown as DueCardRow[])
    .filter((c) => !excludedIds.has(c.learner_vocabulary.vocabulary_id))
    .slice(0, Math.min(CARDS_PER_ROUND, remaining))
  if (cards.length === 0) return { questions: [], capReached: false }

  const [logs, pools, started] = await Promise.all([
    supabase
      .from('review_logs')
      .select('review_card_id, exercise_type')
      .eq('user_id', user.id)
      .in('review_card_id', cards.map((c) => c.id))
      .order('reviewed_at', { ascending: false })
      .range(0, PAGE - 1),
    loadPools(supabase),
    supabase.from('learner_vocabulary').select('vocabulary_id').eq('user_id', user.id).range(0, PAGE - 1),
  ])
  if (logs.error) throw new Error(`Không đọc được review_logs: ${logs.error.message}`)
  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  const poolsWithLearned = { ...pools, learnedWordIds: new Set(started.data?.map((r) => r.vocabulary_id)) }

  const questions = cards.map((card): ReviewQuestion => {
    const lv = card.learner_vocabulary
    const word = lv.vocabularies
    const last = logs.data?.find((l) => l.review_card_id === card.id)?.exercise_type ?? null
    const exercise = chooseReviewExercise(card.card_type, word, last)
    const question = buildReviewQuestion(card.card_type, word, exercise, poolsWithLearned)
    const known = { currentStage: lv.current_stage, kanjiIntroSeen: lv.kanji_intro_seen_at !== null }
    return {
      ...question,
      ...(question.kind === 'choice' ? { reveal: wordReveal(word, known) } : {}),
      cardId: card.id,
      clientEventId: randomUUID(),
    }
  })
  return { questions, capReached: false }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ReviewAnswerRequest {
  cardId: string
  clientEventId: string
  exercise: ExerciseCode
  answer: string | string[]
  responseMs: number
}

function parseReviewAnswer(input: unknown): ReviewAnswerRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const v = input as Record<string, unknown>
  const answerOk =
    (typeof v.answer === 'string' && v.answer.length > 0 && v.answer.length <= 300) ||
    (Array.isArray(v.answer) && v.answer.length >= 1 && v.answer.length <= 40 && v.answer.every((p) => typeof p === 'string' && p.length >= 1 && p.length <= 40))
  const ok =
    typeof v.cardId === 'string' && UUID.test(v.cardId) &&
    typeof v.clientEventId === 'string' && UUID.test(v.clientEventId) &&
    typeof v.exercise === 'string' && Object.hasOwn(EXERCISES, v.exercise) &&
    answerOk &&
    typeof v.responseMs === 'number' && Number.isFinite(v.responseMs) && v.responseMs >= 0
  if (!ok) return null
  return v as unknown as ReviewAnswerRequest
}

export type SubmitReviewAnswerResponse =
  | { status: 'graded'; outcome: Outcome; answer: string; reading: string; reveal: WordReveal }
  | { status: 'invalid' | 'not_found' | 'not_active' | 'conflict' }

/** Server chấm câu ôn rồi mới tính rating và lịch, không tin kết quả từ trình duyệt. */
export async function submitReviewAnswer(input: unknown): Promise<SubmitReviewAnswerResponse> {
  const req = parseReviewAnswer(input)
  if (!req) return { status: 'invalid' }

  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('review_cards')
    .select(`card_type, learner_vocabulary!inner(current_stage, kanji_intro_seen_at, vocabularies!inner(${WORD_COLUMNS}))`)
    .eq('id', req.cardId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được review_cards: ${error.message}`)
  if (!data) return { status: 'not_found' }

  const card = data as unknown as Pick<DueCardRow, 'card_type' | 'learner_vocabulary'>
  const lv = card.learner_vocabulary
  // Câu nghe trên máy không có giọng Nhật đổi sang meaning_to_kana, dạng này cũng thuộc card nghĩa–Kana
  if (!reviewExercises(card.card_type, lv.vocabularies).includes(req.exercise)) return { status: 'invalid' }

  const { outcome, answer } = gradeStageAnswer(lv.vocabularies, req.exercise, req.answer)
  const saved = await submitReview({
    cardId: req.cardId,
    clientEventId: req.clientEventId,
    answer: { outcome, exercise: req.exercise, responseMs: req.responseMs },
  })
  if (saved.status === 'saved' || saved.status === 'duplicate') {
    return {
      status: 'graded',
      outcome,
      answer,
      reading: lv.vocabularies.reading_kana,
      reveal: wordReveal(lv.vocabularies, { currentStage: lv.current_stage, kanjiIntroSeen: lv.kanji_intro_seen_at !== null }),
    }
  }
  return { status: saved.status }
}
