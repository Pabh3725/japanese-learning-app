// Grammar G4 — Data Access Layer. Server-only. Luật: docs/grammar-rules.md, engine: lib/grammar.
//   getGrammarOverview: bài 1–50, mở bài, việc hôm nay
//   getGrammarPoint: chi tiết một mẫu (Library, thẻ giới thiệu)
//   buildLearnSession / buildReviewSession / buildPracticeSession: dựng phiên (câu hỏi dựng sẵn, chấm lại ở server)
//   openGrammarPoint / submitGrammarAnswer: lưu đã xem thẻ, chấm và lưu một câu
//   startGrammarTest / saveTestAnswer / finishGrammarTest: bài kiểm tra
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { availableExercises, chooseExercise, chooseQuestion, levelsFor, type ExerciseHistory } from '@/lib/grammar/pick'
import { buildQuestion, gradeQuestion, publicQuestion, seededRng, type GrammarQuestion, type SentenceRow } from '@/lib/grammar/questions'
import {
  applyLearningAnswer,
  canComplete,
  exercisesUpTo,
  GRAMMAR_V1,
  lessonUnlock,
  newReviewSchedule,
  nextReviewSchedule,
  nextSittingAt,
  reviewRating,
  tierOf,
  type LearningLog,
  type LessonUnlock,
  type Tier,
} from '@/lib/grammar/rules'
import { GRAMMAR_EXERCISES, sentenceText, type GrammarExercise, type GrammarPiece, type GrammarSlot } from '@/lib/grammar/types'
import { studyDate } from '@/lib/learning/time'
import type { Outcome } from '@/lib/learning/types'
import type { Schedule } from '@/lib/srs/scheduler'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const N5_LAST_LESSON = 25

// ---------------------------------------------------------------------------
// Nội dung (chỉ mẫu đã duyệt, RLS lọc sẵn), lưu tạm 10 phút
// ---------------------------------------------------------------------------

export interface GrammarPointContent {
  id: string
  code: string
  lesson: number
  order: number
  pattern: string
  meaning: string
  explanation: string
  notes: string | null
  sentences: SentenceRow[]
  exercises: GrammarExercise[]
}

let contentCache: { at: number; value: GrammarPointContent[] } | null = null

async function readContent(supabase: Supabase): Promise<GrammarPointContent[]> {
  if (contentCache && Date.now() - contentCache.at < 10 * 60_000) return contentCache.value
  const { data: points, error } = await supabase.from('grammar_points').select('id, code, lesson, sort_order, pattern, meaning_vi, explanation, notes').order('lesson').order('sort_order').range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được grammar_points: ${error.message}`)
  const sentences: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error: e } = await supabase.from('grammar_sentences').select('id, code, point_id, level, pieces, meaning_vi, uses, slots, split, prompt, sample').order('code').range(from, from + PAGE - 1)
    if (e) throw new Error(`Không đọc được grammar_sentences: ${e.message}`)
    sentences.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGE) break
  }
  const byPoint = new Map<string, SentenceRow[]>()
  for (const r of sentences) {
    const row: SentenceRow = {
      id: r.id as string,
      code: r.code as string,
      level: r.level as 1 | 2 | 3,
      pieces: r.pieces as GrammarPiece[],
      meaning: r.meaning_vi as string,
      uses: (r.uses as string[]) ?? [],
      slots: (r.slots as GrammarSlot[]) ?? [],
      split: (r.split as number | null) ?? undefined,
      prompt: (r.prompt as SentenceRow['prompt']) ?? undefined,
      sample: r.sample as boolean,
    }
    byPoint.set(r.point_id as string, [...(byPoint.get(r.point_id as string) ?? []), row])
  }
  const value = (points ?? []).map((p) => {
    const rows = byPoint.get(p.id) ?? []
    return {
      id: p.id,
      code: p.code,
      lesson: p.lesson,
      order: p.sort_order,
      pattern: p.pattern,
      meaning: p.meaning_vi,
      explanation: p.explanation,
      notes: p.notes,
      sentences: rows,
      exercises: availableExercises(rows),
    }
  })
  contentCache = { at: Date.now(), value }
  return value
}

// ---------------------------------------------------------------------------
// Tiến độ
// ---------------------------------------------------------------------------

interface LearnerRow {
  id: string
  point_id: string
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
  completed_at: string | null
  archived_at: string | null
  version: number
  created_at: string
}

const LEARNER_COLUMNS = 'id, point_id, phase, points, points_today, points_date, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, completed_at, archived_at, version, created_at'

async function readLearners(supabase: Supabase, userId: string): Promise<LearnerRow[]> {
  const { data, error } = await supabase.from('learner_grammar').select(LEARNER_COLUMNS).eq('user_id', userId).range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_grammar: ${error.message}`)
  return (data ?? []) as LearnerRow[]
}

interface LogRow {
  learner_grammar_id: string | null
  point_id: string
  sentence_id: string
  mode: 'learning' | 'review' | 'practice' | 'test'
  exercise_type: GrammarExercise
  tier: Tier | null
  outcome: Outcome
  round_id: string | null
  study_date: string
  answered_at: string
}

