// Grammar G5 — Thể động từ: chỉ luyện, không lịch (docs/grammar-rules.md §10). Server-only.
//   getVerbOverview: các thể (mở theo bài), thống kê đúng/sai, số từ đã học
//   buildVerbSession: dựng phiên (ưu tiên từ đã xong Stage 2, từ hay sai, lâu chưa luyện)
//   submitVerbAnswer: chấm lại ở server và ghi verb_practice_logs
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readLessonOpen } from '@/lib/dal/grammar'
import verbData from '@/data/n5/verbs.json'
import { conjugate, VERB_FORMS, type VerbFormId } from '@/lib/verbs/conjugate'
import { buildVerbQuestion, gradeVerbQuestion, VERB_EXERCISES, type VerbExercise, type VerbQuestion } from '@/lib/verbs/questions'
import { isVerb, type VerbWord } from '@/lib/verbs/types'
import { studyDate } from '@/lib/learning/time'

type Supabase = Awaited<ReturnType<typeof createClient>>

const WORDS = (verbData as { words: VerbWord[] }).words
const BY_CODE = new Map(WORDS.map((w) => [w.code, w]))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE = 1000

export interface VerbFormSummary {
  id: VerbFormId
  label: string
  lesson: number
  for: 'verb' | 'adj'
  open: boolean
  answered: number
  correct: number
}

export interface VerbOverview {
  forms: VerbFormSummary[]
  learnedVerbs: number
  learnedAdjectives: number
}

interface Ctx {
  unlocked: VerbFormId[]
  learned: Set<string>
  maxLesson: number
  vocabId: Map<string, string>
}

