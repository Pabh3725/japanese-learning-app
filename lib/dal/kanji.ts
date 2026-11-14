// KJ-02, V9 gói 4a — Khu Kanji: giai đoạn Học theo lịch và quota; ôn dài hạn bằng 2 Card có trần riêng. Không đụng tiến độ từ vựng. Server-only.
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { readSkillLevels } from '@/lib/dal/skill-levels'
import { inLevel, nextLevel } from '@/lib/learn/levels'
import {
  buildKanjiQuestion,
  gradeKanjiAnswer,
  revealOf,
  type KanjiQuestionData,
  type KanjiReveal,
  type KanjiRow,
  type KanjiWordOption,
} from '@/lib/kanji/questions'
import {
  applyLearningAnswer,
  CARD_CHOICE_OPTIONS,
  chooseLearningExercise,
  chooseCardExercise,
  KANJI_CARD_EXERCISES,
  KANJI_STAR_CARD,
  isKanjiExercise,
  kanjiLoadAdvice,
  newKanjiToday,
  nextSittingAt,
  type KanjiCardType,
  type KanjiCounts,
  type KanjiExercise,
  type KanjiLoadAdvice,
} from '@/lib/kanji/rules'
import { kanjiTier, type KanjiTier } from '@/lib/kanji/distractor-tier'
import { newLongTermSchedule, reviewLongTermSchedule } from '@/lib/kanji/schedule'
import { RULES_V9 } from '@/lib/learning/rules'
import { nextStudyDayStart, studyDate } from '@/lib/learning/time'
import type { Outcome } from '@/lib/learning/types'
import type { Schedule, ScheduleState } from '@/lib/srs/scheduler'
import { readAllPages } from '@/lib/dal/pages'
import { ensureKanjiStarCard, readStarredKanjiIds } from '@/lib/dal/kanji-stars'
import { KANJI_COLUMNS, readAllKanji, readAllKanjiCached, readComponentsByChar, readKanjiVisuals, readSimilarFor, withVisual } from '@/lib/dal/kanji-content'
import { readKanjiNeedTiers } from '@/lib/dal/word-kanji'
import { orderNewKanji } from '@/lib/kanji/new-order'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY_MS = 86_400_000
const LEARNER_COLUMNS =
  'id, kanji_id, phase, points, points_today, points_date, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, version, created_at'

interface LearnerRow {
  id: string
  kanji_id: string
  phase: 'learning' | 'review'
  points: number
  points_today: number
  points_date: string | null
  state: number
  due_at: string
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  last_review_at: string | null
  version: number
  created_at: string
}

const CARD_COLUMNS =
  'id, learner_kanji_id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, version'

/** Một Card ôn dài hạn của chữ (V9: kanji.meaning, kanji.hanviet). */
interface CardRow {
  id: string
  learner_kanji_id: string
  card_type: KanjiCardType
  state: number
  due_at: string
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  last_review_at: string | null
  version: number
}

function scheduleOf(row: LearnerRow | CardRow): Schedule {
  return {
    state: row.state as ScheduleState,
    due: new Date(row.due_at),
    stability: row.stability,
    difficulty: row.difficulty,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    lastReviewAt: row.last_review_at ? new Date(row.last_review_at) : null,
  }
}

export async function readKnownKanjiIds(supabase: Supabase, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('learner_kanji_exclusions').select('kanji_id').eq('user_id', userId).range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_kanji_exclusions: ${error.message}`)
  return new Set(data?.map((r) => r.kanji_id))
}

/**
 * Bậc ưu tiên làm đáp án nhiễu cho người học này: chữ đã học (đã xem thẻ giới thiệu hoặc đã đánh dấu đã biết) trước,
 * rồi chữ sắp học cùng cấp. Dùng cho câu Kanji và câu từ vựng có Kanji (Stage 4–6).
 */
export async function readKanjiTier(supabase: Supabase, userId: string): Promise<KanjiTier> {
  const opened: string[] = []
  const [known, levels, allKanji] = await Promise.all([readKnownKanjiIds(supabase, userId), readSkillLevels(supabase, userId), readAllKanjiCached(supabase)])
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('learner_kanji').select('kanji_id').eq('user_id', userId).order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được learner_kanji: ${error.message}`)
    opened.push(...(data ?? []).map((r) => r.kanji_id as string))
    if ((data?.length ?? 0) < PAGE) break
  }
  return kanjiTier(allKanji, new Set([...known, ...opened]), levels.kanji)
}

/** Như readKanjiTier nhưng tra theo chữ (kho đáp án nhiễu của câu từ vựng không có id chữ). Chữ không có trong bảng xếp cuối. */
export async function readKanjiCharTier(supabase: Supabase, userId: string): Promise<(character: string) => number> {
  const [tierOf, allKanji] = await Promise.all([readKanjiTier(supabase, userId), readAllKanjiCached(supabase)])
  const byChar = new Map(allKanji.map((k) => [k.character, tierOf(k)]))
  return (character) => byChar.get(character) ?? Number.POSITIVE_INFINITY
}

