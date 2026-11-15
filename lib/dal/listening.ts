// LISTENING_V1 — Data Access Layer (docs/listening-rules.md). Server-only.
// Dựng câu ở server, lưu cả phiên (đáp án không gửi trước cho trình duyệt), chấm ở server.
// Không đổi điểm, lịch hay FSRS nào; mỗi câu ghi listening_logs.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readAllPages } from '@/lib/dal/pages'
import { readContent } from '@/lib/dal/grammar'
import { readKnownWordIds } from '@/lib/dal/known-words'
import { isJlptLevel, LESSONS_OF, type JlptLevel } from '@/lib/jlpt/catalog'
import { approvedItems, type LevelContent, type ListeningItem, type VerbalItem } from '@/lib/jlpt/content'
import { shuffle } from '@/lib/jlpt/reading'
import {
  buildLessonSession,
  buildMock,
  gradeListening,
  isLessonMode,
  LISTENING_V1,
  publicListeningQuestion,
  scoreMock,
  type LessonMode,
  type LessonSentence,
  type LessonType,
  type LessonWord,
  type ListeningQuestion,
  type MockSectionScore,
  type PublicListeningQuestion,
} from '@/lib/listening/questions'
import { addStudyDays, studyDate } from '@/lib/learning/time'
import n5Content from '@/data/jlpt/n5.json'
import n4Content from '@/data/jlpt/n4.json'

type Supabase = Awaited<ReturnType<typeof createClient>>
type Kind = 'lesson' | 'jlpt_mock'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const JLPT_CONTENT: Record<JlptLevel, LevelContent> = { N5: n5Content as LevelContent, N4: n4Content as LevelContent }
/** Từ không đọc thành tiếng được trọn vẹn (mẫu có ～, chú thích trong ngoặc) thì không chép chính tả. */
const NOT_DICTABLE = /[～〜（）()…]/

// ---------------------------------------------------------------------------
// Dữ liệu theo bài (lưu tạm 10 phút)
// ---------------------------------------------------------------------------

type WordRow = LessonWord & { lesson: number }
let wordsCache: { at: number; value: WordRow[] } | null = null

async function readLessonWords(supabase: Supabase): Promise<WordRow[]> {
  if (wordsCache && Date.now() - wordsCache.at < 10 * 60_000) return wordsCache.value
  const rows = await readAllPages('vocabularies', (from, to) => supabase.from('vocabularies').select('id, code, expression, reading_kana, meaning_vi, lesson').order('sort_order').range(from, to))
  const value = rows
    .filter((r) => r.lesson !== null)
    .map((r) => ({ id: r.id as string, code: r.code as string, expression: r.expression as string, reading: r.reading_kana as string, meaning: r.meaning_vi as string, lesson: r.lesson as number }))
  wordsCache = { at: Date.now(), value }
  return value
}

async function readLessonSentences(supabase: Supabase): Promise<Map<number, LessonSentence[]>> {
  const content = await readContent(supabase)
  const byLesson = new Map<number, LessonSentence[]>()
  for (const p of content) {
    const list = byLesson.get(p.lesson) ?? []
    for (const s of p.sentences) list.push({ ...s, pattern: p.pattern, patternMeaning: p.meaning, pointCode: p.code })
    byLesson.set(p.lesson, list)
  }
  return byLesson
}

/** Mã câu → thời điểm làm gần nhất (để ưu tiên câu chưa gặp hoặc làm lâu nhất). */
async function readLastUsed(supabase: Supabase, userId: string, kind: Kind, filter: { lesson?: number; level?: JlptLevel }): Promise<Map<string, number>> {
  const rows = await readAllPages('listening_logs', (from, to) => {
    let q = supabase.from('listening_logs').select('ref, answered_at').eq('user_id', userId).eq('kind', kind)
    if (filter.lesson !== undefined) q = q.eq('lesson', filter.lesson)
    if (filter.level !== undefined) q = q.eq('level', filter.level)
    return q.order('id').range(from, to)
  })
  const last = new Map<string, number>()
  for (const r of rows as { ref: string; answered_at: string }[]) last.set(r.ref, Math.max(last.get(r.ref) ?? 0, Date.parse(r.answered_at)))
  return last
}

// ---------------------------------------------------------------------------
// Tạo phiên
// ---------------------------------------------------------------------------

