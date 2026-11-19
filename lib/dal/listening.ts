// LISTENING_V2 — Data Access Layer (docs/listening-rules.md). Server-only.
// Dựng câu ở server, lưu cả phiên (đáp án không gửi trước cho trình duyệt), chấm ở server.
// Không đổi điểm, lịch hay FSRS nào; mỗi câu ghi listening_logs.
import 'server-only'
import { readKanaStages } from '@/lib/dal/v12/state'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readAllPages } from '@/lib/dal/pages'
import { readContent } from '@/lib/dal/grammar'
import { readKnownWordIds } from '@/lib/dal/known-words'
import { isJlptLevel, LESSONS_OF, type JlptLevel } from '@/lib/jlpt/catalog'
import { approvedItems, type LevelContent, type ListeningItem, type VerbalItem } from '@/lib/jlpt/content'
import { shuffle } from '@/lib/jlpt/reading'
import { buildNumbersSession, isNumberGroup, isNumbersMode, numberQuestionOf } from '@/lib/listening/numbers'
import { buildPointStage, isStage, pointStages, POINT_LISTENING, stagePassed, type Stage } from '@/lib/listening/points'
import {
  buildHeardSentence,
  buildLessonSession,
  buildMock,
  buildReply,
  buildSentenceDictation,
  buildSentenceMeaning,
  GRAMMAR_LISTENING_TYPES,
  gradeListening,
  isLessonMode,
  LISTENING_V1,
  openMistakes,
  publicListeningQuestion,
  scoreMock,
  type LessonMode,
  type LessonSentence,
  type LessonType,
  type ListeningKind,
  type ListeningQuestion,
  type MockSectionScore,
  type PublicListeningQuestion,
} from '@/lib/listening/questions'
import { addStudyDays, studyDate } from '@/lib/learning/time'
import {
  approvedConversations,
  blankQuestionOf,
  buildConversationSession,
  conversationScript,
  gradeConversation,
  passageDictation,
  passageLineOf,
  publicLines,
  type Conversation,
  type ConvLine,
  type PublicConvLine,
  type StoredConversation,
} from '@/lib/listening/conversations'
import conversationsData from '@/data/listening/conversations.json'
import n5Content from '@/data/jlpt/n5.json'
import n4Content from '@/data/jlpt/n4.json'

type Supabase = Awaited<ReturnType<typeof createClient>>
type Kind = ListeningKind

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const JLPT_CONTENT: Record<JlptLevel, LevelContent> = { N5: n5Content as LevelContent, N4: n4Content as LevelContent }
/** Đợt B: hội thoại soạn sẵn (scripts/listening-content → data/listening/conversations.json), chỉ dùng hội thoại đã duyệt. */
const CONVERSATIONS: Conversation[] = approvedConversations(conversationsData as Conversation[])

// ---------------------------------------------------------------------------
// Dữ liệu theo bài (lưu tạm 10 phút)
// ---------------------------------------------------------------------------

/** Từ vựng theo bài: chỉ để biết bài nào đã học. */
type WordRow = { id: string; lesson: number }
let wordsCache: { at: number; value: WordRow[] } | null = null

