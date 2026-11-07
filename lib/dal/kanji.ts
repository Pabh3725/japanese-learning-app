// KJ-02 — Khu Kanji: chọn câu theo lịch và quota, lưu câu trả lời. Không đụng tiến độ từ vựng. Server-only.
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
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
  chooseReviewExercise,
  isKanjiExercise,
  kanjiLoadAdvice,
  newKanjiToday,
  nextSittingAt,
  planSitting,
  type KanjiCounts,
  type KanjiExercise,
  type KanjiLoadAdvice,
} from '@/lib/kanji/rules'
import { newLongTermSchedule, reviewLongTermSchedule } from '@/lib/kanji/schedule'
import { RULES_V4 } from '@/lib/learning/rules'
import { nextStudyDayStart, studyDate } from '@/lib/learning/time'
import type { Outcome } from '@/lib/learning/types'
import type { Schedule, ScheduleState } from '@/lib/srs/scheduler'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY_MS = 86_400_000
const QUESTIONS_PER_SESSION = 20
const INTROS_PER_SESSION = 5
const KANJI_COLUMNS = 'id, character, han_viet, meaning_vi, onyomi, kunyomi'
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

function scheduleOf(row: LearnerRow): Schedule {
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

async function readAllKanji(supabase: Supabase): Promise<KanjiRow[]> {
  const { data, error } = await supabase.from('kanji').select(KANJI_COLUMNS).order('study_order').range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được kanji: ${error.message}`)
  return (data ?? []) as KanjiRow[]
}

/** Quota hôm nay. Mỗi chữ đang học còn tối đa 3 câu trong buổi; chữ mới chỉ mở khi còn chỗ sau phần ôn và học. */
async function readToday(supabase: Supabase, userId: string, learners: readonly LearnerRow[], notOpened: number) {
  const now = new Date()
  const [settings, answered] = await Promise.all([
    supabase.from('learner_settings').select('kanji_new_per_day, kanji_cap').eq('user_id', userId).maybeSingle(),
    supabase.from('kanji_logs').select('learner_kanji_id').eq('user_id', userId).eq('study_date', studyDate(now)).range(0, PAGE - 1),
  ])
  if (settings.error) throw new Error(`Không đọc được learner_settings: ${settings.error.message}`)
  if (answered.error) throw new Error(`Không đọc được kanji_logs: ${answered.error.message}`)
  const newPerDay = settings.data?.kanji_new_per_day ?? RULES_V4.defaults.kanjiNewPerDay
  const cap = settings.data?.kanji_cap ?? RULES_V4.defaults.kanjiCap
  const answeredToday = answered.data?.length ?? 0
  const answeredBy = new Map<string, number>()
  for (const log of answered.data ?? []) answeredBy.set(log.learner_kanji_id, (answeredBy.get(log.learner_kanji_id) ?? 0) + 1)

  const startOfToday = nextStudyDayStart(now).getTime() - DAY_MS
  const openedToday = learners.filter((r) => Date.parse(r.created_at) >= startOfToday).length
  const due = learners.filter((r) => Date.parse(r.due_at) <= now.getTime())
  const { questionsPerSitting } = RULES_V4.kanji
  const leftInSitting = (r: LearnerRow) => Math.max(1, questionsPerSitting - (answeredBy.get(r.id) ?? 0))
  const dueQuestions = due.reduce((sum, r) => sum + (r.phase === 'review' ? 1 : leftInSitting(r)), 0)
  const room = Math.max(0, cap - answeredToday)
  return {
    cap,
    newPerDay,
    openedToday,
    answeredToday,
    room,
    due,
    dueQuestions,
    leftInSitting,
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
  dueReview: number
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
}

export async function getKanjiOverview(): Promise<KanjiOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const known = await readKnownKanjiIds(supabase, user.id)
  const [learners, totalAll] = await Promise.all([
    readLearners(supabase, user.id, known),
    supabase.from('kanji').select('id', { count: 'exact', head: true }),
  ])
  if (totalAll.error) throw new Error(`Không đọc được kanji: ${totalAll.error.message}`)
  const total = (totalAll.count ?? 0) - known.size
  const today = await readToday(supabase, user.id, learners, total - learners.length)
  const now = Date.now()
  return {
    total,
    known: known.size,
    opened: learners.length,
    learning: learners.filter((r) => r.phase === 'learning').length,
    longTerm: learners.filter((r) => r.phase === 'review').length,
    dueReview: today.due.filter((r) => r.phase === 'review').length,
    dueLearning: today.due.filter((r) => r.phase === 'learning').length,
    questionsToday: Math.min(today.dueQuestions, today.room),
    newToday: today.newToday,
    newPerDay: today.newPerDay,
    openedToday: today.openedToday,
    answeredToday: today.answeredToday,
    cap: today.cap,
    nextDueAt: learners.map((r) => r.due_at).filter((due) => Date.parse(due) > now).sort()[0] ?? null,
    advice: kanjiLoadAdvice({ dueQuestions: today.dueQuestions, room: today.room, cap: today.cap, newPerDay: today.newPerDay }),
  }
}

export interface KanjiIntroItem extends KanjiReveal {
  kanjiId: string
  examples: { expression: string; reading: string; meaning: string }[]
}

export type KanjiSessionQuestion = KanjiQuestionData & {
  learnerKanjiId: string
  kanjiId: string
  clientEventId: string
  phase: 'learning' | 'review'
  /** Số câu sai liên tiếp ngay trước câu này. */
  wrongStreak: number
}

export interface KanjiSessionData {
  intros: KanjiIntroItem[]
  questions: KanjiSessionQuestion[]
  capReached: boolean
  nextDueAt: string | null
}

type WordRow = { kanji_id: string; vocabularies: { id: string; expression: string; reading_kana: string; meaning_vi: string; sort_order: number } }

async function readLinkedWords(supabase: Supabase, userId: string, kanjiIds: readonly string[]) {
  const [links, met] = await Promise.all([
    supabase
      .from('vocabulary_kanji')
      .select('kanji_id, vocabularies!inner(id, expression, reading_kana, meaning_vi, sort_order)')
      .in('kanji_id', [...kanjiIds])
      .range(0, PAGE - 1),
    supabase.from('learner_vocabulary').select('vocabulary_id, kanji_intro_seen_at, vocabularies!inner(meaning_vi)').eq('user_id', userId).range(0, PAGE - 1),
  ])
  if (links.error) throw new Error(`Không đọc được vocabulary_kanji: ${links.error.message}`)
  if (met.error) throw new Error(`Không đọc được learner_vocabulary: ${met.error.message}`)
  return {
    links: (links.data ?? []) as unknown as WordRow[],
    met: (met.data ?? []) as unknown as { vocabulary_id: string; kanji_intro_seen_at: string | null; vocabularies: { meaning_vi: string } }[],
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

/** Thứ tự: ôn dài hạn, rồi câu đang học (lần lượt mỗi chữ một câu để các câu cùng chữ cách nhau), rồi mới tới chữ mới. */
export async function getKanjiSession(): Promise<KanjiSessionData> {
  const user = await requireUser()
  const supabase = await createClient()
  const known = await readKnownKanjiIds(supabase, user.id)
  const [learners, allKanji] = await Promise.all([readLearners(supabase, user.id, known), readAllKanji(supabase)])
  const kanji = allKanji.filter((k) => !known.has(k.id))
  const today = await readToday(supabase, user.id, learners, kanji.length - learners.length)
  const byId = new Map(allKanji.map((k) => [k.id, k]))
  const byDue = (a: LearnerRow, b: LearnerRow) => Date.parse(a.due_at) - Date.parse(b.due_at)
  const reviews = today.due.filter((r) => r.phase === 'review').sort(byDue)
  const learning = today.due.filter((r) => r.phase === 'learning').sort(byDue)
  const now = Date.now()
  const nextDueAt = learners.map((r) => r.due_at).filter((due) => Date.parse(due) > now).sort()[0] ?? null
  const limit = Math.min(QUESTIONS_PER_SESSION, today.room)

  if (reviews.length + learning.length === 0 || limit === 0) {
    const openedIds = new Set(learners.map((r) => r.kanji_id))
    const next = limit === 0 ? [] : kanji.filter((k) => !openedIds.has(k.id)).slice(0, Math.min(INTROS_PER_SESSION, today.newToday))
    const examplesOf = next.length > 0 ? await readExamples(supabase, user.id, next.map((k) => k.id)) : () => []
    return {
      intros: next.map((k) => ({ ...revealOf(k), kanjiId: k.id, examples: examplesOf(k.id) })),
      questions: [],
      capReached: today.room === 0 && today.due.length > 0,
      nextDueAt,
    }
  }

  const rows = [...reviews, ...learning]
  const [{ data: logs, error }, words] = await Promise.all([
    supabase
      .from('kanji_logs')
      .select('learner_kanji_id, exercise_type, outcome, phase')
      .eq('user_id', user.id)
      .in('learner_kanji_id', rows.map((r) => r.id))
      .order('answered_at', { ascending: false })
      .range(0, PAGE - 1),
    readWordOptions(supabase, user.id, rows.map((r) => r.kanji_id)),
  ])
  if (error) throw new Error(`Không đọc được kanji_logs: ${error.message}`)

  const logsOf = (id: string) => (logs ?? []).filter((l) => l.learner_kanji_id === id)
  const toQuestion = (row: LearnerRow, exercise: KanjiExercise, wrongStreak: number): KanjiSessionQuestion => {
    const word = words.get(row.kanji_id) ?? null
    return {
      ...buildKanjiQuestion(byId.get(row.kanji_id)!, exercise, allKanji, word),
      learnerKanjiId: row.id,
      kanjiId: row.kanji_id,
      clientEventId: randomUUID(),
      phase: row.phase,
      wrongStreak,
    }
  }
  const streakOf = (own: readonly LogRow[]) => {
    const i = own.findIndex((l) => l.outcome !== 'wrong')
    return i === -1 ? own.length : i
  }

  const questions: KanjiSessionQuestion[] = reviews.map((row) => {
    const own = logsOf(row.id)
    return toQuestion(row, chooseReviewExercise(own[0]?.exercise_type ?? null, words.has(row.kanji_id)), streakOf(own))
  })
  const plans = learning.map((row) => {
    const own = logsOf(row.id)
    return { row, streak: streakOf(own), exercises: planSitting(row.points, countsFrom(own), today.leftInSitting(row), words.has(row.kanji_id)) }
  })
  for (let round = 0; plans.some((p) => p.exercises.length > round); round++) {
    for (const plan of plans) {
      if (plan.exercises.length > round) questions.push(toQuestion(plan.row, plan.exercises[round], plan.streak))
    }
  }
  return { intros: [], questions: questions.slice(0, limit), capReached: false, nextDueAt }
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
  return v as KanjiAnswerRequest
}

export type SubmitKanjiResponse =
  | { status: 'graded'; outcome: Outcome; answer: string; reveal: KanjiReveal; completed: boolean }
  | { status: 'invalid' | 'not_found' | 'conflict' }

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

/** Server chấm rồi mới tính điểm và lịch. */
export async function submitKanjiAnswer(input: unknown): Promise<SubmitKanjiResponse> {
  const req = parseAnswer(input)
  if (!req) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const row = await readAnswerContext(supabase, user.id, req.learnerKanjiId)
  if (!row) return { status: 'not_found' }

  const { outcome, answer } = gradeKanjiAnswer(row.kanji, req.exercise, req.answer, await readWordMeaning(supabase, row.kanji_id, req.wordId))
  const now = new Date()
  const today = studyDate(now)
  const reveal = revealOf(row.kanji)

  let schedule: Schedule
  let phase = row.phase
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
      .order('answered_at', { ascending: false })
      .range(0, PAGE - 1)
    if (error) throw new Error(`Không đọc được kanji_logs: ${error.message}`)
    const history = logs ?? []
    const streak = history.findIndex((l) => l.outcome !== 'correct')
    const result = applyLearningAnswer(
      { points, pointsToday, pointsDate, counts: countsFrom(history), correctStreak: streak === -1 ? history.length : streak },
      req.exercise,
      outcome,
      now,
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
      const next = answeredToday >= RULES_V4.kanji.questionsPerSitting ? nextSittingAt(now, sittingsDone) : { due: new Date(row.due_at), days: 0 }
      schedule = { ...scheduleOf(row), due: next.due, scheduledDays: next.days, reps: row.reps + 1, lastReviewAt: now }
    }
  } else {
    schedule = reviewLongTermSchedule(scheduleOf(row), outcome, now)
  }

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
