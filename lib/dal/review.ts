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
import { readStrokesByCharacter } from '@/lib/dal/kanji'
import { loadPools } from '@/lib/dal/stage-session'
import { buildReviewQuestion, chooseReviewExercise, gradeReviewAnswer, reviewExercises, type ReviewAnswerInput, type ReviewQuestionData } from '@/lib/exercise/review-questions'
import { gradeStageAnswer, withHint, wordReveal, type QuestionData, type StageWord, type WordReveal } from '@/lib/exercise/stage-questions'
import { EXERCISES, RULES_V9 } from '@/lib/learning/rules'
import { nextStudyDayStart, studyDate } from '@/lib/learning/time'
import type { CardType, ExerciseCode, Outcome } from '@/lib/learning/types'
import { createScheduler, type ReviewAnswer, type ReviewCard } from '@/lib/srs/scheduler'
import { isWordStarred, readStarredIds } from '@/lib/dal/star-relearn'
import {
  parseSubmitReviewResult,
  rowToReviewCard,
  toSubmitReviewParams,
  type ReviewCardRow,
  type SubmitReviewStatus,
} from '@/lib/srs/mappers'
import { readAllPages } from '@/lib/dal/pages'
import { readKnownWordIds } from '@/lib/dal/known-words'

const isKanjiChar = (c: string) => /[一-鿿㐀-䶿]/.test(c)

const scheduler = createScheduler() // production: fuzz bật

const CARD_COLUMNS =
  'id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, ' +
  'last_review_at, card_points, retired_at, archived_at, practice_points_today, practice_points_date, version, ' +
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
  archived_at: string | null
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

  // Card riêng của từ đã bỏ sao thì tạm dừng
  const paused = row.card_type === STAR_CARD && !(await isWordStarred(supabase, user.id, row.learner_vocabulary.vocabulary_id))
  const card = rowToReviewCard(row, { paused: exclusion !== null || paused })
  if (!card) throw new Error(`Card ${req.cardId} sai dạng (thiếu card_type?)`)
  // Card đã lưu trữ ("Đã học xong") không còn được ôn (R13)
  if (card.status !== 'active' || row.archived_at !== null) return { status: 'not_active' }

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

const STAR_CARD: CardType = 'vocab.star_recall'