async function readLogs(supabase: Supabase, userId: string, pointIds?: readonly string[]): Promise<LogRow[]> {
  const rows: LogRow[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from('grammar_logs').select('learner_grammar_id, point_id, sentence_id, mode, exercise_type, tier, outcome, round_id, study_date, answered_at').eq('user_id', userId)
    if (pointIds) q = q.in('point_id', [...pointIds])
    const { data, error } = await q.order('answered_at', { ascending: false }).range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được grammar_logs: ${error.message}`)
    rows.push(...((data ?? []) as LogRow[]))
    if ((data?.length ?? 0) < PAGE) break
  }
  return rows
}

const scheduleOf = (r: LearnerRow): Schedule => ({
  state: r.state as Schedule['state'],
  due: new Date(r.due_at),
  stability: r.stability,
  difficulty: r.difficulty,
  scheduledDays: r.scheduled_days,
  learningSteps: r.learning_steps,
  reps: r.reps,
  lapses: r.lapses,
  lastReviewAt: r.last_review_at ? new Date(r.last_review_at) : null,
})

interface GrammarSettings {
  newPerDay: number
  reviewCap: number
  furigana: boolean
}

async function readSettings(supabase: Supabase, userId: string): Promise<GrammarSettings> {
  const { data, error } = await supabase.from('learner_settings').select('grammar_new_per_day, grammar_review_cap, grammar_furigana').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  return {
    newPerDay: data?.grammar_new_per_day ?? GRAMMAR_V1.newPerDay.default,
    reviewCap: data?.grammar_review_cap ?? GRAMMAR_V1.review.maxPerDay,
    furigana: data?.grammar_furigana ?? true,
  }
}

/** Từ vựng mỗi bài: tổng (không tính từ bị loại vì đã biết thì tính là xong) và số đã xong Stage 3. */
async function readVocabProgress(supabase: Supabase, userId: string, lessons: readonly number[]): Promise<Map<number, { total: number; done: number }>> {
  const words: { id: string; lesson: number }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('vocabularies').select('id, lesson').in('lesson', [...lessons]).order('sort_order').range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được vocabularies: ${error.message}`)
    words.push(...((data ?? []) as { id: string; lesson: number }[]))
    if ((data?.length ?? 0) < PAGE) break
  }
  const [stage3, known] = await Promise.all([
    supabase.from('learner_stage_schedules').select('learner_vocabulary!inner(vocabulary_id)').eq('user_id', userId).eq('stage_number', 3).not('completed_at', 'is', null).range(0, 4 * PAGE),
    supabase.from('learner_vocabulary_exclusions').select('vocabulary_id').eq('user_id', userId).not('excluded_at', 'is', null).range(0, 4 * PAGE),
  ])
  if (stage3.error) throw new Error(`Không đọc được learner_stage_schedules: ${stage3.error.message}`)
  if (known.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${known.error.message}`)
  const done = new Set([
    ...((stage3.data ?? []) as unknown as { learner_vocabulary: { vocabulary_id: string } }[]).map((r) => r.learner_vocabulary.vocabulary_id),
    ...(known.data ?? []).map((r) => r.vocabulary_id as string),
  ])
  const out = new Map<number, { total: number; done: number }>()
  for (const w of words) {
    const cur = out.get(w.lesson) ?? { total: 0, done: 0 }
    cur.total++
    if (done.has(w.id)) cur.done++
    out.set(w.lesson, cur)
  }
  return out
}

// ---------------------------------------------------------------------------
// Tổng quan
// ---------------------------------------------------------------------------

export type PointStatus = 'locked' | 'new' | 'learning' | 'review'

export interface GrammarPointSummary {
  code: string
  lesson: number
  pattern: string
  meaning: string
  status: PointStatus
  points: number
}

export interface GrammarLessonSummary {
  lesson: number
  level: 'N5' | 'N4'
  points: GrammarPointSummary[]
  unlock: LessonUnlock
  done: number
}

export interface GrammarOverview {
  lessons: GrammarLessonSummary[]
  today: { newLeft: number; newPoints: string[]; learningDue: number; reviewDue: number; reviewedToday: number }
  settings: GrammarSettings
  /** Bài có mọi mẫu đã học xong (chọn được ở Kiểm tra). */
  testable: number[]
  /** Mẫu đã mở (luyện thêm được). */
  practicable: string[]
}

interface Snapshot {
  content: GrammarPointContent[]
  learners: LearnerRow[]
  logs: LogRow[]
  settings: GrammarSettings
  unlock: Map<number, LessonUnlock>
  userId: string
}

async function snapshot(supabase: Supabase, userId: string): Promise<Snapshot> {
  const content = await readContent(supabase)
  const lessons = [...new Set(content.map((p) => p.lesson))]
  const [learners, logs, settings, vocab] = await Promise.all([readLearners(supabase, userId), readLogs(supabase, userId), readSettings(supabase, userId), readVocabProgress(supabase, userId, lessons)])
  const byPoint = new Map(learners.map((l) => [l.point_id, l]))
  const unlock = new Map<number, LessonUnlock>()
  for (const lesson of lessons) {
    const prev = content.filter((p) => p.lesson === lesson - 1)
    const v = vocab.get(lesson) ?? { total: 0, done: 0 }
    unlock.set(lesson, lessonUnlock({ vocabTotal: v.total, vocabDone: v.done, previousTotal: prev.length, previousDone: prev.filter((p) => byPoint.get(p.id)?.phase === 'review').length }))
  }
  return { content, learners, logs, settings, unlock, userId }
}

/** Mẫu mới còn mở được hôm nay, theo thứ tự bài và thứ tự trong bài. */
function freshPoints(snap: Snapshot): GrammarPointContent[] {
  const today = studyDate(new Date())
  const opened = new Set(snap.learners.map((l) => l.point_id))
  const openedToday = snap.learners.filter((l) => studyDate(new Date(l.created_at)) === today).length
  const left = Math.max(0, snap.settings.newPerDay - openedToday)
  return snap.content.filter((p) => !opened.has(p.id) && snap.unlock.get(p.lesson)?.open).slice(0, left)
}

function answeredToday(snap: Snapshot, learnerId: string, mode: 'learning' | 'review'): number {
  const today = studyDate(new Date())
  return snap.logs.filter((l) => l.learner_grammar_id === learnerId && l.mode === mode && l.study_date === today).length
}

function dueLearning(snap: Snapshot): LearnerRow[] {
  const now = Date.now()
  return snap.learners.filter((l) => l.phase === 'learning' && Date.parse(l.due_at) <= now && answeredToday(snap, l.id, 'learning') < GRAMMAR_V1.learning.questionsPerSitting)
}

function reviewedTodayCount(snap: Snapshot): number {
  const today = studyDate(new Date())
  return new Set(snap.logs.filter((l) => l.mode === 'review' && l.study_date === today).map((l) => l.point_id)).size
}

function dueReview(snap: Snapshot): LearnerRow[] {
  const now = Date.now()
  const left = Math.max(0, snap.settings.reviewCap - reviewedTodayCount(snap))
  return snap.learners
    .filter((l) => l.phase === 'review' && !l.archived_at && Date.parse(l.due_at) <= now)
    .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at))
    .slice(0, left)
}

export async function getGrammarOverview(): Promise<GrammarOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const snap = await snapshot(supabase, user.id)
  const byPoint = new Map(snap.learners.map((l) => [l.point_id, l]))
  const lessons: GrammarLessonSummary[] = []
  for (let lesson = 1; lesson <= GRAMMAR_V1.lessons; lesson++) {
    const pts = snap.content.filter((p) => p.lesson === lesson)
    if (pts.length === 0) continue
    const unlock = snap.unlock.get(lesson)!
    const points = pts.map((p): GrammarPointSummary => {
      const l = byPoint.get(p.id)
      return { code: p.code, lesson, pattern: p.pattern, meaning: p.meaning, status: l ? l.phase : unlock.open ? 'new' : 'locked', points: l?.points ?? 0 }
    })
    lessons.push({ lesson, level: lesson <= N5_LAST_LESSON ? 'N5' : 'N4', points, unlock, done: points.filter((p) => p.status === 'review').length })
  }
  const fresh = freshPoints(snap)
  return {
    lessons,
    today: { newLeft: fresh.length, newPoints: fresh.map((p) => p.code), learningDue: dueLearning(snap).length, reviewDue: dueReview(snap).length, reviewedToday: reviewedTodayCount(snap) },
    settings: snap.settings,
    testable: lessons.filter((l) => l.points.length > 0 && l.points.every((p) => p.status === 'review')).map((l) => l.lesson),
    practicable: snap.learners.map((l) => snap.content.find((p) => p.id === l.point_id)?.code).filter((c): c is string => !!c),
  }
}

// ---------------------------------------------------------------------------
// Chi tiết một mẫu
// ---------------------------------------------------------------------------

export interface GrammarPointDetail {
  code: string
  lesson: number
  level: 'N5' | 'N4'
  pattern: string
  meaning: string
  explanation: string
  notes: string | null
  examples: { pieces: GrammarPiece[]; meaning: string; context?: { pieces: GrammarPiece[]; meaning: string } }[]
  status: PointStatus
  points: number
  dueAt: string | null
  /** Đã học nhưng không ôn (lưu trữ). */
  archived: boolean
}

export async function getGrammarPoint(code: unknown): Promise<GrammarPointDetail | null> {
  if (typeof code !== 'string' || !/^g\d{2}-\d{2}$/.test(code)) return null
  const user = await requireUser()
  const supabase = await createClient()
  const content = await readContent(supabase)
  const p = content.find((x) => x.code === code)
  if (!p) return null
  const snap = await snapshot(supabase, user.id)
  const l = snap.learners.find((x) => x.point_id === p.id)
  return {
    code: p.code,
    lesson: p.lesson,
    level: p.lesson <= N5_LAST_LESSON ? 'N5' : 'N4',
    pattern: p.pattern,
    meaning: p.meaning,
    explanation: p.explanation,
    notes: p.notes,
    examples: p.sentences.filter((s) => s.sample).map((s) => ({ pieces: s.pieces, meaning: s.meaning, context: s.prompt ? { pieces: s.prompt.pieces, meaning: s.prompt.meaning } : undefined })),
    status: l ? l.phase : snap.unlock.get(p.lesson)?.open ? 'new' : 'locked',
    points: l?.points ?? 0,
    dueAt: l?.due_at ?? null,
    archived: !!l?.archived_at,
  }
}

// ---------------------------------------------------------------------------
// Phiên học
// ---------------------------------------------------------------------------

export interface GrammarIntro {
  code: string
  pattern: string
  meaning: string
  explanation: string
  notes: string | null
  examples: GrammarPointDetail['examples']
}

export type GrammarStep =
  | { kind: 'intro'; key: string; point: GrammarIntro }
  | { kind: 'question'; key: string; pointCode: string; question: GrammarQuestion; clientEventId: string; roundId?: string; roundSize?: number }

export interface GrammarSession {
  mode: 'learning' | 'review' | 'practice'
  steps: GrammarStep[]
  furigana: boolean
}

const known = (snap: Snapshot) => new Set(snap.content.filter((p) => snap.learners.some((l) => l.point_id === p.id)).map((p) => p.code))

function lastSeenOf(snap: Snapshot): Map<string, number> {
  const out = new Map<string, number>()
  for (const l of snap.logs) if (!out.has(l.sentence_id)) out.set(l.sentence_id, Date.parse(l.answered_at))
  return out
}

function historyOf(snap: Snapshot, pointId: string, modes: LogRow['mode'][]): ExerciseHistory[] {
  return snap.logs.filter((l) => l.point_id === pointId && modes.includes(l.mode)).map((l) => ({ exercise: l.exercise_type, correct: l.outcome === 'correct' }))
}

/** Xen kẽ các hàng câu của từng mẫu: cùng mẫu cách nhau ít nhất 2 câu khi còn mẫu khác. */
function interleave<T extends { pointCode: string }>(queues: T[][]): T[] {
  const out: T[] = []
  const qs = queues.map((q) => [...q]).filter((q) => q.length)
  while (qs.some((q) => q.length)) {
    qs.sort((a, b) => b.length - a.length)
    const recent = out.slice(-2).map((x) => x.pointCode)
    const pick = qs.find((q) => q.length && !recent.includes(q[0].pointCode)) ?? qs.find((q) => q.length)!
    out.push(pick.shift()!)
  }
  return out
}

function introOf(p: GrammarPointContent): GrammarIntro {
  return {
    code: p.code,
    pattern: p.pattern,
    meaning: p.meaning,
    explanation: p.explanation,
    notes: p.notes,
    examples: p.sentences.filter((s) => s.level === 1).slice(0, 3).map((s) => ({ pieces: s.pieces, meaning: s.meaning, context: s.prompt ? { pieces: s.prompt.pieces, meaning: s.prompt.meaning } : undefined })),
  }
}

/** Phiên Học hôm nay: thẻ mẫu mới, rồi câu của các buổi đến hạn (mẫu mới làm buổi 1 ngay). */
export async function buildLearnSession(): Promise<GrammarSession> {
  const user = await requireUser()
  const supabase = await createClient()
  const snap = await snapshot(supabase, user.id)
  const fresh = freshPoints(snap)
  const due = dueLearning(snap)
  const rng = seededRng(Date.now() & 0x7fffffff)
  const lastSeen = lastSeenOf(snap)
  const knownCodes = new Set([...known(snap), ...fresh.map((p) => p.code)])
  const now = Date.now()

  const plan = (p: GrammarPointContent, points: number, left: number, history: ExerciseHistory[]): GrammarStep[] => {
    const steps: GrammarStep[] = []
    const hist = [...history]
    const used = new Set<string>()
    for (let i = 0; i < left; i++) {
      // Lên kế hoạch như thể trả lời đúng hết, để dạng bài tăng dần trong buổi
      const tier = tierOf(Math.min(points + i, GRAMMAR_V1.learning.completeAt))
      const exercise = chooseExercise(p.exercises, tier, hist, hist[0]?.exercise ?? null, rng)
      if (!exercise) break
      const q = chooseQuestion(p.sentences, exercise, levelsFor('learning', tier), knownCodes, lastSeen, now, rng, used)
      if (!q) continue
      used.add(q.sentenceId)
      hist.unshift({ exercise, correct: true })
      steps.push({ kind: 'question', key: `${p.code}:${i}`, pointCode: p.code, question: publicQuestion(q), clientEventId: randomUUID() })
    }
    return steps
  }

  const queues: GrammarStep[][] = []
  for (const l of due) {
    const p = snap.content.find((x) => x.id === l.point_id)
    if (!p) continue
    queues.push(plan(p, l.points, GRAMMAR_V1.learning.questionsPerSitting - answeredToday(snap, l.id, 'learning'), historyOf(snap, p.id, ['learning'])))
  }
  for (const p of fresh) queues.push(plan(p, 0, GRAMMAR_V1.learning.questionsPerSitting, []))
  const questions = interleave(queues.map((q) => q.filter((s): s is Extract<GrammarStep, { kind: 'question' }> => s.kind === 'question')))
  const intros: GrammarStep[] = fresh.map((p) => ({ kind: 'intro', key: `intro:${p.code}`, point: introOf(p) }))
  return { mode: 'learning', steps: [...intros, ...questions], furigana: snap.settings.furigana }
}

const UNDERSTAND: GrammarExercise[] = ['meaning_choice', 'listening', 'true_false']

/** Phiên Ôn: mỗi mẫu đến hạn 2–3 câu (1 câu "hiểu" + 1–2 câu "dùng/tạo"), các mẫu xen kẽ. */
export async function buildReviewSession(): Promise<GrammarSession> {
  const user = await requireUser()
  const supabase = await createClient()
  const snap = await snapshot(supabase, user.id)
  const rng = seededRng(Date.now() & 0x7fffffff)
  const lastSeen = lastSeenOf(snap)
  const knownCodes = known(snap)
  const now = Date.now()
  const queues: Extract<GrammarStep, { kind: 'question' }>[][] = []
  for (const l of dueReview(snap)) {
    const p = snap.content.find((x) => x.id === l.point_id)
    if (!p) continue
    const size = rng() < 0.5 ? 2 : 3
    const roundId = randomUUID()
    const hist = historyOf(snap, p.id, ['review'])
    const used = new Set<string>()
    const steps: Extract<GrammarStep, { kind: 'question' }>[] = []
    for (let i = 0; i < size; i++) {
      const allowed = i === 0 ? UNDERSTAND : GRAMMAR_EXERCISES.filter((e) => !UNDERSTAND.includes(e))
      const exercise = chooseExercise(p.exercises, null, hist, hist[0]?.exercise ?? null, rng, allowed) ?? chooseExercise(p.exercises, null, hist, null, rng)
      if (!exercise) break
      const q = chooseQuestion(p.sentences, exercise, levelsFor('review', null), knownCodes, lastSeen, now, rng, used)
      if (!q) continue
      used.add(q.sentenceId)
      hist.unshift({ exercise, correct: true })
      steps.push({ kind: 'question', key: `${p.code}:r${i}`, pointCode: p.code, question: publicQuestion(q), clientEventId: randomUUID(), roundId, roundSize: 0 })
    }
    for (const s of steps) s.roundSize = steps.length
    if (steps.length) queues.push(steps)
  }
  return { mode: 'review', steps: interleave(queues), furigana: snap.settings.furigana }
}

/** Luyện thêm: các mẫu đã mở người học chọn, dạng chọn (hoặc trộn). Không đổi điểm hay lịch. */
export async function buildPracticeSession(input: unknown): Promise<GrammarSession | { status: 'invalid' }> {
  const v = (input ?? {}) as { points?: unknown; exercises?: unknown; count?: unknown }
  const count = Number(v.count)
  if (!Array.isArray(v.points) || v.points.length === 0 || !Number.isInteger(count) || count < 5 || count > 50) return { status: 'invalid' }
  const exercises = Array.isArray(v.exercises) ? v.exercises.filter((e): e is GrammarExercise => GRAMMAR_EXERCISES.includes(e as GrammarExercise)) : []
  const user = await requireUser()
  const supabase = await createClient()
  const snap = await snapshot(supabase, user.id)
  const opened = known(snap)
  const chosen = snap.content.filter((p) => (v.points as unknown[]).includes(p.code) && opened.has(p.code))
  if (chosen.length === 0) return { status: 'invalid' }
  const rng = seededRng(Date.now() & 0x7fffffff)
  const lastSeen = lastSeenOf(snap)
  const now = Date.now()
  const steps: GrammarStep[] = []
  const hist = new Map(chosen.map((p) => [p.id, historyOf(snap, p.id, ['practice'])]))
  const used = new Set<string>()
  let last: GrammarExercise | null = null
  for (let i = 0; i < count * 3 && steps.length < count; i++) {
    const p = chosen[i % chosen.length]
    const h = hist.get(p.id)!
    const exercise = chooseExercise(p.exercises, null, h, last, rng, exercises.length ? exercises : undefined)
    if (!exercise) continue
    const q = chooseQuestion(p.sentences, exercise, levelsFor('practice', null), opened, lastSeen, now, rng, used)
    if (!q) continue
    used.add(q.sentenceId)
    h.unshift({ exercise, correct: true })
    last = exercise
    steps.push({ kind: 'question', key: `p:${i}`, pointCode: p.code, question: publicQuestion(q), clientEventId: randomUUID() })
  }
  return { mode: 'practice', steps, furigana: snap.settings.furigana }
}

/** Lưu đã xem thẻ: tạo tiến độ của mẫu (giai đoạn Học, buổi 1 đến hạn ngay). */
export async function openGrammarPoint(code: unknown): Promise<{ status: 'saved' | 'invalid' | 'locked' }> {
  if (typeof code !== 'string') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const snap = await snapshot(supabase, user.id)
  const p = snap.content.find((x) => x.code === code)
  if (!p) return { status: 'invalid' }
  if (!snap.unlock.get(p.lesson)?.open) return { status: 'locked' }
  if (snap.learners.some((l) => l.point_id === p.id)) return { status: 'saved' }
  const { error } = await supabase.from('learner_grammar').insert({ user_id: user.id, point_id: p.id })
  if (error && error.code !== '23505') throw new Error(`Không lưu được learner_grammar: ${error.message}`)
  return { status: 'saved' }
}

// ---------------------------------------------------------------------------
// Chấm và lưu một câu
// ---------------------------------------------------------------------------

export type GrammarAnswerResponse =
  | { status: 'graded'; correct: boolean; expected: string; answerId?: string; sentence: GrammarPiece[]; meaning: string; completed: boolean }
  | { status: 'invalid' | 'not_found' | 'conflict' | 'not_active' }

interface AnswerRequest {
  mode: 'learning' | 'review' | 'practice'
  pointCode: string
  sentenceId: string
  exercise: GrammarExercise
  seed: number
  answer: string | string[]
  clientEventId: string
  responseMs: number
  roundId?: string
  roundSize?: number
}

function parseAnswer(input: unknown): AnswerRequest | null {
  const v = input as Partial<AnswerRequest> | null
  if (!v || !['learning', 'review', 'practice'].includes(v.mode as string)) return null
  if (typeof v.pointCode !== 'string' || typeof v.sentenceId !== 'string' || !UUID.test(v.sentenceId)) return null
  if (!GRAMMAR_EXERCISES.includes(v.exercise as GrammarExercise) || !Number.isInteger(v.seed)) return null
  if (typeof v.clientEventId !== 'string' || !UUID.test(v.clientEventId)) return null
  const okAnswer = typeof v.answer === 'string' ? v.answer.length <= 200 : Array.isArray(v.answer) && v.answer.length <= 30 && v.answer.every((x) => typeof x === 'string' && x.length <= 50)
  if (!okAnswer) return null
  if (v.mode === 'review' && (typeof v.roundId !== 'string' || !UUID.test(v.roundId) || ![2, 3].includes(v.roundSize as number))) return null
  return { ...(v as AnswerRequest), responseMs: Math.max(0, Math.round(Number(v.responseMs) || 0)) }
}

/** Server dựng lại câu từ seed rồi chấm; Học đổi điểm và buổi, Ôn đổi FSRS ở câu cuối của lượt, Luyện thêm chỉ ghi nhật ký. */
export async function submitGrammarAnswer(input: unknown): Promise<GrammarAnswerResponse> {
  const req = parseAnswer(input)
  if (!req) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const content = await readContent(supabase)
  const p = content.find((x) => x.code === req.pointCode)
  const s = p?.sentences.find((x) => x.id === req.sentenceId)
  if (!p || !s) return { status: 'not_found' }
  const q = buildQuestion(s, req.exercise, p.sentences, req.seed)
  if (!q) return { status: 'invalid' }
  const { correct, expected, answerId } = gradeQuestion(s, q, req.answer)
  const outcome: Outcome = correct ? 'correct' : 'wrong'
  const now = new Date()
  const today = studyDate(now)
  const graded = (completed: boolean): GrammarAnswerResponse => ({ status: 'graded', correct, expected, answerId, sentence: s.pieces, meaning: s.meaning, completed })

  const { data: lrow, error: lerr } = await supabase.from('learner_grammar').select(LEARNER_COLUMNS).eq('user_id', user.id).eq('point_id', p.id).maybeSingle()
  if (lerr) throw new Error(`Không đọc được learner_grammar: ${lerr.message}`)
  const l = lrow as LearnerRow | null
  if (!l) return { status: 'not_active' }

  if (req.mode === 'practice') {
    const { error } = await supabase.from('grammar_logs').insert({
      user_id: user.id, learner_grammar_id: l.id, point_id: p.id, sentence_id: s.id, client_event_id: req.clientEventId,
      mode: 'practice', exercise_type: req.exercise, outcome, points: 0, study_date: today, response_time_ms: req.responseMs, answered_at: now.toISOString(),
    })
    if (error && error.code !== '23505') throw new Error(`Không ghi được grammar_logs: ${error.message}`)
    return graded(false)
  }

  const logs = await readLogs(supabase, user.id, [p.id])

  if (req.mode === 'learning') {
    if (l.phase !== 'learning') return { status: 'not_active' }
    const tier = tierOf(l.points)
    // Dạng phải thuộc bậc hiện tại hoặc bậc dưới
    if (!exercisesUpTo(tier, p.exercises).includes(req.exercise)) return { status: 'invalid' }
    const own = logs.filter((x) => x.learner_grammar_id === l.id && x.mode === 'learning')
    const result = applyLearningAnswer({ points: l.points, pointsToday: l.points_today, pointsDate: l.points_date }, outcome, now)
    const history: LearningLog[] = [{ exercise: req.exercise, tier, outcome }, ...own.map((x) => ({ exercise: x.exercise_type, tier: (x.tier ?? 1) as Tier, outcome: x.outcome }))]
    const completed = canComplete(result.state.points, history, p.exercises.length)
    let schedule: Schedule
    if (completed) schedule = newReviewSchedule(now)
    else {
      const answered = own.filter((x) => x.study_date === today).length + 1
      const sittings = new Set([...own.map((x) => x.study_date), today]).size
      const next = answered >= GRAMMAR_V1.learning.questionsPerSitting ? nextSittingAt(now, sittings) : { due: new Date(l.due_at), days: l.scheduled_days }
      schedule = { ...scheduleOf(l), due: next.due, scheduledDays: Math.min(next.days, 3), reps: l.reps + 1, lastReviewAt: now }
    }
    const { data, error } = await supabase.rpc('submit_grammar_learning', {
      p_learner_grammar_id: l.id, p_client_event_id: req.clientEventId, p_expected_version: l.version, p_sentence_id: s.id,
      p_exercise_type: req.exercise, p_tier: tier, p_outcome: outcome, p_points: result.delta, p_study_date: today,
      p_response_time_ms: req.responseMs, p_answered_at: now.toISOString(),
      p_phase: completed ? 'review' : 'learning', p_total_points: result.state.points, p_points_today: result.state.pointsToday, p_points_date: result.state.pointsDate,
      p_state: schedule.state, p_due_at: schedule.due.toISOString(), p_stability: schedule.stability, p_difficulty: schedule.difficulty,
      p_scheduled_days: schedule.scheduledDays, p_learning_steps: schedule.learningSteps, p_reps: schedule.reps, p_lapses: schedule.lapses,
      p_last_review_at: schedule.lastReviewAt?.toISOString() ?? null, p_completed: completed,
    })
    if (error) throw new Error(`submit_grammar_learning lỗi: ${error.message}`)
    const status = (data as { status: string }).status
    if (status === 'conflict' || status === 'not_found' || status === 'not_active') return { status }
    return graded(completed && status === 'saved')
  }

  // Ôn
  if (l.phase !== 'review') return { status: 'not_active' }
  const round = logs.filter((x) => x.round_id === req.roundId && x.mode === 'review')
  const finish = round.length + 1 >= req.roundSize!
  const schedule = finish ? nextReviewSchedule(scheduleOf(l), reviewRating([...round.map((x) => x.outcome), outcome]), now) : scheduleOf(l)
  const { data, error } = await supabase.rpc('submit_grammar_review', {
    p_learner_grammar_id: l.id, p_client_event_id: req.clientEventId, p_round_id: req.roundId, p_sentence_id: s.id,
    p_exercise_type: req.exercise, p_outcome: outcome, p_study_date: today, p_response_time_ms: req.responseMs, p_answered_at: now.toISOString(),
    p_finish: finish, p_expected_version: l.version, p_state: schedule.state, p_due_at: schedule.due.toISOString(), p_stability: schedule.stability,
    p_difficulty: schedule.difficulty, p_scheduled_days: schedule.scheduledDays, p_learning_steps: schedule.learningSteps, p_reps: schedule.reps,
    p_lapses: schedule.lapses, p_last_review_at: schedule.lastReviewAt?.toISOString() ?? null,
  })
  if (error) throw new Error(`submit_grammar_review lỗi: ${error.message}`)
  const status = (data as { status: string }).status
  if (status === 'conflict' || status === 'not_found' || status === 'not_active') return { status }
  return graded(false)
}

/** Hỏi lại câu sai cuối buổi: chỉ chấm, không ghi nhật ký, không đổi điểm hay lịch. */
export async function checkGrammarAnswer(input: unknown): Promise<GrammarAnswerResponse> {
  const req = parseAnswer({ ...(input as object), mode: 'practice' })
  if (!req) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const p = (await readContent(supabase)).find((x) => x.code === req.pointCode)
  const s = p?.sentences.find((x) => x.id === req.sentenceId)
  if (!p || !s) return { status: 'not_found' }
  const q = buildQuestion(s, req.exercise, p.sentences, req.seed)
  if (!q) return { status: 'invalid' }
  const { correct, expected, answerId } = gradeQuestion(s, q, req.answer)
  return { status: 'graded', correct, expected, answerId, sentence: s.pieces, meaning: s.meaning, completed: false }
}

// ---------------------------------------------------------------------------
// Kiểm tra (§9a)
// ---------------------------------------------------------------------------

export interface GrammarTestView {
  id: string
  lessons: number[]
  questions: (GrammarQuestion & { pointCode: string })[]
  answers: Record<string, string | string[]>
  furigana: boolean
}

export interface GrammarTestResult {
  id: string
  correct: number
  total: number
  byPoint: { code: string; pattern: string; correct: number; total: number }[]
  byExercise: { exercise: GrammarExercise; correct: number; total: number }[]
  items: { index: number; pointCode: string; correct: boolean; expected: string; sentence: GrammarPiece[]; meaning: string; explanation: string }[]
}

const TEST_SIZES = [10, 20, 30, 50]

export async function startGrammarTest(input: unknown): Promise<GrammarTestView | { status: 'invalid' | 'not_ready' }> {
  const v = (input ?? {}) as { lessons?: unknown; count?: unknown }
  const lessons = Array.isArray(v.lessons) ? [...new Set(v.lessons.filter((x): x is number => Number.isInteger(x)))] : []
  const count = Number(v.count)
  if (lessons.length === 0 || !TEST_SIZES.includes(count)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const snap = await snapshot(supabase, user.id)
  const byPoint = new Map(snap.learners.map((l) => [l.point_id, l]))
  const chosen = snap.content.filter((p) => lessons.includes(p.lesson))
  // Mọi mẫu của các bài đã chọn phải học xong
  if (chosen.length === 0 || chosen.some((p) => byPoint.get(p.id)?.phase !== 'review')) return { status: 'not_ready' }
  const rng = seededRng(Date.now() & 0x7fffffff)
  const used = new Set<string>()
  const all: ExerciseHistory[] = []
  const questions: (GrammarQuestion & { pointCode: string })[] = []
  const knownCodes = known(snap)
  for (let i = 0; i < count * 4 && questions.length < count; i++) {
    const p = chosen[i % chosen.length]
    const exercise = chooseExercise(p.exercises, null, all, all[0]?.exercise ?? null, rng)
    if (!exercise) continue
    const q = chooseQuestion(p.sentences, exercise, levelsFor('test', null), knownCodes, new Map(), Date.now(), rng, used)
    if (!q) continue
    used.add(q.sentenceId)
    all.unshift({ exercise, correct: true })
    questions.push({ ...q, pointCode: p.code })
  }
  // Chỉ lưu khoá để dựng lại câu (người học đọc được bảng này, không được thấy đáp án)
  const keys: TestKey[] = questions.map((q) => ({ pointCode: q.pointCode, sentenceId: q.sentenceId, exercise: q.exercise, seed: q.seed }))
  const { data, error } = await supabase.from('grammar_tests').insert({ user_id: user.id, lessons, question_count: keys.length, questions: keys }).select('id').single()
  if (error) throw new Error(`Không tạo được grammar_tests: ${error.message}`)
  return { id: data.id, lessons, questions: questions.map((q) => ({ ...publicQuestion(q), pointCode: q.pointCode })), answers: {}, furigana: snap.settings.furigana }
}

interface TestKey {
  pointCode: string
  sentenceId: string
  exercise: GrammarExercise
  seed: number
}

async function readTest(supabase: Supabase, userId: string, id: unknown) {
  if (typeof id !== 'string' || !UUID.test(id)) return null
  const { data, error } = await supabase.from('grammar_tests').select('id, lessons, questions, answers, status, correct').eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được grammar_tests: ${error.message}`)
  const t = data as { id: string; lessons: number[]; questions: TestKey[]; answers: Record<string, string | string[]>; status: string; correct: number | null } | null
  if (!t) return null
  const content = await readContent(supabase)
  const questions = t.questions.flatMap((k) => {
    const p = content.find((x) => x.code === k.pointCode)
    const s = p?.sentences.find((x) => x.id === k.sentenceId)
    const q = p && s ? buildQuestion(s, k.exercise, p.sentences, k.seed) : null
    return q ? [{ ...q, pointCode: k.pointCode }] : []
  })
  return { ...t, questions }
}

