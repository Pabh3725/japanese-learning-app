// Grammar §9a — bài kiểm tra: startGrammarTest / saveTestAnswer / finishGrammarTest. Tách từ lib/dal/grammar.ts.
// Chỉ câu mức 3 của bài đã học xong mọi mẫu; không đổi điểm hay lịch. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { chooseExercise, chooseQuestion, levelsFor, type ExerciseHistory } from '@/lib/grammar/pick'
import { buildQuestion, gradeQuestion, publicQuestion, seededRng, type GrammarQuestion } from '@/lib/grammar/questions'
import { sentenceText, type GrammarExercise, type GrammarPiece } from '@/lib/grammar/types'
import { known, readContent, readSettings, snapshot } from '@/lib/dal/grammar'

type Supabase = Awaited<ReturnType<typeof createClient>>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