/** Chữ đã đánh dấu là đã biết thì không còn trong khu Kanji; dòng tiến độ vẫn giữ để khôi phục. */
async function readLearners(supabase: Supabase, userId: string, known: ReadonlySet<string>): Promise<LearnerRow[]> {
  const rows: LearnerRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('learner_kanji').select(LEARNER_COLUMNS).eq('user_id', userId).order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được learner_kanji: ${error.message}`)
    rows.push(...((data ?? []) as LearnerRow[]))
    if ((data?.length ?? 0) < PAGE) return rows.filter((r) => !known.has(r.kanji_id))
  }
}

/**
 * Card chưa lưu trữ của các chữ còn trong khu Kanji. V10: Card riêng `kanji.star` chỉ tính khi chữ còn có sao
 * (bỏ sao thì Card tạm dừng, giữ lịch), và xếp sau Card thường.
 */
async function readCards(supabase: Supabase, userId: string, learners: readonly LearnerRow[]): Promise<CardRow[]> {
  const active = new Set(learners.map((r) => r.id))
  const starred = await readStarredKanjiIds(supabase, userId)
  const kanjiOf = new Map(learners.map((r) => [r.id, r.kanji_id]))
  const live = (c: CardRow) => active.has(c.learner_kanji_id) && (c.card_type !== KANJI_STAR_CARD || starred.has(kanjiOf.get(c.learner_kanji_id)!))
  const rows: CardRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('learner_kanji_cards').select(CARD_COLUMNS).eq('user_id', userId).is('archived_at', null).order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được learner_kanji_cards: ${error.message}`)
    rows.push(...((data ?? []) as CardRow[]))
    if ((data?.length ?? 0) < PAGE) return rows.filter(live).sort((a, b) => Number(a.card_type === KANJI_STAR_CARD) - Number(b.card_type === KANJI_STAR_CARD))
  }
}

/**
 * Quota hôm nay. Giai đoạn Học: mỗi chữ còn tối đa 3 câu trong buổi, trần `kanji_cap`; chữ mới chỉ mở khi còn chỗ.
 * Ôn dài hạn: Card đến hạn, trần riêng `kanji_review_cap` đếm số Card khác nhau đã ôn hôm nay.
 */
async function readToday(supabase: Supabase, userId: string, learners: readonly LearnerRow[], cards: readonly CardRow[], notOpened: number) {
  const now = new Date()
  const [settings, answered] = await Promise.all([
    supabase.from('learner_settings').select('kanji_new_per_day, kanji_cap, kanji_review_cap').eq('user_id', userId).maybeSingle(),
    supabase.from('kanji_logs').select('learner_kanji_id, learner_kanji_card_id').eq('user_id', userId).eq('study_date', studyDate(now)).range(0, PAGE - 1),
  ])
  if (settings.error) throw new Error(`Không đọc được learner_settings: ${settings.error.message}`)
  if (answered.error) throw new Error(`Không đọc được kanji_logs: ${answered.error.message}`)
  const { defaults } = RULES_V9
  const newPerDay = settings.data?.kanji_new_per_day ?? defaults.kanjiNewPerDay
  const cap = settings.data?.kanji_cap ?? defaults.kanjiCap
  const reviewCap = settings.data?.kanji_review_cap ?? defaults.kanjiReviewCap
  const learningLogs = (answered.data ?? []).filter((l) => l.learner_kanji_card_id === null)
  const reviewedCards = new Set((answered.data ?? []).flatMap((l) => (l.learner_kanji_card_id === null ? [] : [l.learner_kanji_card_id])))
  const answeredToday = learningLogs.length
  const answeredBy = new Map<string, number>()
  for (const log of learningLogs) answeredBy.set(log.learner_kanji_id, (answeredBy.get(log.learner_kanji_id) ?? 0) + 1)

  const startOfToday = nextStudyDayStart(now).getTime() - DAY_MS
  const openedToday = learners.filter((r) => Date.parse(r.created_at) >= startOfToday).length
  const due = learners.filter((r) => r.phase === 'learning' && Date.parse(r.due_at) <= now.getTime())
  const dueCards = cards.filter((c) => Date.parse(c.due_at) <= now.getTime())
  const { questionsPerSitting } = RULES_V9.kanji
  const leftInSitting = (r: LearnerRow) => Math.max(1, questionsPerSitting - (answeredBy.get(r.id) ?? 0))
  const dueQuestions = due.reduce((sum, r) => sum + leftInSitting(r), 0)
  const room = Math.max(0, cap - answeredToday)
  const reviewRoom = Math.max(0, reviewCap - reviewedCards.size)
  return {
    cap,
    newPerDay,
    openedToday,
    answeredToday,
    room,
    due,
    dueQuestions,
    leftInSitting,
    reviewCap,
    reviewedToday: reviewedCards.size,
    reviewRoom,
    dueCards,
    newToday: newKanjiToday({ newPerDay, cap, answeredToday, openedToday, dueQuestions, notOpened }),
  }
}