type StartResult = { status: 'saved'; id: string } | { status: 'invalid' | 'empty' }

async function insertSession(supabase: Supabase, userId: string, row: { kind: Kind; lesson?: number; level?: JlptLevel; mode: string; questions: ListeningQuestion[] }): Promise<StartResult> {
  if (row.questions.length === 0) return { status: 'empty' }
  const { data, error } = await supabase
    .from('listening_sessions')
    .insert({ user_id: userId, kind: row.kind, lesson: row.lesson ?? null, level: row.level ?? null, mode: row.mode, questions: row.questions })
    .select('id')
    .single()
  if (error) throw new Error(`Không tạo được listening_sessions: ${error.message}`)
  return { status: 'saved', id: data.id as string }
}

export async function startLessonListening(input: unknown): Promise<StartResult> {
  const v = (input ?? {}) as { lesson?: unknown; mode?: unknown; count?: unknown }
  const lesson = Number(v.lesson)
  const count = Number(v.count)
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > 50 || !isLessonMode(v.mode) || !LISTENING_V1.sessionSizes.includes(count as 10 | 20)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const [words, sentences, recent] = await Promise.all([readLessonWords(supabase), readLessonSentences(supabase), readLastUsed(supabase, user.id, 'lesson', { lesson })])
  const questions = buildLessonSession(
    lesson,
    v.mode,
    count,
    sentences.get(lesson) ?? [],
    words.filter((w) => w.lesson === lesson && !NOT_DICTABLE.test(w.expression)),
    Math.random,
    recent,
  )
  return insertSession(supabase, user.id, { kind: 'lesson', lesson, mode: v.mode, questions })
}

export async function startMockListening(input: unknown): Promise<StartResult> {
  const v = (input ?? {}) as { level?: unknown }
  if (!isJlptLevel(v.level)) return { status: 'invalid' }
  const level = v.level
  const user = await requireUser()
  const supabase = await createClient()
  const [sentences, lastUsed] = await Promise.all([readLessonSentences(supabase), readLastUsed(supabase, user.id, 'jlpt_mock', { level })])
  const content = JLPT_CONTENT[level]
  const listening = approvedItems(content, 'listening_task') as ListeningItem[]
  const [first, last] = LESSONS_OF[level]
  const quick = [...sentences.entries()].filter(([l]) => l >= first && l <= last).flatMap(([, list]) => list.filter((s) => s.prompt))
  const questions = buildMock(
    level,
    { task: listening.filter((i) => i.kind === 'task'), point: listening.filter((i) => i.kind === 'point'), verbal: approvedItems(content, 'verbal_expressions') as VerbalItem[], quick },
    lastUsed,
    Math.random,
  )
  return insertSession(supabase, user.id, { kind: 'jlpt_mock', level, mode: 'mock', questions })
}

// ---------------------------------------------------------------------------
// Làm bài
// ---------------------------------------------------------------------------

type SessionRow = {
  id: string
  kind: Kind
  lesson: number | null
  level: JlptLevel | null
  mode: string
  questions: ListeningQuestion[]
  answers: Record<string, number | string>
  status: 'active' | 'finished'
  started_at: string
}