/** Thể đã mở, từ đã học (xong Stage 2 hoặc đã đánh dấu đã biết), bài lớn nhất đã mở, code → id. */
async function context(supabase: Supabase, userId: string): Promise<Ctx> {
  const codes = WORDS.map((w) => w.code)
  const [open, stage2, known, ids] = await Promise.all([
    readLessonOpen(supabase, userId, Array.from({ length: 50 }, (_, i) => i + 1)),
    supabase.from('learner_stage_schedules').select('learner_vocabulary!inner(vocabulary_id)').eq('user_id', userId).eq('stage_number', 2).not('completed_at', 'is', null).range(0, 4 * PAGE),
    supabase.from('learner_vocabulary_exclusions').select('vocabulary_id').eq('user_id', userId).not('excluded_at', 'is', null).range(0, 4 * PAGE),
    supabase.from('vocabularies').select('id, code').in('code', codes),
  ])
  if (stage2.error) throw new Error(`Không đọc được learner_stage_schedules: ${stage2.error.message}`)
  if (known.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${known.error.message}`)
  if (ids.error) throw new Error(`Không đọc được vocabularies: ${ids.error.message}`)
  const vocabId = new Map((ids.data ?? []).map((r) => [r.code as string, r.id as string]))
  const codeOf = new Map([...vocabId].map(([c, id]) => [id, c]))
  const learned = new Set(
    [...((stage2.data ?? []) as unknown as { learner_vocabulary: { vocabulary_id: string } }[]).map((r) => r.learner_vocabulary.vocabulary_id), ...(known.data ?? []).map((r) => r.vocabulary_id as string)]
      .map((id) => codeOf.get(id))
      .filter((c): c is string => !!c),
  )
  const openLessons = [...open].filter(([, u]) => u.open).map(([l]) => l)
  const maxLesson = openLessons.length ? Math.max(...openLessons) : 0
  const unlocked = VERB_FORMS.filter((f) => open.get(f.lesson)?.open).map((f) => f.id)
  return { unlocked, learned, maxLesson, vocabId }
}

async function readLogs(supabase: Supabase, userId: string) {
  const { data, error } = await supabase.from('verb_practice_logs').select('vocabulary_id, form, outcome, answered_at').eq('user_id', userId).order('answered_at', { ascending: false }).range(0, 2 * PAGE - 1)
  if (error) throw new Error(`Không đọc được verb_practice_logs: ${error.message}`)
  return (data ?? []) as { vocabulary_id: string; form: VerbFormId; outcome: 'correct' | 'wrong'; answered_at: string }[]
}

export async function getVerbOverview(): Promise<VerbOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const [ctx, logs] = await Promise.all([context(supabase, user.id), readLogs(supabase, user.id)])
  const forms = VERB_FORMS.map((f) => {
    const own = logs.filter((l) => l.form === f.id)
    return { id: f.id, label: f.label, lesson: f.lesson, for: f.for, open: ctx.unlocked.includes(f.id), answered: own.length, correct: own.filter((l) => l.outcome === 'correct').length }
  })
  const learnedWords = WORDS.filter((w) => ctx.learned.has(w.code))
  return { forms, learnedVerbs: learnedWords.filter((w) => isVerb(w.kind)).length, learnedAdjectives: learnedWords.filter((w) => !isVerb(w.kind)).length }
}

export interface VerbSession {
  questions: (VerbQuestion & { clientEventId: string })[]
}

/** Phiên luyện: các thể đã chọn (chỉ thể đã mở) xoay vòng đều; từ đã học trước, rồi từ của các bài đã mở. */
export async function buildVerbSession(input: unknown): Promise<VerbSession | { status: 'invalid' }> {
  const v = (input ?? {}) as { forms?: unknown; exercises?: unknown; count?: unknown }
  const count = Number(v.count)
  if (!Array.isArray(v.forms) || !Number.isInteger(count) || count < 5 || count > 50) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const [ctx, logs] = await Promise.all([context(supabase, user.id), readLogs(supabase, user.id)])
  const forms = ctx.unlocked.filter((f) => (v.forms as unknown[]).includes(f))
  const exercises = Array.isArray(v.exercises) ? VERB_EXERCISES.filter((e) => (v.exercises as unknown[]).includes(e)) : []
  if (forms.length === 0) return { status: 'invalid' }
  const types: VerbExercise[] = exercises.length ? exercises : [...VERB_EXERCISES]

  // Điểm ưu tiên của từ: đã học trước; hay sai; lâu chưa luyện
  const idOf = ctx.vocabId
  const stat = new Map<string, { wrong: number; last: number }>()
  for (const l of logs) {
    const s = stat.get(l.vocabulary_id) ?? { wrong: 0, last: 0 }
    if (l.outcome === 'wrong') s.wrong++
    s.last = Math.max(s.last, Date.parse(l.answered_at))
    stat.set(l.vocabulary_id, s)
  }
  const pool = WORDS.filter((w) => ctx.learned.has(w.code) || w.lesson <= ctx.maxLesson)
  const score = (w: VerbWord) => {
    const s = stat.get(idOf.get(w.code) ?? '')
    return (ctx.learned.has(w.code) ? 1000 : 0) + (s?.wrong ?? 0) * 50 - (s?.last ? (Date.now() - s.last) / 86_400_000 > 3 ? 0 : 30 : -20) + Math.random() * 40
  }
  const ranked = [...pool].sort((a, b) => score(b) - score(a))
  const questions: VerbSession['questions'] = []
  const used = new Set<string>()
  for (let i = 0; questions.length < count && i < count * 6; i++) {
    const form = forms[i % forms.length]
    const exercise = types[Math.floor(i / forms.length) % types.length]
    const word = ranked.find((w) => !used.has(`${w.code}:${form}`) && conjugate(w, form) !== null)
    if (!word) continue
    used.add(`${word.code}:${form}`)
    const q = buildVerbQuestion(word, form, exercise, ctx.unlocked, Math.floor(Math.random() * 2 ** 31))
    if (q) questions.push({ ...q, clientEventId: randomUUID() })
  }
  return { questions }
}

export type VerbAnswerResponse = { status: 'graded'; correct: boolean; expected: string; expectedReading: string } | { status: 'invalid' | 'not_found' }

export async function submitVerbAnswer(input: unknown): Promise<VerbAnswerResponse> {
  const v = (input ?? {}) as { code?: unknown; form?: unknown; exercise?: unknown; seed?: unknown; answer?: unknown; clientEventId?: unknown; responseMs?: unknown }
  if (typeof v.code !== 'string' || !VERB_FORMS.some((f) => f.id === v.form) || !VERB_EXERCISES.includes(v.exercise as VerbExercise)) return { status: 'invalid' }
  if (!Number.isInteger(v.seed) || typeof v.answer !== 'string' || v.answer.length > 100 || typeof v.clientEventId !== 'string' || !UUID.test(v.clientEventId)) return { status: 'invalid' }
  const word = BY_CODE.get(v.code)
  if (!word) return { status: 'not_found' }
  const user = await requireUser()
  const supabase = await createClient()
  const ctx = await context(supabase, user.id)
  if (!ctx.unlocked.includes(v.form as VerbFormId)) return { status: 'invalid' }
  const q = buildVerbQuestion(word, v.form as VerbFormId, v.exercise as VerbExercise, ctx.unlocked, v.seed as number)
  if (!q) return { status: 'invalid' }
  const g = gradeVerbQuestion(word, q, v.answer, ctx.unlocked)
  const vocabularyId = ctx.vocabId.get(word.code)
  if (vocabularyId) {
    const { error } = await supabase.from('verb_practice_logs').insert({
      user_id: user.id, vocabulary_id: vocabularyId, form: v.form, exercise_type: v.exercise, outcome: g.correct ? 'correct' : 'wrong',
      client_event_id: v.clientEventId, study_date: studyDate(new Date()), response_time_ms: Math.max(0, Math.round(Number(v.responseMs) || 0)),
    })
    if (error && error.code !== '23505') throw new Error(`Không ghi được verb_practice_logs: ${error.message}`)
  }
  return { status: 'graded', correct: g.correct, expected: g.expected, expectedReading: g.expectedReading }
}