export interface KanjiOverview {
  /** Không tính chữ đã bỏ qua. */
  total: number
  known: number
  opened: number
  learning: number
  longTerm: number
  /** Card ôn dài hạn đến hạn còn ôn được hôm nay (sau trần riêng). */
  dueReview: number
  /** Card đến hạn bị dời sang mai vì chạm trần ôn. */
  reviewDeferred: number
  reviewCap: number
  reviewedToday: number
  dueLearning: number
  /** Số câu còn làm được hôm nay, không vượt trần. */
  questionsToday: number
  newToday: number
  /** Hạn mức chữ mới mỗi ngày trong Settings, tính cả chữ đã mở hôm nay. */
  newPerDay: number
  openedToday: number
  answeredToday: number
  cap: number
  nextDueAt: string | null
  advice: KanjiLoadAdvice | null
  /** Cấp Kanji đang học. */
  level: number
  /** Cấp sau có thể mở khi đã mở hết chữ của cấp này. */
  nextLevel: number | null
}

export async function getKanjiOverview(): Promise<KanjiOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const known = await readKnownKanjiIds(supabase, user.id)
  const [learners, all, levels] = await Promise.all([readLearners(supabase, user.id, known), readAllKanji(supabase), readSkillLevels(supabase, user.id)])
  const cards = await readCards(supabase, user.id, learners)
  const total = all.length - known.size
  const opened = new Set(learners.map((r) => r.kanji_id))
  const leftInLevel = all.filter((k) => !known.has(k.id) && !opened.has(k.id) && inLevel(k.jlpt_level ?? null, levels.kanji)).length
  const today = await readToday(supabase, user.id, learners, cards, leftInLevel)
  const dueReview = Math.min(today.dueCards.length, today.reviewRoom)
  const now = Date.now()
  return {
    total,
    known: known.size,
    opened: learners.length,
    learning: learners.filter((r) => r.phase === 'learning').length,
    longTerm: learners.filter((r) => r.phase === 'review').length,
    dueReview,
    reviewDeferred: today.dueCards.length - dueReview,
    reviewCap: today.reviewCap,
    reviewedToday: today.reviewedToday,
    dueLearning: today.due.length,
    questionsToday: Math.min(today.dueQuestions, today.room) + dueReview,
    newToday: today.newToday,
    newPerDay: today.newPerDay,
    openedToday: today.openedToday,
    answeredToday: today.answeredToday,
    cap: today.cap,
    nextDueAt: [...learners.filter((r) => r.phase === 'learning').map((r) => r.due_at), ...cards.map((c) => c.due_at)].filter((due) => Date.parse(due) > now).sort()[0] ?? null,
    level: levels.kanji,
    nextLevel: leftInLevel === 0 ? nextLevel(levels.kanji, all.map((k) => k.jlpt_level ?? null)) : null,
    advice: kanjiLoadAdvice({ dueQuestions: today.dueQuestions, room: today.room, cap: today.cap, newPerDay: today.newPerDay }),
  }
}

export interface KanjiIntroItem extends KanjiReveal {
  kanjiId: string
  examples: { expression: string; reading: string; meaning: string }[]
}

export type KanjiSessionQuestion = KanjiQuestionData & {
  learnerKanjiId: string
  /** Có khi là câu ôn một Card dài hạn. */
  cardId?: string
  cardType?: KanjiCardType
  kanjiId: string
  clientEventId: string
  phase: 'learning' | 'review'
  /** Số câu sai liên tiếp ngay trước câu này. */
  wrongStreak: number
}


type WordRow = { kanji_id: string; vocabularies: { id: string; expression: string; reading_kana: string; meaning_vi: string; sort_order: number } }

async function readLinkedWords(supabase: Supabase, userId: string, kanjiIds: readonly string[]) {
  const [links, met] = await Promise.all([
    supabase
      .from('vocabulary_kanji')
      .select('kanji_id, vocabularies!inner(id, expression, reading_kana, meaning_vi, sort_order)')
      .in('kanji_id', [...kanjiIds])
      .range(0, PAGE - 1),
    readAllPages('learner_vocabulary', (from, to) =>
      supabase.from('learner_vocabulary').select('vocabulary_id, kanji_intro_seen_at, vocabularies!inner(meaning_vi)').eq('user_id', userId).order('id').range(from, to),
    ),
  ])
  if (links.error) throw new Error(`Không đọc được vocabulary_kanji: ${links.error.message}`)
  return {
    links: (links.data ?? []) as unknown as WordRow[],
    met: met as unknown as { vocabulary_id: string; kanji_intro_seen_at: string | null; vocabularies: { meaning_vi: string } }[],
  }
}