function isCardActive(type: CardType, vocabularyId: string, excludedIds: ReadonlySet<string>, starredIds: ReadonlySet<string>): boolean {
  if (excludedIds.has(vocabularyId)) return false
  return type !== STAR_CARD || starredIds.has(vocabularyId)
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

/** V9 §9.4: Review tách 2 mục, mỗi mục một trần. Kanji riêng lẻ ôn trong khu Kanji. */
export type ReviewArea = 'kana' | 'kanji'
export const REVIEW_AREAS: readonly ReviewArea[] = ['kana', 'kanji']
export const AREA_CARD_TYPES: Record<ReviewArea, readonly CardType[]> = {
  kana: ['vocab.kana', 'vocab.star_recall'],
  kanji: ['vocab.kanji'],
}
const areaOf = (type: CardType): ReviewArea => (type === 'vocab.kanji' ? 'kanji' : 'kana')

export function isReviewArea(value: unknown): value is ReviewArea {
  return value === 'kana' || value === 'kanji'
}

async function readReviewCaps(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Record<ReviewArea, number>> {
  const { data, error } = await supabase.from('learner_settings').select('review_cap, word_kanji_review_cap').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  return {
    kana: data?.review_cap ?? RULES_V9.defaults.reviewCap,
    kanji: data?.word_kanji_review_cap ?? RULES_V9.defaults.wordKanjiReviewCap,
  }
}

/** Số Card khác nhau đã ôn hôm nay của từng mục. Card Again quay lại trong ngày không tính thêm (R7). */
async function countReviewedToday(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Record<ReviewArea, number>> {
  const rows = await readAllPages('review_logs', (from, to) =>
    supabase
      .from('review_logs')
      .select('review_card_id, review_cards!inner(card_type)')
      .eq('user_id', userId)
      .eq('study_date', studyDate(new Date()))
      .order('id')
      .range(from, to),
  )
  const seen: Record<ReviewArea, Set<string>> = { kana: new Set(), kanji: new Set() }
  for (const row of rows as unknown as { review_card_id: string; review_cards: { card_type: CardType } }[]) {
    seen[areaOf(row.review_cards.card_type)].add(row.review_card_id)
  }
  return { kana: seen.kana.size, kanji: seen.kanji.size }
}

async function readExcludedIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Set<string>> {
  return readKnownWordIds(supabase, userId)
}

export interface ReviewAreaOverview {
  /** Số card còn được ôn hôm nay, sau khi áp trần của mục. */
  dueNow: number
  deferred: number
  reviewedToday: number
  cap: number
  dueTomorrow: number
  dueIn3Days: number
  dueThisWeek: number
}

export interface ReviewOverview {
  /** Từng mục của tab Review. */
  areas: Record<ReviewArea, ReviewAreaOverview>
  /** Tổng hai mục: số card còn được ôn hôm nay, sau khi áp trần mỗi mục. */
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
  const [caps, reviewedToday, excludedIds, starred] = await Promise.all([
    readReviewCaps(supabase, user.id),
    countReviewedToday(supabase, user.id),
    readExcludedIds(supabase, user.id),
    readStarredIds(supabase, user.id),
  ])
  const starredIds = new Set(starred)

  // Mỗi từ có tới 5 card, nên số dòng có thể vượt 1000 mỗi lần của Data API
  const rows: { card_type: CardType; due_at: string; learner_vocabulary: { vocabulary_id: string } }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('review_cards')
      .select('card_type, due_at, learner_vocabulary!inner(vocabulary_id)')
      .eq('user_id', user.id)
      .is('retired_at', null)
      .is('archived_at', null)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được review_cards: ${error.message}`)
    rows.push(...((data ?? []) as unknown as typeof rows))
    if ((data?.length ?? 0) < PAGE) break
  }

  const active = rows.filter((r) => isCardActive(r.card_type, r.learner_vocabulary.vocabulary_id, excludedIds, starredIds))
  const now = Date.now()
  const startOfTomorrow = nextStudyDayStart(new Date()).getTime()

  const areaOverview = (area: ReviewArea): ReviewAreaOverview => {
    const own = active.filter((r) => areaOf(r.card_type) === area)
    const before = (ms: number) => own.filter((r) => Date.parse(r.due_at) < ms).length
    const due = own.filter((r) => Date.parse(r.due_at) <= now).length
    const dueNow = Math.min(due, Math.max(0, caps[area] - reviewedToday[area]))
    return {
      dueNow,
      deferred: due - dueNow,
      reviewedToday: reviewedToday[area],
      cap: caps[area],
      dueTomorrow: before(startOfTomorrow + DAY_MS) - before(startOfTomorrow),
      dueIn3Days: before(startOfTomorrow + 3 * DAY_MS) - before(startOfTomorrow),
      dueThisWeek: before(startOfTomorrow + 7 * DAY_MS) - before(startOfTomorrow),
    }
  }
  const areas = { kana: areaOverview('kana'), kanji: areaOverview('kanji') }
  const sum = (key: keyof ReviewAreaOverview) => areas.kana[key] + areas.kanji[key]

  const byType: ReviewOverview['byType'] = { 'vocab.kana': 0, 'vocab.kanji': 0, 'vocab.star_recall': 0 }
  for (const row of active) byType[row.card_type]++

  return {
    areas,
    dueNow: sum('dueNow'),
    deferred: sum('deferred'),
    reviewedToday: sum('reviewedToday'),
    dueTomorrow: sum('dueTomorrow'),
    dueIn3Days: sum('dueIn3Days'),
    dueThisWeek: sum('dueThisWeek'),
    byType,
  }
}

export type ReviewQuestion = ReviewQuestionData & {
  cardId: string
  vocabularyId: string
  /** Mã cho lần nộp câu này, cấp ở server. */
  clientEventId: string
  /** Thông tin từ khi trả lời sai. Câu chọn đã có đáp án ở trình duyệt nên gửi sẵn. */
  reveal?: WordReveal
}

export interface ReviewSessionData {
  questions: ReviewQuestion[]
  /** Đã ôn đủ trần hôm nay. */
  capReached: boolean
  /** Số Card còn đến hạn sau phiên này, trong trần hôm nay. */
  cardsLeft: number
  starredIds: string[]
}

/** Một phiên của một mục Review: Card quá hạn lâu nhất trước, không vượt trần của mục. */
export async function getReviewSession(area: ReviewArea = 'kana'): Promise<ReviewSessionData> {
  const user = await requireUser()
  const supabase = await createClient()
  const [caps, reviewedToday, excludedIds, starredIds] = await Promise.all([
    readReviewCaps(supabase, user.id),
    countReviewedToday(supabase, user.id),
    readExcludedIds(supabase, user.id),
    readStarredIds(supabase, user.id),
  ])
  const remaining = Math.max(0, caps[area] - reviewedToday[area])
  if (remaining === 0) return { questions: [], capReached: true, cardsLeft: 0, starredIds }

  const { data, error } = await supabase
    .from('review_cards')
    .select(`id, card_type, due_at, learner_vocabulary!inner(vocabulary_id, current_stage, kanji_intro_seen_at, vocabularies!inner(${WORD_COLUMNS}))`)
    .eq('user_id', user.id)
    .is('retired_at', null)
    .is('archived_at', null)
    .in('card_type', [...AREA_CARD_TYPES[area]])
    .lte('due_at', new Date().toISOString())
    .order('due_at')
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được review_cards: ${error.message}`)

  const starredSet = new Set(starredIds)
  // Card riêng của từ có sao xếp sau Card thường, để không chiếm chỗ của lộ trình chính
  const due = ((data ?? []) as unknown as DueCardRow[])
    .filter((c) => isCardActive(c.card_type, c.learner_vocabulary.vocabulary_id, excludedIds, starredSet))
    .sort((a, b) => Number(a.card_type === STAR_CARD) - Number(b.card_type === STAR_CARD))
  const cards = due.slice(0, Math.min(CARDS_PER_ROUND, remaining))
  if (cards.length === 0) return { questions: [], capReached: false, cardsLeft: 0, starredIds }
  const cardsLeft = Math.min(due.length, remaining) - cards.length

  const { data: logRows, error: logsError } = await supabase
    .from('review_logs')
    .select('review_card_id, exercise_type')
    .eq('user_id', user.id)
    .in('review_card_id', cards.map((c) => c.id))
    .order('reviewed_at', { ascending: false })
    .range(0, PAGE - 1)
  if (logsError) throw new Error(`Không đọc được review_logs: ${logsError.message}`)
  const logs = { data: logRows }

  // Câu viết rồi tự chấm: kèm nét viết của các chữ Kanji trong từ
  const chosen = cards.map((card) => {
    const last = logs.data?.find((l) => l.review_card_id === card.id)?.exercise_type ?? null
    return chooseReviewExercise(card.card_type, last)
  })
  const writeChars = cards.flatMap((card, i) => (chosen[i] === 'kanji_write_self' ? [...card.learner_vocabulary.vocabularies.expression].filter(isKanjiChar) : []))
  const strokesOf = await readStrokesByCharacter(supabase, writeChars)

  const questions = cards.map((card, i): ReviewQuestion => {
    const lv = card.learner_vocabulary
    const word = lv.vocabularies
    const question = buildReviewQuestion(word, chosen[i])
    if (question.kind === 'self') {
      const strokes = [...word.expression].filter(isKanjiChar).flatMap((c) => (strokesOf.has(c) ? [{ character: c, strokes: strokesOf.get(c)! }] : []))
      if (strokes.length > 0) question.strokes = strokes
    }
    return {
      ...question,
      reveal: wordReveal(word, { currentStage: lv.current_stage, kanjiIntroSeen: card.card_type === 'vocab.kanji' }),
      cardId: card.id,
      vocabularyId: lv.vocabulary_id,
      clientEventId: randomUUID(),
    }
  })
  return { questions, capReached: false, cardsLeft, starredIds }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ReviewAnswerRequest extends ReviewAnswerInput {
  cardId: string
  clientEventId: string
  exercise: ExerciseCode
  responseMs: number
}

const shortText = (value: unknown) => value === undefined || (typeof value === 'string' && value.length <= 300)

function parseReviewAnswer(input: unknown): ReviewAnswerRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const v = input as Record<string, unknown>
  const ok =
    typeof v.cardId === 'string' && UUID.test(v.cardId) &&
    typeof v.clientEventId === 'string' && UUID.test(v.clientEventId) &&
    typeof v.exercise === 'string' && Object.hasOwn(EXERCISES, v.exercise) &&
    shortText(v.answer) && shortText(v.reading) && shortText(v.hanViet) &&
    (v.remembered === undefined || typeof v.remembered === 'boolean') &&
    typeof v.responseMs === 'number' && Number.isFinite(v.responseMs) && v.responseMs >= 0
  if (!ok) return null
  return v as unknown as ReviewAnswerRequest
}

export type SubmitReviewAnswerResponse =
  | { status: 'graded'; outcome: Outcome; answer: string; reading: string; reveal: WordReveal }
  | { status: 'invalid' | 'not_found' | 'not_active' | 'conflict' }

/** Server chấm câu ôn rồi mới tính rating và lịch, không tin kết quả từ trình duyệt. Câu tự chấm dựa vào người học. */
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
  if (!reviewExercises(card.card_type).includes(req.exercise)) return { status: 'invalid' }

  const { outcome, answer } = gradeReviewAnswer(lv.vocabularies, req.exercise, req)
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
      reveal: wordReveal(lv.vocabularies, { currentStage: lv.current_stage, kanjiIntroSeen: card.card_type === 'vocab.kanji' }),
    }
  }
  return { status: saved.status }
}