async function readLessonWords(supabase: Supabase): Promise<WordRow[]> {
  if (wordsCache && Date.now() - wordsCache.at < 10 * 60_000) return wordsCache.value
  const rows = await readAllPages('vocabularies', (from, to) => supabase.from('vocabularies').select('id, lesson').order('sort_order').range(from, to))
  const value = rows
    .filter((r) => r.lesson !== null)
    .map((r) => ({ id: r.id as string, lesson: r.lesson as number }))
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

async function insertSession(
  supabase: Supabase,
  userId: string,
  row: { kind: Kind; lesson?: number | null; level?: JlptLevel; pointCode?: string | null; mode: string; questions: ListeningQuestion[] },
): Promise<StartResult> {
  if (row.questions.length === 0) return { status: 'empty' }
  const { data, error } = await supabase
    .from('listening_sessions')
    .insert({ user_id: userId, kind: row.kind, lesson: row.lesson ?? null, level: row.level ?? null, point_code: row.pointCode ?? null, mode: row.mode, questions: row.questions })
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
  // Chép chính tả theo đoạn: hội thoại ngắn / dài của bài, từng lượt theo thứ tự (không theo số câu)
  if (v.mode === 'passage_short' || v.mode === 'passage_long') {
    const kind = v.mode === 'passage_short' ? 'short' : 'long'
    const c = CONVERSATIONS.find((x) => x.lesson === lesson && x.kind === kind)
    if (!c) return { status: 'empty' }
    return insertSession(supabase, user.id, { kind: 'lesson', lesson, mode: v.mode, questions: passageDictation(c) })
  }
  const [sentences, recent] = await Promise.all([readLessonSentences(supabase), readLastUsed(supabase, user.id, 'lesson', { lesson })])
  // Nhiễu nghe câu → chọn nghĩa: câu của bài này và các bài trước
  const pool = [...sentences.entries()].filter(([l]) => l <= lesson).flatMap(([, list]) => list)
  const questions = buildLessonSession(lesson, v.mode, count, sentences.get(lesson) ?? [], pool, Math.random, recent)
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
// Grammar · Listening theo từng mẫu (§V2.2b)
// ---------------------------------------------------------------------------

interface PointInfo {
  code: string
  lesson: number
  pattern: string
  meaning: string
  sentences: LessonSentence[]
}

async function readPoints(supabase: Supabase): Promise<PointInfo[]> {
  const content = await readContent(supabase)
  return content.map((p) => ({
    code: p.code,
    lesson: p.lesson,
    pattern: p.pattern,
    meaning: p.meaning,
    sentences: p.sentences.map((s) => ({ ...s, pattern: p.pattern, patternMeaning: p.meaning, pointCode: p.code })),
  }))
}

export interface StageProgress {
  stage: Stage
  /** Lần nộp tốt nhất (số câu đúng / số câu), null khi chưa làm. */
  best: { correct: number; total: number } | null
  passed: boolean
  unlocked: boolean
}

/** Tiến độ chặng theo mã mẫu: lần nộp tốt nhất mỗi chặng (không tính phiên luyện lại câu sai). */
async function readPointProgress(supabase: Supabase, userId: string): Promise<(code: string) => StageProgress[]> {
  const rows = await readAllPages('listening_sessions', (from, to) =>
    supabase.from('listening_sessions').select('point_code, mode, correct, summary').eq('user_id', userId).eq('kind', 'point').eq('status', 'finished').order('id').range(from, to),
  )
  const best = new Map<string, { correct: number; total: number }>()
  for (const r of rows as { point_code: string; mode: string; correct: number; summary: { total?: number } | null }[]) {
    const total = r.summary?.total ?? POINT_LISTENING.perStage
    if (!/^stage[123]$/.test(r.mode)) continue
    const key = `${r.point_code}|${r.mode}`
    const cur = best.get(key)
    if (!cur || r.correct / total > cur.correct / cur.total) best.set(key, { correct: r.correct, total })
  }
  return (code) => stagesOf(code, best)
}

function stagesOf(code: string, best: Map<string, { correct: number; total: number }>): StageProgress[] {
  const out: StageProgress[] = []
  for (const stage of [1, 2, 3] as const) {
    const b = best.get(`${code}|stage${stage}`) ?? null
    out.push({ stage, best: b, passed: b !== null && stagePassed(b.correct, b.total), unlocked: stage === 1 || out[stage - 2].passed })
  }
  return out
}

export interface PointListeningOverview {
  lessons: { lesson: number; points: { code: string; pattern: string; meaning: string; stages: StageProgress[] }[] }[]
}

export async function getPointListeningOverview(): Promise<PointListeningOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const [points, of] = await Promise.all([readPoints(supabase), readPointProgress(supabase, user.id)])
  const lessons = new Map<number, PointListeningOverview['lessons'][number]['points']>()
  for (const p of points) lessons.set(p.lesson, [...(lessons.get(p.lesson) ?? []), { code: p.code, pattern: p.pattern, meaning: p.meaning, stages: of(p.code) }])
  return { lessons: [...lessons.entries()].sort((a, b) => a[0] - b[0]).map(([lesson, list]) => ({ lesson, points: list })) }
}

/** Một chặng 10 câu của một mẫu. Chặng 2, 3 chỉ mở khi chặng trước đạt (≥ 8/10). */
export async function startPointListening(input: unknown): Promise<StartResult | { status: 'locked' }> {
  const v = (input ?? {}) as { point?: unknown; stage?: unknown }
  const stage = Number(v.stage)
  if (typeof v.point !== 'string' || !isStage(stage)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const [points, of] = await Promise.all([readPoints(supabase), readPointProgress(supabase, user.id)])
  const point = points.find((p) => p.code === v.point)
  if (!point) return { status: 'invalid' }
  if (!of(point.code)[stage - 1].unlocked) return { status: 'locked' }
  const pool = points.filter((p) => p.lesson <= point.lesson).flatMap((p) => p.sentences)
  const questions = buildPointStage(stage, pointStages(point.sentences)[stage - 1], pool, Math.random)
  return insertSession(supabase, user.id, { kind: 'point', lesson: point.lesson, pointCode: point.code, mode: `stage${stage}`, questions })
}

/** Practice · Numbers listening (§V2.5). */
export async function startNumbersListening(input: unknown): Promise<StartResult> {
  const v = (input ?? {}) as { groups?: unknown; mode?: unknown; count?: unknown }
  const groups = Array.isArray(v.groups) ? [...new Set(v.groups.filter(isNumberGroup))] : []
  const count = Number(v.count)
  if (groups.length === 0 || !isNumbersMode(v.mode) || !LISTENING_V1.sessionSizes.includes(count as 10 | 20)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  return insertSession(supabase, user.id, { kind: 'numbers', mode: v.mode, questions: buildNumbersSession(groups, v.mode, count, Math.random) })
}

/** Nhật ký nghe (trừ thi thử) để tính danh sách câu nghe sai. */
async function readMistakeLogs(supabase: Supabase, userId: string) {
  const rows = await readAllPages('listening_logs', (from, to) =>
    supabase.from('listening_logs').select('type, ref, correct, answered_at').eq('user_id', userId).neq('kind', 'jlpt_mock').order('id').range(from, to),
  )
  return openMistakes((rows as { type: string; ref: string; correct: boolean; answered_at: string }[]).map((r) => ({ type: r.type, ref: r.ref, correct: r.correct, at: Date.parse(r.answered_at) })))
}

export async function getMistakeCount(): Promise<number> {
  const user = await requireUser()
  const supabase = await createClient()
  return (await readMistakeLogs(supabase, user.id)).length
}

/** Practice · Listening mistakes (§V2.6): câu nghe sai lâu nhất trước, dựng lại với nhiễu mới. */
export async function startMistakesListening(input: unknown): Promise<StartResult> {
  const v = (input ?? {}) as { count?: unknown }
  const count = Number(v.count)
  if (!LISTENING_V1.sessionSizes.includes(count as 10 | 20)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const [open, sentences] = await Promise.all([readMistakeLogs(supabase, user.id), readLessonSentences(supabase)])
  const byCode = new Map<string, { s: LessonSentence; lesson: number }>()
  for (const [lesson, list] of sentences) for (const s of list) byCode.set(s.code, { s, lesson })
  const poolOf = (lesson: number) => [...sentences.entries()].filter(([l]) => l <= lesson).flatMap(([, list]) => list)
  const rng = Math.random
  const questions: ListeningQuestion[] = []
  for (const m of open) {
    if (questions.length >= count) break
    let q: ListeningQuestion | null = null
    if (m.type === 'numbers') q = numberQuestionOf(m.ref, rng)
    else if (m.type === 'conversation_blank') q = blankQuestionOf(CONVERSATIONS, m.ref, rng)
    else if (m.type === 'dictation' && m.ref.includes('@')) q = passageLineOf(CONVERSATIONS, m.ref)
    else {
      const found = byCode.get(m.ref)
      if (!found) continue
      if (m.type === 'heard_sentence') q = buildHeardSentence(found.s, rng)
      else if (m.type === 'sentence_meaning') q = buildSentenceMeaning(found.s, poolOf(found.lesson), rng)
      else if (m.type === 'reply') q = buildReply(found.s, rng)
      else if (m.type === 'dictation') q = buildSentenceDictation(found.s)
    }
    if (q) questions.push(q)
  }
  return insertSession(supabase, user.id, { kind: 'mistakes', mode: 'mistakes', questions })
}

// ---------------------------------------------------------------------------
// Practice · Conversation listening (§V2.4)
// ---------------------------------------------------------------------------

/** Bài có hội thoại đã duyệt (Dictation theo đoạn và Conversation listening dùng để bật / tắt). */
export const conversationLessons = (): number[] => [...new Set(CONVERSATIONS.map((c) => c.lesson))].sort((a, b) => a - b)

export interface ConversationOverview {
  lessons: { lesson: number; items: { code: string; kind: 'short' | 'long'; title: string; situation: string; lines: number; blanks: number; best: { correct: number; total: number } | null }[] }[]
}

export async function getConversationOverview(): Promise<ConversationOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const rows = await readAllPages('listening_sessions', (from, to) =>
    supabase.from('listening_sessions').select('mode, correct, summary').eq('user_id', user.id).eq('kind', 'conversation').eq('status', 'finished').order('id').range(from, to),
  )
  const best = new Map<string, { correct: number; total: number }>()
  for (const r of rows as { mode: string; correct: number; summary: { total?: number } | null }[]) {
    const total = r.summary?.total ?? 1
    const cur = best.get(r.mode)
    if (!cur || r.correct / total > cur.correct / cur.total) best.set(r.mode, { correct: r.correct, total })
  }
  const lessons = new Map<number, ConversationOverview['lessons'][number]['items']>()
  for (const c of CONVERSATIONS) {
    lessons.set(c.lesson, [
      ...(lessons.get(c.lesson) ?? []),
      { code: c.code, kind: c.kind, title: c.title, situation: c.situation, lines: c.lines.length, blanks: c.blanks.length, best: best.get(c.code) ?? null },
    ])
  }
  return { lessons: [...lessons.entries()].sort((a, b) => a[0] - b[0]).map(([lesson, items]) => ({ lesson, items: items.sort((a, b) => a.kind.localeCompare(b.kind) * -1) })) }
}

export async function startConversation(input: unknown): Promise<StartResult> {
  const v = (input ?? {}) as { code?: unknown }
  const c = CONVERSATIONS.find((x) => x.code === v.code)
  if (!c) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listening_sessions')
    .insert({ user_id: user.id, kind: 'conversation', lesson: c.lesson, mode: c.code, questions: [buildConversationSession(c, Math.random)] })
    .select('id')
    .single()
  if (error) throw new Error(`Không tạo được listening_sessions: ${error.message}`)
  return { status: 'saved', id: data.id as string }
}

type VocabRow = { expression: string; reading: string; meaning: string; lesson: number }
let vocabCache: { at: number; value: VocabRow[] } | null = null
async function readVocab(supabase: Supabase): Promise<VocabRow[]> {
  if (vocabCache && Date.now() - vocabCache.at < 10 * 60_000) return vocabCache.value
  const rows = await readAllPages('vocabularies', (from, to) => supabase.from('vocabularies').select('expression, reading_kana, meaning_vi, lesson').order('sort_order').range(from, to))
  const value = rows.filter((r) => r.lesson !== null).map((r) => ({ expression: r.expression as string, reading: r.reading_kana as string, meaning: r.meaning_vi as string, lesson: r.lesson as number }))
  vocabCache = { at: Date.now(), value }
  return value
}

/** Từ trong một lượt: mảnh trùng cách viết / cách đọc của từ đã học (động từ chia ます được đưa về thể ます). */
function wordsOfLine(line: ConvLine, vocab: readonly VocabRow[], lesson: number): { t: string; r: string; meaning: string }[] {
  const known = vocab.filter((w) => w.lesson <= lesson)
  const out = new Map<string, { t: string; r: string; meaning: string }>()
  for (const p of line.pieces) {
    const base = p.t.replace(/(ませんでした|ました|ません|ましょう)$/, 'ます')
    const w = known.find((x) => x.expression === p.t || x.expression === base) ?? known.find((x) => x.reading === p.t && x.reading.length > 1)
    if (w && !out.has(w.expression)) out.set(w.expression, { t: w.expression, r: w.reading, meaning: w.meaning })
  }
  return [...out.values()]
}

export interface ConversationReview {
  lines: (ConvLine & { words: { t: string; r: string; meaning: string }[] })[]
  /** Mỗi ô: đáp án, lựa chọn của người học, đúng / sai. */
  blanks: { line: number; piece: number; options: string[]; answer: number; given: number | null; correct: boolean }[]
  patterns: { code: string; pattern: string; meaning: string }[]
  correct: number
  total: number
}

export interface ConversationView {
  id: string
  code: string
  lesson: number
  kind: 'short' | 'long'
  title: string
  situation: string
  script: ConversationScriptLine[]
  lines: PublicConvLine[]
  /** Lựa chọn từng ô (đã xáo), chưa có đáp án. */
  blanks: { line: number; options: string[] }[]
  review: ConversationReview | null
}
type ConversationScriptLine = ReturnType<typeof conversationScript>[number]

type ConvSessionRow = { id: string; lesson: number; mode: string; questions: StoredConversation[]; answers: Record<string, number>; status: 'active' | 'finished' }

async function readConvSession(supabase: Supabase, userId: string, id: unknown): Promise<{ row: ConvSessionRow; c: Conversation } | null> {
  if (typeof id !== 'string' || !UUID.test(id)) return null
  const { data, error } = await supabase.from('listening_sessions').select('id, lesson, mode, questions, answers, status').eq('id', id).eq('user_id', userId).eq('kind', 'conversation').maybeSingle()
  if (error) throw new Error(`Không đọc được listening_sessions: ${error.message}`)
  const row = data as ConvSessionRow | null
  // Hội thoại có thể đã bị tắt duyệt sau khi tạo phiên: đọc cả bản chưa duyệt để xem lại
  const c = row ? (conversationsData as Conversation[]).find((x) => x.code === row.mode) : undefined
  return row && c ? { row, c } : null
}

async function reviewOf(supabase: Supabase, c: Conversation, stored: StoredConversation, given: readonly (number | null)[]): Promise<ConversationReview> {
  const [vocab, content] = await Promise.all([readVocab(supabase), readContent(supabase)])
  const results = gradeConversation(stored, given)
  return {
    lines: c.lines.map((l) => ({ ...l, words: wordsOfLine(l, vocab, c.lesson) })),
    blanks: c.blanks.map((b, i) => ({ line: b.line, piece: b.piece, options: stored.blanks[i].options, answer: stored.blanks[i].answer, given: given[i] ?? null, correct: results[i] })),
    patterns: c.patterns.flatMap((code) => {
      const p = content.find((x) => x.code === code)
      return p ? [{ code, pattern: p.pattern, meaning: p.meaning }] : []
    }),
    correct: results.filter(Boolean).length,
    total: results.length,
  }
}

export async function getConversationSession(id: unknown): Promise<ConversationView | null> {
  const user = await requireUser()
  const supabase = await createClient()
  const found = await readConvSession(supabase, user.id, id)
  if (!found) return null
  const { row, c } = found
  const stored = row.questions[0]
  const given = stored.blanks.map((_, i) => row.answers[String(i)] ?? null)
  return {
    id: row.id,
    code: c.code,
    lesson: c.lesson,
    kind: c.kind,
    title: c.title,
    situation: c.situation,
    script: conversationScript(c),
    lines: publicLines(c),
    blanks: c.blanks.map((b, i) => ({ line: b.line, options: stored.blanks[i].options })),
    review: row.status === 'finished' ? await reviewOf(supabase, c, stored, given) : null,
  }
}

/** Nộp cả hội thoại: chấm từng ô, ghi nhật ký từng ô (để vào danh sách câu nghe sai), chốt phiên. */
export async function submitConversation(input: unknown): Promise<({ status: 'graded' } & ConversationReview) | { status: 'invalid' | 'not_found' }> {
  const v = (input ?? {}) as { id?: unknown; answers?: unknown; withAudio?: unknown }
  const user = await requireUser()
  const supabase = await createClient()
  const found = await readConvSession(supabase, user.id, v.id)
  if (!found) return { status: 'not_found' }
  const { row, c } = found
  const stored = row.questions[0]
  if (row.status === 'finished') {
    const given = stored.blanks.map((_, i) => row.answers[String(i)] ?? null)
    return { status: 'graded', ...(await reviewOf(supabase, c, stored, given)) }
  }
  if (!Array.isArray(v.answers) || v.answers.length !== stored.blanks.length) return { status: 'invalid' }
  const given = v.answers.map((a, i) => (Number.isInteger(a) && a >= 0 && a < stored.blanks[i].options.length ? (a as number) : null))
  const results = gradeConversation(stored, given)
  const correct = results.filter(Boolean).length
  const answers = Object.fromEntries(given.flatMap((g, i) => (g === null ? [] : [[String(i), g]])))
  const { error } = await supabase
    .from('listening_sessions')
    .update({ answers, status: 'finished', correct, summary: { total: results.length }, finished_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('user_id', user.id)
  if (error) throw new Error(`Không lưu được listening_sessions: ${error.message}`)
  const today = studyDate(new Date())
  const { error: logError } = await supabase.from('listening_logs').insert(
    results.map((ok, i) => ({
      user_id: user.id,
      session_id: row.id,
      question_index: i,
      kind: 'conversation',
      lesson: c.lesson,
      type: 'conversation_blank',
      ref: `${c.code}#${i}`,
      correct: ok,
      with_audio: v.withAudio !== false,
      study_date: today,
    })),
  )
  if (logError && logError.code !== '23505') throw new Error(`Không ghi được listening_logs: ${logError.message}`)
  return { status: 'graded', ...(await reviewOf(supabase, c, stored, given)) }
}

// ---------------------------------------------------------------------------
// Làm bài
// ---------------------------------------------------------------------------

type SessionRow = {
  id: string
  kind: Kind
  lesson: number | null
  point_code: string | null
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
    .select('id, kind, lesson, level, point_code, mode, questions, answers, status, started_at')
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
  /** Theo mẫu: mẫu ngữ pháp của phiên. */
  point: { code: string; pattern: string } | null
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
  const reveal = s.kind !== 'jlpt_mock' || s.status === 'finished'
  const point = s.point_code ? ((await readPoints(supabase)).find((p) => p.code === s.point_code) ?? null) : null
  const answered: Record<number, ListeningResult> = {}
  if (reveal) for (const [k, given] of Object.entries(s.answers)) answered[Number(k)] = resultOf(s.questions[Number(k)], given)
  return {
    id: s.id,
    kind: s.kind,
    lesson: s.lesson,
    level: s.level,
    mode: s.mode,
    point: point ? { code: point.code, pattern: point.pattern } : null,
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
  if (prev !== undefined) return s.kind !== 'jlpt_mock' ? { status: 'graded', ...resultOf(q, prev) } : { status: 'saved' }
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
  return s.kind !== 'jlpt_mock' ? { status: 'graded', ...resultOf(q, given) } : { status: 'saved' }
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
      .update({ status: 'finished', correct, summary: sections ?? (s.kind === 'point' ? { total: results.length } : null), finished_at: new Date().toISOString() })
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

/** Phiên mới chỉ gồm câu sai (hoặc bỏ qua) của phiên trước, xáo lại lựa chọn. Không dùng cho thi thử. */
export async function retryWrongListening(id: unknown): Promise<StartResult | { status: 'not_found' }> {
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, id)
  if (!s || s.kind === 'jlpt_mock') return { status: 'not_found' }
  const wrong = s.questions.filter((q, i) => gradeListening(q, s.answers[String(i)])?.correct !== true)
  const questions = wrong.map((q) => {
    if (typeof q.answer !== 'number') return q
    const options = shuffle(q.options, Math.random)
    return { ...q, options, answer: options.indexOf(q.options[q.answer]) }
  })
  // Luyện lại câu sai của một chặng: mode riêng, không tính vào tiến độ chặng
  const mode = s.kind === 'point' && !s.mode.endsWith('-retry') ? `${s.mode}-retry` : s.mode
  return insertSession(supabase, user.id, { kind: s.kind, lesson: s.lesson, pointCode: s.point_code, mode, questions: shuffle(questions, Math.random) })
}

// ---------------------------------------------------------------------------
// Tổng quan
// ---------------------------------------------------------------------------

export interface ListeningOverview {
  lessons: { lesson: number; learned: boolean; total: number; correct: number }[]
  byType: Partial<Record<LessonType, { total: number; correct: number }>>
}

export interface MockHistoryItem {
  id: string
  level: JlptLevel
  date: string
  correct: number
  total: number
  sections: MockSectionScore[]
}

/** Lưới bài của một phần nghe: Grammar (3 dạng nghe theo câu) hoặc Dictation. Tỷ lệ đúng 30 ngày theo bài. */
export async function getListeningOverview(part: 'grammar' | 'dictation'): Promise<ListeningOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const since = addStudyDays(studyDate(new Date()), -LISTENING_V1.statsDays)
  const types: readonly LessonType[] = part === 'grammar' ? GRAMMAR_LISTENING_TYPES : ['dictation']
  const [logs, words, content, met, known, opened] = await Promise.all([
    readAllPages('listening_logs', (from, to) =>
      supabase.from('listening_logs').select('lesson, type, correct').eq('user_id', user.id).eq('kind', 'lesson').eq('with_audio', true).in('type', [...types]).gte('study_date', since).order('id').range(from, to),
    ),
    readLessonWords(supabase),
    readContent(supabase),
    readKanaStages(supabase, user.id),
    readKnownWordIds(supabase, user.id),
    readAllPages('learner_grammar', (from, to) => supabase.from('learner_grammar').select('point_id').eq('user_id', user.id).order('id').range(from, to)),
  ])

  // Bài đã học: có từ đã gặp / đã biết, hoặc mẫu ngữ pháp đã mở
  const learnedWords = new Set([...met.keys(), ...known])
  const openedPoints = new Set(opened.map((r) => r.point_id as string))
  const learned = new Set<number>([...words.filter((w) => learnedWords.has(w.id)).map((w) => w.lesson), ...content.filter((p) => openedPoints.has(p.id)).map((p) => p.lesson)])

  const byLesson = new Map<number, { total: number; correct: number }>()
  const byType: ListeningOverview['byType'] = {}
  for (const r of logs as { lesson: number; type: LessonType; correct: boolean }[]) {
    const l = byLesson.get(r.lesson) ?? { total: 0, correct: 0 }
    l.total++
    if (r.correct) l.correct++
    byLesson.set(r.lesson, l)
    const tt = byType[r.type] ?? { total: 0, correct: 0 }
    tt.total++
    if (r.correct) tt.correct++
    byType[r.type] = tt
  }
  return {
    lessons: Array.from({ length: 50 }, (_, i) => i + 1).map((lesson) => ({ lesson, learned: learned.has(lesson), ...(byLesson.get(lesson) ?? { total: 0, correct: 0 }) })),
    byType,
  }
}

/** Tab JLPT · 5 đề thi thử phần nghe gần nhất mỗi cấp. */
export async function getMockHistory(): Promise<MockHistoryItem[]> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listening_sessions')
    .select('id, level, finished_at, correct, summary')
    .eq('user_id', user.id)
    .eq('kind', 'jlpt_mock')
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(10)
  if (error) throw new Error(`Không đọc được listening_sessions: ${error.message}`)
  return ((data ?? []) as { id: string; level: JlptLevel; finished_at: string; correct: number; summary: MockSectionScore[] | null }[]).map((m) => ({
    id: m.id,
    level: m.level,
    date: m.finished_at,
    correct: m.correct,
    total: (m.summary ?? []).reduce((n, s) => n + s.total, 0),
    sections: m.summary ?? [],
  }))
}

export type { LessonMode }