async function readSession(supabase: Supabase, userId: string, id: unknown): Promise<SessionRow | null> {
  if (typeof id !== 'string' || !UUID.test(id)) return null
  const { data, error } = await supabase
    .from('listening_sessions')
    .select('id, kind, lesson, level, mode, questions, answers, status, started_at')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được listening_sessions: ${error.message}`)
  return (data as SessionRow | null) ?? null
}

/** Kết quả một câu, gửi cho trình duyệt sau khi đã trả lời. */
export interface ListeningResult {
  given: number | string
  correct: boolean
  answer: number | string
  explanation: string
  transcript: ListeningQuestion['transcript']
  /** Lựa chọn chữ (phòng câu ẩn lựa chọn): hiện sau khi trả lời. */
  options: string[]
}

const resultOf = (q: ListeningQuestion, given: number | string): ListeningResult => ({
  given,
  correct: gradeListening(q, given)?.correct === true,
  answer: q.answer,
  explanation: q.explanation,
  transcript: q.transcript,
  options: q.options,
})

export interface ListeningSessionView {
  id: string
  kind: Kind
  lesson: number | null
  level: JlptLevel | null
  mode: string
  finished: boolean
  startedAt: string
  questions: PublicListeningQuestion[]
  /** Theo bài: kết quả các câu đã trả lời. Thi thử: chỉ khi đã nộp. */
  answered: Record<number, ListeningResult>
  /** Thi thử chưa nộp: câu đã chọn (chưa chấm). */
  chosen: Record<number, number | string>
}

export async function getListeningSession(id: unknown): Promise<ListeningSessionView | null> {
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, id)
  if (!s) return null
  const reveal = s.kind === 'lesson' || s.status === 'finished'
  const answered: Record<number, ListeningResult> = {}
  if (reveal) for (const [k, given] of Object.entries(s.answers)) answered[Number(k)] = resultOf(s.questions[Number(k)], given)
  return {
    id: s.id,
    kind: s.kind,
    lesson: s.lesson,
    level: s.level,
    mode: s.mode,
    finished: s.status === 'finished',
    startedAt: s.started_at,
    questions: s.questions.map(publicListeningQuestion),
    answered,
    chosen: reveal ? {} : { ...s.answers },
  }
}

export type AnswerListeningResponse = ({ status: 'graded' } & ListeningResult) | { status: 'saved' } | { status: 'invalid' | 'not_found' | 'finished' }

/**
 * Theo bài: chấm ngay. Thi thử: chỉ lưu lựa chọn, chấm khi nộp; không cho đổi câu đã trả lời (không quay lại).
 * `withAudio` false: thiết bị không có giọng Nhật, câu không tính vào tỷ lệ đúng.
 */
export async function answerListening(input: unknown): Promise<AnswerListeningResponse> {
  const v = (input ?? {}) as { id?: unknown; index?: unknown; answer?: unknown; withAudio?: unknown }
  const index = Number(v.index)
  if (!Number.isInteger(index) || index < 0) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, v.id)
  if (!s || index >= s.questions.length) return { status: 'not_found' }
  if (s.status === 'finished') return { status: 'finished' }
  const q = s.questions[index]
  const graded = gradeListening(q, v.answer)
  if (!graded) return { status: 'invalid' }
  const prev = s.answers[String(index)]
  if (prev !== undefined) return s.kind === 'lesson' ? { status: 'graded', ...resultOf(q, prev) } : { status: 'saved' }
  const given = v.answer as number | string
  const { error } = await supabase.from('listening_sessions').update({ answers: { ...s.answers, [index]: given } }).eq('id', s.id).eq('user_id', user.id)
  if (error) throw new Error(`Không lưu được listening_sessions: ${error.message}`)
  const { error: logError } = await supabase.from('listening_logs').insert({
    user_id: user.id,
    session_id: s.id,
    question_index: index,
    kind: s.kind,
    lesson: s.lesson,
    level: s.level,
    type: q.type,
    ref: q.ref,
    correct: graded.correct,
    with_audio: v.withAudio !== false,
    study_date: studyDate(new Date()),
  })
  if (logError && logError.code !== '23505') throw new Error(`Không ghi được listening_logs: ${logError.message}`)
  return s.kind === 'lesson' ? { status: 'graded', ...resultOf(q, given) } : { status: 'saved' }
}

export interface ListeningSummary {
  total: number
  correct: number
  wrong: number
  byType: { type: string; total: number; correct: number }[]
  /** Thi thử: điểm từng 問題. */
  sections?: MockSectionScore[]
}

export async function finishListening(id: unknown): Promise<ListeningSummary | { status: 'not_found' }> {
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, id)
  if (!s) return { status: 'not_found' }
  const results = s.questions.map((q, i) => ({ type: q.type, correct: gradeListening(q, s.answers[String(i)])?.correct === true }))
  const correct = results.filter((r) => r.correct).length
  const sections = s.kind === 'jlpt_mock' ? scoreMock(s.questions, s.answers) : undefined
  if (s.status === 'active') {
    const { error } = await supabase
      .from('listening_sessions')
      .update({ status: 'finished', correct, summary: sections ?? null, finished_at: new Date().toISOString() })
      .eq('id', s.id)
      .eq('user_id', user.id)
    if (error) throw new Error(`Không lưu được listening_sessions: ${error.message}`)
  }
  const types = [...new Set(results.map((r) => r.type))]
  return {
    total: results.length,
    correct,
    wrong: results.length - correct,
    byType: types.map((type) => ({ type, total: results.filter((r) => r.type === type).length, correct: results.filter((r) => r.type === type && r.correct).length })),
    sections,
  }
}

/** Theo bài: phiên mới chỉ gồm câu sai (hoặc bỏ qua), xáo lại lựa chọn. */
export async function retryWrongListening(id: unknown): Promise<StartResult | { status: 'not_found' }> {
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, id)
  if (!s || s.kind !== 'lesson') return { status: 'not_found' }
  const wrong = s.questions.filter((q, i) => gradeListening(q, s.answers[String(i)])?.correct !== true)
  const questions = wrong.map((q) => {
    if (typeof q.answer !== 'number') return q
    const options = shuffle(q.options, Math.random)
    return { ...q, options, answer: options.indexOf(q.options[q.answer]) }
  })
  return insertSession(supabase, user.id, { kind: 'lesson', lesson: s.lesson!, mode: s.mode, questions: shuffle(questions, Math.random) })
}

// ---------------------------------------------------------------------------
// Tổng quan
// ---------------------------------------------------------------------------

export interface ListeningOverview {
  lessons: { lesson: number; learned: boolean; total: number; correct: number }[]
  mocks: { id: string; level: JlptLevel; date: string; correct: number; total: number; sections: MockSectionScore[] }[]
  byType: Partial<Record<LessonType, { total: number; correct: number }>>
}

export async function getListeningOverview(): Promise<ListeningOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const since = addStudyDays(studyDate(new Date()), -LISTENING_V1.statsDays)
  const [logs, mocks, words, content, met, known, opened] = await Promise.all([
    readAllPages('listening_logs', (from, to) =>
      supabase.from('listening_logs').select('lesson, type, correct').eq('user_id', user.id).eq('kind', 'lesson').eq('with_audio', true).gte('study_date', since).order('id').range(from, to),
    ),
    supabase.from('listening_sessions').select('id, level, finished_at, correct, summary').eq('user_id', user.id).eq('kind', 'jlpt_mock').eq('status', 'finished').order('finished_at', { ascending: false }).limit(10),
    readLessonWords(supabase),
    readContent(supabase),
    readAllPages('learner_vocabulary', (from, to) => supabase.from('learner_vocabulary').select('vocabulary_id').eq('user_id', user.id).order('id').range(from, to)),
    readKnownWordIds(supabase, user.id),
    readAllPages('learner_grammar', (from, to) => supabase.from('learner_grammar').select('point_id').eq('user_id', user.id).order('id').range(from, to)),
  ])
  if (mocks.error) throw new Error(`Không đọc được listening_sessions: ${mocks.error.message}`)

  // Bài đã học: có từ đã gặp / đã biết, hoặc mẫu ngữ pháp đã mở
  const learnedWords = new Set([...met.map((r) => r.vocabulary_id as string), ...known])
  const openedPoints = new Set(opened.map((r) => r.point_id as string))
  const learned = new Set<number>([...words.filter((w) => learnedWords.has(w.id)).map((w) => w.lesson), ...content.filter((p) => openedPoints.has(p.id)).map((p) => p.lesson)])

  const byLesson = new Map<number, { total: number; correct: number }>()
  const byType: ListeningOverview['byType'] = {}
  for (const r of logs as { lesson: number; type: LessonType; correct: boolean }[]) {
    const l = byLesson.get(r.lesson) ?? { total: 0, correct: 0 }
    l.total++
    if (r.correct) l.correct++
    byLesson.set(r.lesson, l)
    const t = byType[r.type] ?? { total: 0, correct: 0 }
    t.total++
    if (r.correct) t.correct++
    byType[r.type] = t
  }
  return {
    lessons: Array.from({ length: 50 }, (_, i) => i + 1).map((lesson) => ({ lesson, learned: learned.has(lesson), ...(byLesson.get(lesson) ?? { total: 0, correct: 0 }) })),
    mocks: ((mocks.data ?? []) as { id: string; level: JlptLevel; finished_at: string; correct: number; summary: MockSectionScore[] | null }[]).map((m) => ({
      id: m.id,
      level: m.level,
      date: m.finished_at,
      correct: m.correct,
      total: (m.summary ?? []).reduce((n, s) => n + s.total, 0),
      sections: m.summary ?? [],
    })),
    byType,
  }
}

export type { LessonMode }