/** Vài từ chứa chữ này cho thẻ giới thiệu: từ đã gặp trước, rồi tới từ đầu lộ trình. */
async function readExamples(supabase: Supabase, userId: string, kanjiIds: readonly string[]) {
  const { links, met } = await readLinkedWords(supabase, userId, kanjiIds)
  const metIds = new Set(met.map((r) => r.vocabulary_id))
  return (kanjiId: string) =>
    links
      .filter((r) => r.kanji_id === kanjiId)
      .map((r) => r.vocabularies)
      .sort((a, b) => Number(metIds.has(b.id)) - Number(metIds.has(a.id)) || a.sort_order - b.sort_order)
      .slice(0, 3)
      .map((w) => ({ expression: w.expression, reading: w.reading_kana, meaning: w.meaning_vi }))
}

/** Từ dùng cho câu word_meaning: đã gặp và đã xem Kanji của từ đó, có đủ nghĩa khác làm đáp án nhiễu. */
async function readWordOptions(supabase: Supabase, userId: string, kanjiIds: readonly string[]): Promise<Map<string, KanjiWordOption>> {
  const { links, met } = await readLinkedWords(supabase, userId, kanjiIds)
  const seen = new Set(met.filter((r) => r.kanji_intro_seen_at !== null).map((r) => r.vocabulary_id))
  const meanings = met.map((r) => r.vocabularies.meaning_vi)
  const options = new Map<string, KanjiWordOption>()
  for (const { kanji_id: kanjiId, vocabularies: word } of links) {
    if (options.has(kanjiId) || !seen.has(word.id)) continue
    const distractors = [...new Set(meanings)].filter((meaning) => meaning !== word.meaning_vi)
    if (distractors.length < 3) continue
    options.set(kanjiId, { id: word.id, expression: word.expression, reading: word.reading_kana, meaning: word.meaning_vi, distractors })
  }
  return options
}

type LogRow = { exercise_type: string; outcome: string; phase: string; study_date?: string }

function countsFrom(logs: readonly LogRow[]): KanjiCounts {
  const counts: KanjiCounts = {}
  for (const log of logs) {
    if (log.phase === 'learning' && log.outcome === 'correct' && isKanjiExercise(log.exercise_type)) {
      counts[log.exercise_type] = (counts[log.exercise_type] ?? 0) + 1
    }
  }
  return counts
}