/** Bài kiểm tra đang làm (tải lại trang thì làm tiếp). */
export async function getGrammarTest(id: unknown): Promise<GrammarTestView | null> {
  const user = await requireUser()
  const supabase = await createClient()
  const t = await readTest(supabase, user.id, id)
  if (!t || t.status !== 'active') return null
  const settings = await readSettings(supabase, user.id)
  return { id: t.id, lessons: t.lessons, questions: t.questions.map((q) => ({ ...publicQuestion(q), pointCode: q.pointCode })), answers: t.answers, furigana: settings.furigana }
}

export async function saveTestAnswer(input: unknown): Promise<{ status: 'saved' | 'invalid' | 'not_found' }> {
  const v = (input ?? {}) as { id?: unknown; index?: unknown; answer?: unknown }
  const index = Number(v.index)
  const ok = typeof v.answer === 'string' ? v.answer.length <= 200 : Array.isArray(v.answer) && v.answer.length <= 30 && v.answer.every((x) => typeof x === 'string')
  if (!Number.isInteger(index) || index < 0 || !ok) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const t = await readTest(supabase, user.id, v.id)
  if (!t || t.status !== 'active' || index >= t.questions.length) return { status: 'not_found' }
  const { error } = await supabase.from('grammar_tests').update({ answers: { ...t.answers, [index]: v.answer } }).eq('id', t.id).eq('status', 'active')
  if (error) throw new Error(`Không lưu được grammar_tests: ${error.message}`)
  return { status: 'saved' }
}