/** Xem xong thẻ giới thiệu: tạo đúng một dòng, câu đầu đến hẹn ngay. Đã có thì giữ nguyên. */
export async function openKanji(kanjiId: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (typeof kanjiId !== 'string' || !UUID.test(kanjiId)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('learner_kanji')
    .upsert({ user_id: user.id, kanji_id: kanjiId }, { onConflict: 'user_id,kanji_id', ignoreDuplicates: true })
  if (error) throw new Error(`Không ghi được learner_kanji: ${error.message}`)
  // V10: chữ đã có sao từ trước khi mở thì có Card riêng ngay
  if ((await readStarredKanjiIds(supabase, user.id)).has(kanjiId)) await ensureKanjiStarCard(supabase, user.id, kanjiId)
  return { status: 'saved' }
}

/** Đã biết chữ này: rời khỏi khu Kanji, không tính vào hạn mức. Khôi phục thì điểm và lịch còn nguyên. */
export async function setKanjiKnown(kanjiId: unknown, known: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (typeof kanjiId !== 'string' || !UUID.test(kanjiId) || typeof known !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = known
    ? await supabase.from('learner_kanji_exclusions').upsert({ user_id: user.id, kanji_id: kanjiId }, { onConflict: 'user_id,kanji_id', ignoreDuplicates: true })
    : await supabase.from('learner_kanji_exclusions').delete().eq('user_id', user.id).eq('kanji_id', kanjiId)
  if (error) throw new Error(`Không lưu được learner_kanji_exclusions: ${error.message}`)
  return { status: 'saved' }
}

interface KanjiAnswerRequest {
  learnerKanjiId: string
  /** Có khi trả lời câu ôn một Card. */
  cardId?: string
  clientEventId: string
  exercise: KanjiExercise
  answer: string
  responseMs: number
  wordId?: string
}

function parseAnswer(input: unknown): KanjiAnswerRequest | null {
  const v = input as Partial<KanjiAnswerRequest> | null
  if (!v || typeof v.learnerKanjiId !== 'string' || !UUID.test(v.learnerKanjiId)) return null
  if (typeof v.clientEventId !== 'string' || !UUID.test(v.clientEventId)) return null
  if (!isKanjiExercise(v.exercise) || typeof v.answer !== 'string' || v.answer.length === 0 || v.answer.length > 200) return null
  if (typeof v.responseMs !== 'number' || !Number.isFinite(v.responseMs)) return null
  if (v.wordId !== undefined && (typeof v.wordId !== 'string' || !UUID.test(v.wordId))) return null
  if (v.cardId !== undefined && (typeof v.cardId !== 'string' || !UUID.test(v.cardId))) return null
  return v as KanjiAnswerRequest
}

export type SubmitKanjiResponse =
  | { status: 'graded'; outcome: Outcome; answer: string; reveal: KanjiReveal; completed: boolean }
  | { status: 'invalid' | 'not_found' | 'conflict' | 'not_active' }

async function readAnswerContext(supabase: Supabase, userId: string, learnerKanjiId: string) {
  const { data, error } = await supabase.from('learner_kanji').select(`${LEARNER_COLUMNS}, kanji!inner(${KANJI_COLUMNS})`).eq('id', learnerKanjiId).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_kanji: ${error.message}`)
  return data as unknown as (LearnerRow & { kanji: KanjiRow }) | null
}

/** Nghĩa thật của từ trong câu word_meaning, chỉ khi từ đó có chứa chữ này. */
async function readWordMeaning(supabase: Supabase, kanjiId: string, wordId: string | undefined): Promise<string | null> {
  if (!wordId) return null
  const { data, error } = await supabase
    .from('vocabulary_kanji')
    .select('vocabularies!inner(meaning_vi)')
    .eq('kanji_id', kanjiId)
    .eq('vocabulary_id', wordId)
    .limit(1)
  if (error) throw new Error(`Không đọc được vocabulary_kanji: ${error.message}`)
  const row = data?.[0] as unknown as { vocabularies: { meaning_vi: string } } | undefined
  return row?.vocabularies.meaning_vi ?? null
}

/** Câu ôn một Card: chỉ đổi lịch của chính Card đó. Dạng bài phải thuộc Card. */
async function submitCardAnswer(supabase: Supabase, userId: string, req: KanjiAnswerRequest): Promise<SubmitKanjiResponse> {
  const { data, error } = await supabase
    .from('learner_kanji_cards')
    .select(`${CARD_COLUMNS}, archived_at, learner_kanji!inner(kanji!inner(${KANJI_COLUMNS}))`)
    .eq('id', req.cardId!)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_kanji_cards: ${error.message}`)
  const card = data as unknown as (CardRow & { archived_at: string | null; learner_kanji: { kanji: KanjiRow } }) | null
  if (!card || card.learner_kanji_id !== req.learnerKanjiId) return { status: 'not_found' }
  if (card.archived_at !== null) return { status: 'not_active' }
  if (!KANJI_CARD_EXERCISES[card.card_type].includes(req.exercise)) return { status: 'invalid' }

  const kanji = card.learner_kanji.kanji
  const { outcome, answer } = gradeKanjiAnswer(kanji, req.exercise, req.answer)
  const now = new Date()
  const schedule = reviewLongTermSchedule(scheduleOf(card), outcome, now)
  const daySeq = await getNextDaySeq(studyDate(now))
  const { data: saved, error: rpcError } = await supabase.rpc('submit_kanji_card_answer', {
    p_card_id: card.id,
    p_client_event_id: req.clientEventId,
    p_expected_version: card.version,
    p_answered_at: now.toISOString(),
    p_exercise_type: req.exercise,
    p_outcome: outcome,
    p_study_date: studyDate(now),
    p_response_time_ms: Math.max(0, Math.round(req.responseMs)),
    p_state: schedule.state,
    p_due_at: schedule.due.toISOString(),
    p_stability: schedule.stability,
    p_difficulty: schedule.difficulty,
    p_scheduled_days: schedule.scheduledDays,
    p_learning_steps: schedule.learningSteps,
    p_reps: schedule.reps,
    p_lapses: schedule.lapses,
    p_last_review_at: schedule.lastReviewAt?.toISOString() ?? null,
    p_day_seq: daySeq,
  })
  if (rpcError) throw new Error(`submit_kanji_card_answer lỗi: ${rpcError.message}`)
  const status = (saved as { status: string }).status
  if (status === 'conflict' || status === 'not_found' || status === 'not_active') return { status }
  return { status: 'graded', outcome, answer, reveal: revealOf(kanji), completed: false }
}

/** Server chấm rồi mới tính điểm và lịch. */
export async function submitKanjiAnswer(input: unknown): Promise<SubmitKanjiResponse> {
  const req = parseAnswer(input)
  if (!req) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  if (req.cardId) return submitCardAnswer(supabase, user.id, req)
  const row = await readAnswerContext(supabase, user.id, req.learnerKanjiId)
  if (!row) return { status: 'not_found' }
  // V9: chữ đã xong giai đoạn Học chỉ còn ôn qua 2 Card
  if (row.phase === 'review') return { status: 'not_active' }

  const { outcome, answer } = gradeKanjiAnswer(row.kanji, req.exercise, req.answer, await readWordMeaning(supabase, row.kanji_id, req.wordId))
  const now = new Date()
  const today = studyDate(now)
  const reveal = revealOf(row.kanji)

  let schedule: Schedule
  let phase: 'learning' | 'review' = row.phase
  let points = row.points
  let pointsToday = row.points_today
  let pointsDate = row.points_date
  let delta = 0
  let completed = false

  if (row.phase === 'learning') {
    const { data: logs, error } = await supabase
      .from('kanji_logs')
      .select('exercise_type, outcome, phase, study_date')
      .eq('learner_kanji_id', row.id)
      .eq('user_id', user.id)
      .is('learner_kanji_card_id', null)
      .order('answered_at', { ascending: false })
      .range(0, PAGE - 1)
    if (error) throw new Error(`Không đọc được kanji_logs: ${error.message}`)
    const history = logs ?? []
    const streak = history.findIndex((l) => l.outcome !== 'correct')
    const hasSimilar = ((await readSimilarFor(supabase, row.kanji_id)).length > 0)
    const result = applyLearningAnswer(
      { points, pointsToday, pointsDate, counts: countsFrom(history), correctStreak: streak === -1 ? history.length : streak },
      req.exercise,
      outcome,
      now,
      hasSimilar,
    )
    points = result.state.points
    pointsToday = result.state.pointsToday
    pointsDate = result.state.pointsDate
    delta = result.delta
    completed = result.completed

    if (completed) {
      schedule = newLongTermSchedule(now)
      phase = 'review'
    } else {
      const answeredToday = history.filter((l) => l.study_date === today).length + 1
      const sittingsDone = new Set([...history.map((l) => l.study_date), today]).size
      // Chưa đủ câu của buổi này thì vẫn đến hạn; đủ rồi thì hẹn buổi kế tiếp
      const next = answeredToday >= RULES_V9.kanji.questionsPerSitting ? nextSittingAt(now, sittingsDone) : { due: new Date(row.due_at), days: 0 }
      schedule = { ...scheduleOf(row), due: next.due, scheduledDays: next.days, reps: row.reps + 1, lastReviewAt: now }
    }
  } else {
    return { status: 'not_active' }
  }

  const daySeq = await getNextDaySeq(today)
  const { data: saved, error: rpcError } = await supabase.rpc('submit_kanji_answer', {
    p_learner_kanji_id: row.id,
    p_client_event_id: req.clientEventId,
    p_expected_version: row.version,
    p_answered_at: now.toISOString(),
    p_exercise_type: req.exercise,
    p_outcome: outcome,
    p_points: delta,
    p_study_date: today,
    p_response_time_ms: Math.max(0, Math.round(req.responseMs)),
    p_phase: phase,
    p_total_points: points,
    p_points_today: pointsToday,
    p_points_date: pointsDate,
    p_state: schedule.state,
    p_due_at: schedule.due.toISOString(),
    p_stability: schedule.stability,
    p_difficulty: schedule.difficulty,
    p_scheduled_days: schedule.scheduledDays,
    p_learning_steps: schedule.learningSteps,
    p_reps: schedule.reps,
    p_lapses: schedule.lapses,
    p_last_review_at: schedule.lastReviewAt?.toISOString() ?? null,
    p_completed: completed,
    p_day_seq: daySeq,
  })
  if (rpcError) throw new Error(`submit_kanji_answer lỗi: ${rpcError.message}`)
  const status = (saved as { status: string }).status
  if (status === 'conflict' || status === 'not_found') return { status }
  return { status: 'graded', outcome, answer, reveal, completed: status === 'saved' && completed }
}

/** Hỏi lại câu sai cuối lượt: chỉ chấm, không ghi nhật ký, không đổi điểm và lịch. */
export async function checkKanjiAnswer(input: unknown): Promise<SubmitKanjiResponse> {
  const req = parseAnswer(input)
  if (!req) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const row = await readAnswerContext(supabase, user.id, req.learnerKanjiId)
  if (!row) return { status: 'not_found' }
  const { outcome, answer } = gradeKanjiAnswer(row.kanji, req.exercise, req.answer, await readWordMeaning(supabase, row.kanji_id, req.wordId))
  return { status: 'graded', outcome, answer, reveal: revealOf(row.kanji), completed: false }
}

// ---------------------------------------------------------------------------
// V9 bài Learn (R11): ứng viên cho AIS và dựng từng câu một
// ---------------------------------------------------------------------------

export interface KanjiCandidates {
  /** Chữ đang ở giai đoạn Học, đến hạn. `left`: số câu còn của buổi hôm nay. */
  learning: { learnerKanjiId: string; kanjiId: string; left: number; overdueDays: number }[]
  /** Card ôn dài hạn đến hạn, trong trần Card Kanji còn lại. */
  cards: { cardId: string; learnerKanjiId: string; kanjiId: string; overdueDays: number }[]
  /** Chữ mới còn mở được hôm nay, theo thứ tự học. */
  fresh: { kanjiId: string }[]
  learningLeft: number
  cardsLeft: number
}

const daysOverdue = (dueAt: string, now: number) => Math.max(0, Math.floor((now - Date.parse(dueAt)) / DAY_MS))

export async function readKanjiCandidates(supabase: Supabase, userId: string): Promise<KanjiCandidates> {
  const known = await readKnownKanjiIds(supabase, userId)
  const [learners, allKanji, levels] = await Promise.all([readLearners(supabase, userId, known), readAllKanjiCached(supabase), readSkillLevels(supabase, userId)])
  const cards = await readCards(supabase, userId, learners)
  const opened = new Set(learners.map((r) => r.kanji_id))
  const waiting = allKanji.filter((k) => !known.has(k.id) && !opened.has(k.id) && inLevel(k.jlpt_level ?? null, levels.kanji))
  // V12: chữ cần sớm cho từ vựng trước, cùng mức thì ít nét trước, thành phần trước chữ ghép (lib/kanji/new-order.ts)
  const [tiers, components] = await Promise.all([readKanjiNeedTiers(supabase, userId), readComponentsByChar(supabase)])
  const studyOrder = new Map(allKanji.map((k, i) => [k.id, i]))
  const inLevelNotOpened = orderNewKanji(
    waiting.map((k) => ({ ...k, strokes: k.stroke_count && k.stroke_count > 0 ? k.stroke_count : null, studyOrder: studyOrder.get(k.id)! })),
    (id) => tiers.get(id) ?? 4,
    (character) => components.get(character) ?? [],
  )
  const today = await readToday(supabase, userId, learners, cards, inLevelNotOpened.length)
  const now = Date.now()
  const byLk = new Map(learners.map((r) => [r.id, r]))
  return {
    learning: today.due.map((r) => ({ learnerKanjiId: r.id, kanjiId: r.kanji_id, left: today.leftInSitting(r), overdueDays: daysOverdue(r.due_at, now) })),
    cards: today.dueCards.map((c) => ({ cardId: c.id, learnerKanjiId: c.learner_kanji_id, kanjiId: byLk.get(c.learner_kanji_id)!.kanji_id, overdueDays: daysOverdue(c.due_at, now) })),
    fresh: inLevelNotOpened.slice(0, today.newToday).map((k) => ({ kanjiId: k.id })),
    learningLeft: today.room,
    cardsLeft: today.reviewRoom,
  }
}

/** Thẻ giới thiệu một chữ mới. */
export async function buildKanjiIntro(supabase: Supabase, userId: string, kanjiId: string): Promise<KanjiIntroItem | null> {
  const kanji = (await readAllKanjiCached(supabase)).find((k) => k.id === kanjiId)
  if (!kanji) return null
  const [examplesOf, visuals] = await Promise.all([readExamples(supabase, userId, [kanjiId]), readKanjiVisuals(supabase, [kanjiId])])
  return { ...revealOf(kanji), visual: visuals.get(kanjiId), kanjiId, examples: examplesOf(kanjiId) }
}

/** Một câu Kanji: câu giai đoạn Học của chữ, hoặc câu ôn một Card. null khi chữ hoặc Card không còn cần hỏi. */
export async function buildKanjiQuestionFor(
  supabase: Supabase,
  userId: string,
  target: { learnerKanjiId: string } | { cardId: string },
  avoid: string | readonly string[] | null,
): Promise<KanjiSessionQuestion | null> {
  // Câu ngay trước (R11), và với câu luyện sau thẻ giới thiệu là các dạng đã luyện (V10)
  const avoidSet = new Set(avoid === null ? [] : typeof avoid === 'string' ? [avoid] : avoid)
  const [allKanji, tierOf] = await Promise.all([readAllKanjiCached(supabase), readKanjiTier(supabase, userId)])
  const byId = new Map(allKanji.map((k) => [k.id, k]))
  const streakOf = (own: readonly { outcome: string }[]) => {
    const i = own.findIndex((l) => l.outcome !== 'wrong')
    return i === -1 ? own.length : i
  }

  if ('cardId' in target) {
    const { data, error } = await supabase
      .from('learner_kanji_cards')
      .select(`${CARD_COLUMNS}, archived_at, learner_kanji!inner(kanji_id)`)
      .eq('id', target.cardId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Không đọc được learner_kanji_cards: ${error.message}`)
    const card = data as unknown as (CardRow & { archived_at: string | null; learner_kanji: { kanji_id: string } }) | null
    if (!card || card.archived_at !== null) return null
    const { data: logs, error: logsError } = await supabase
      .from('kanji_logs')
      .select('exercise_type, outcome')
      .eq('user_id', userId)
      .eq('learner_kanji_card_id', card.id)
      .order('answered_at', { ascending: false })
      .range(0, 49)
    if (logsError) throw new Error(`Không đọc được kanji_logs: ${logsError.message}`)
    const last = logs?.[0]?.exercise_type ?? null
    let exercise = chooseCardExercise(card.card_type, last)
    if (avoidSet.has(exercise)) exercise = chooseCardExercise(card.card_type, exercise)
    const kanji = byId.get(card.learner_kanji.kanji_id)!
    return {
      ...(await withVisual(supabase, buildKanjiQuestion(kanji, exercise, allKanji, null, Math.random, CARD_CHOICE_OPTIONS, [], tierOf), kanji.id)),
      learnerKanjiId: card.learner_kanji_id,
      kanjiId: kanji.id,
      cardId: card.id,
      cardType: card.card_type,
      clientEventId: randomUUID(),
      phase: 'review',
      wrongStreak: streakOf(logs ?? []),
    }
  }

  const { data, error } = await supabase.from('learner_kanji').select(LEARNER_COLUMNS).eq('id', target.learnerKanjiId).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_kanji: ${error.message}`)
  const row = data as LearnerRow | null
  if (!row || row.phase !== 'learning') return null
  const [{ data: logs, error: logsError }, words, similar] = await Promise.all([
    supabase
      .from('kanji_logs')
      .select('exercise_type, outcome, phase')
      .eq('user_id', userId)
      .eq('learner_kanji_id', row.id)
      .is('learner_kanji_card_id', null)
      .order('answered_at', { ascending: false })
      .range(0, PAGE - 1),
    readWordOptions(supabase, userId, [row.kanji_id]),
    readSimilarFor(supabase, row.kanji_id),
  ])
  if (logsError) throw new Error(`Không đọc được kanji_logs: ${logsError.message}`)
  const own = logs ?? []
  const word = words.get(row.kanji_id) ?? null
  const counts = countsFrom(own)
  const hasSimilar = similar.length > 0
  let exercise = chooseLearningExercise(row.points, counts, word !== null, Math.random, hasSimilar)
  for (let i = 0; i < 10 && avoidSet.has(exercise); i++) exercise = chooseLearningExercise(row.points, counts, word !== null, Math.random, hasSimilar)
  return {
    ...(await withVisual(supabase, buildKanjiQuestion(byId.get(row.kanji_id)!, exercise, allKanji, word, Math.random, undefined, similar, tierOf), row.kanji_id)),
    learnerKanjiId: row.id,
    kanjiId: row.kanji_id,
    clientEventId: randomUUID(),
    phase: 'learning',
    wrongStreak: streakOf(own),
  }
}

// ---------------------------------------------------------------------------
// Trang chi tiết chữ trong Library (V9 R12)
// ---------------------------------------------------------------------------

export interface KanjiDetail extends KanjiReveal {
  id: string
  jlpt: number | null
  strokeCount: number | null
  known: boolean
  /** V10: chữ có sao. */
  starred: boolean
  /** Chữ gần giống đã duyệt, kèm giải thích điểm khác. */
  similar: { character: string; hanViet: string; meaning: string; explanation: string }[]
  /** Từ trong lộ trình có chứa chữ này. */
  words: { code: string; expression: string; reading: string; meaning: string }[]
}

/** Trang chi tiết một chữ trong Library (V9 R12). */
export async function getKanjiDetail(character: string): Promise<KanjiDetail | null> {
  if ([...character].length !== 1) return null
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from('kanji').select(`${KANJI_COLUMNS}, stroke_count`).eq('character', character).maybeSingle()
  if (error) throw new Error(`Không đọc được kanji: ${error.message}`)
  if (!data) return null
  const kanji = data as KanjiRow & { stroke_count: number | null }

  const [visuals, known, starred, pairs, words] = await Promise.all([
    readKanjiVisuals(supabase, [kanji.id]),
    readKnownKanjiIds(supabase, user.id),
    readStarredKanjiIds(supabase, user.id),
    supabase
      .from('kanji_similar_pairs')
      .select('kanji_a, kanji_b, explanation, a:kanji!kanji_similar_pairs_kanji_a_fkey(character, han_viet, meaning_vi), b:kanji!kanji_similar_pairs_kanji_b_fkey(character, han_viet, meaning_vi)')
      .eq('approved', true)
      .or(`kanji_a.eq.${kanji.id},kanji_b.eq.${kanji.id}`)
      .order('score', { ascending: false })
      .range(0, 9),
    supabase
      .from('vocabulary_kanji')
      .select('vocabularies!inner(code, expression, reading_kana, meaning_vi, sort_order)')
      .eq('kanji_id', kanji.id)
      .range(0, 199),
  ])
  if (pairs.error) console.error(`Không đọc được kanji_similar_pairs: ${pairs.error.message}`)
  if (words.error) throw new Error(`Không đọc được vocabulary_kanji: ${words.error.message}`)

  type Side = { character: string; han_viet: string; meaning_vi: string }
  const similar = ((pairs.data ?? []) as unknown as { kanji_a: string; explanation: string; a: Side; b: Side }[]).map((p) => {
    const other = p.kanji_a === kanji.id ? p.b : p.a
    return { character: other.character, hanViet: other.han_viet, meaning: other.meaning_vi, explanation: p.explanation }
  })
  const wordRows = ((words.data ?? []) as unknown as { vocabularies: { code: string; expression: string; reading_kana: string; meaning_vi: string; sort_order: number } }[])
    .map((r) => r.vocabularies)
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    ...revealOf(kanji),
    visual: visuals.get(kanji.id),
    id: kanji.id,
    jlpt: kanji.jlpt_level ?? null,
    strokeCount: kanji.stroke_count && kanji.stroke_count > 0 ? kanji.stroke_count : null,
    known: known.has(kanji.id),
    starred: starred.has(kanji.id),
    similar,
    words: wordRows.map((w) => ({ code: w.code, expression: w.expression, reading: w.reading_kana, meaning: w.meaning_vi })),
  }
}