export async function finishGrammarTest(id: unknown): Promise<GrammarTestResult | { status: 'not_found' }> {
  const user = await requireUser()
  const supabase = await createClient()
  const t = await readTest(supabase, user.id, id)
  if (!t) return { status: 'not_found' }
  const content = await readContent(supabase)
  const items: GrammarTestResult['items'] = []
  for (const [index, q] of t.questions.entries()) {
    const p = content.find((x) => x.code === q.pointCode)
    const s = p?.sentences.find((x) => x.id === q.sentenceId)
    if (!p || !s) continue
    const answer = t.answers[index]
    const r = answer === undefined ? { correct: false, expected: gradeQuestion(s, q, '').expected } : gradeQuestion(s, q, answer)
    items.push({ index, pointCode: p.code, correct: r.correct, expected: r.expected, sentence: s.pieces, meaning: s.meaning, explanation: p.explanation })
  }
  const correct = items.filter((i) => i.correct).length
  if (t.status === 'active') {
    const { error } = await supabase.from('grammar_tests').update({ status: 'finished', correct, finished_at: new Date().toISOString() }).eq('id', t.id).eq('status', 'active')
    if (error) throw new Error(`Không lưu được grammar_tests: ${error.message}`)
  }
  const byCode = new Map<string, { correct: number; total: number }>()
  const byEx = new Map<GrammarExercise, { correct: number; total: number }>()
  for (const [i, it] of items.entries()) {
    const c = byCode.get(it.pointCode) ?? { correct: 0, total: 0 }
    c.total++
    if (it.correct) c.correct++
    byCode.set(it.pointCode, c)
    const e = t.questions[i].exercise
    const x = byEx.get(e) ?? { correct: 0, total: 0 }
    x.total++
    if (it.correct) x.correct++
    byEx.set(e, x)
  }
  return {
    id: t.id,
    correct,
    total: items.length,
    byPoint: [...byCode].map(([code, v]) => ({ code, pattern: content.find((p) => p.code === code)?.pattern ?? code, ...v })),
    byExercise: [...byEx].map(([exercise, v]) => ({ exercise, ...v })),
    items,
  }
}

export { sentenceText }
