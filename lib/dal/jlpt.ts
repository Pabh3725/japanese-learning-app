// JLPT_V1 — Data Access Layer (docs/jlpt-rules.md). Server-only.
// Dựng câu ở server từ dữ liệu sẵn có, lưu cả phiên (đáp án không gửi trước cho trình duyệt), chấm ở server.
// Không đổi điểm, lịch hay FSRS nào; mỗi câu ghi jlpt_logs để tính tỷ lệ đúng từng dạng.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readAllPages } from '@/lib/dal/pages'
import { readContent } from '@/lib/dal/grammar'
import { readAllKanjiCached } from '@/lib/dal/kanji-content'
import { readKnownWordIds } from '@/lib/dal/known-words'
import { isJlptLevel, isJlptType, JLPT_TYPES, LESSONS_OF, LEVEL_NUMBER, SESSION_SIZES, type JlptLevel, type JlptType } from '@/lib/jlpt/catalog'
import {
  buildGrammarForm,
  buildKanjiReading,
  buildKatakana,
  buildOrthography,
  buildQuickResponse,
  buildSentenceOrder,
  hasKanji,
  isKatakanaWord,
  publicQuestion,
  type JlptGrammarSentence,
  type JlptQuestion,
  type JlptWord,
  type PublicJlptQuestion,
} from '@/lib/jlpt/questions'
import { shuffle } from '@/lib/jlpt/reading'
import { approvedItems, contentQuestions, isContentType, type ContentType, type LevelContent } from '@/lib/jlpt/content'
import n5Content from '@/data/jlpt/n5.json'
import n4Content from '@/data/jlpt/n4.json'
import { addStudyDays, studyDate } from '@/lib/learning/time'

type Supabase = Awaited<ReturnType<typeof createClient>>
type Scope = 'all' | 'learned'

/** Đợt 2: nội dung soạn sẵn (scripts/jlpt-content → data/jlpt/<cấp>.json), chỉ dùng mục đã duyệt. */
const CONTENT: Record<JlptLevel, LevelContent> = { N5: n5Content as LevelContent, N4: n4Content as LevelContent }

/** Dạng làm được ở cấp này: dạng đợt 1, và dạng đợt 2 đã có mục được duyệt. */
export function readyTypes(level: JlptLevel): JlptType[] {
  return JLPT_TYPES.filter((t) => t.levels.includes(level) && (isContentType(t.id) ? approvedItems(CONTENT[level], t.id).length > 0 : t.available)).map((t) => t.id)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATS_DAYS = 30

// ---------------------------------------------------------------------------
// Dữ liệu dùng chung (lưu tạm 10 phút)
// ---------------------------------------------------------------------------

type WordRow = JlptWord & { level: number | null; lesson: number | null }
let wordsCache: { at: number; value: WordRow[] } | null = null

async function readWords(supabase: Supabase): Promise<WordRow[]> {
  if (wordsCache && Date.now() - wordsCache.at < 10 * 60_000) return wordsCache.value
  const rows = await readAllPages('vocabularies', (from, to) =>
    supabase.from('vocabularies').select('id, code, expression, reading_kana, meaning_vi, han_viet, jlpt_level, lesson').order('sort_order').range(from, to),
  )
  const value = rows.map((r) => ({
    id: r.id as string,
    code: r.code as string,
    expression: r.expression as string,
    reading: r.reading_kana as string,
    meaning: r.meaning_vi as string,
    hanViet: (r.han_viet as string | null) ?? null,
    level: (r.jlpt_level as number | null) ?? null,
    lesson: (r.lesson as number | null) ?? null,
  }))
  wordsCache = { at: Date.now(), value }
  return value
}

let similarCache: { at: number; value: Map<string, string[]> } | null = null

/** Chữ gần giống đã duyệt, theo chữ: 日 → [目, …]. */
async function readSimilarByChar(supabase: Supabase): Promise<Map<string, string[]>> {
  if (similarCache && Date.now() - similarCache.at < 10 * 60_000) return similarCache.value
  const rows = await readAllPages('kanji_similar_pairs', (from, to) =>
    supabase.from('kanji_similar_pairs').select('a:kanji!kanji_similar_pairs_kanji_a_fkey(character), b:kanji!kanji_similar_pairs_kanji_b_fkey(character)').eq('approved', true).order('kanji_a').order('kanji_b').range(from, to),
  )
  const value = new Map<string, string[]>()
  for (const r of rows as unknown as { a: { character: string }; b: { character: string } }[]) {
    value.set(r.a.character, [...(value.get(r.a.character) ?? []), r.b.character])
    value.set(r.b.character, [...(value.get(r.b.character) ?? []), r.a.character])
  }
  similarCache = { at: Date.now(), value }
  return value
}

// ---------------------------------------------------------------------------
// Dựng phiên
// ---------------------------------------------------------------------------

interface Material {
  words: WordRow[]
  sentences: JlptGrammarSentence[]
  /** Câu ngữ pháp có chứa từ (theo cách viết), để làm ngữ cảnh. */
  contextOf: (expression: string) => JlptGrammarSentence | null
  readingsOf: Map<string, Set<string>>
  expressionsByReading: Map<string, Set<string>>
  swaps: (kanji: string) => string[]
  /** Cách đọc của các từ có Kanji cùng bài (cùng nhóm nghĩa), làm nhiễu 漢字読み như đề thật. */
  siblingsOf: (word: WordRow) => string[]
  level: JlptLevel
}

async function readMaterial(supabase: Supabase, userId: string, level: JlptLevel, scope: Scope): Promise<Material> {
  const [allWords, content, kanji, similar] = await Promise.all([readWords(supabase), readContent(supabase), readAllKanjiCached(supabase), readSimilarByChar(supabase)])
  const [first, last] = LESSONS_OF[level]
  let points = content.filter((p) => p.lesson >= first && p.lesson <= last)
  let words = allWords.filter((w) => w.level === LEVEL_NUMBER[level])

  if (scope === 'learned') {
    const [met, known, opened] = await Promise.all([
      readAllPages('learner_vocabulary', (from, to) => supabase.from('learner_vocabulary').select('vocabulary_id').eq('user_id', userId).order('id').range(from, to)),
      readKnownWordIds(supabase, userId),
      readAllPages('learner_grammar', (from, to) => supabase.from('learner_grammar').select('point_id').eq('user_id', userId).order('id').range(from, to)),
    ])
    const learned = new Set([...met.map((r) => r.vocabulary_id as string), ...known])
    const openedPoints = new Set(opened.map((r) => r.point_id as string))
    words = words.filter((w) => learned.has(w.id))
    points = points.filter((p) => openedPoints.has(p.id))
  }

  const sentences: JlptGrammarSentence[] = points.flatMap((p) => p.sentences.map((s) => ({ ...s, pattern: p.pattern, patternMeaning: p.meaning })))
  // Ngữ cảnh lấy từ mọi câu của cấp (không chỉ câu đã học), để từ có câu đi kèm khi có
  const levelSentences = content.filter((p) => p.lesson >= first && p.lesson <= last).flatMap((p) => p.sentences)
  const byExpression = new Map<string, JlptGrammarSentence[]>()
  for (const s of levelSentences) {
    for (const piece of s.pieces) {
      if (!hasKanji(piece.t)) continue
      const list = byExpression.get(piece.t) ?? []
      if (list.length < 8) list.push({ ...s, pattern: '', patternMeaning: '' })
      byExpression.set(piece.t, list)
    }
  }
  const readingsOf = new Map<string, Set<string>>()
  const expressionsByReading = new Map<string, Set<string>>()
  for (const w of allWords) {
    readingsOf.set(w.expression, (readingsOf.get(w.expression) ?? new Set()).add(w.reading))
    expressionsByReading.set(w.reading, (expressionsByReading.get(w.reading) ?? new Set()).add(w.expression))
  }
  // Chữ cùng âm On, trong cả bảng Kanji (đủ nhiễu cho từ ít chữ)
  const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
  const common = kanji
  const byOn = new Map<string, string[]>()
  for (const k of common) for (const on of k.onyomi) byOn.set(toHira(on), [...(byOn.get(toHira(on)) ?? []), k.character])
  const onOf = new Map(common.map((k) => [k.character, k.onyomi.map(toHira)]))
  const byLesson = new Map<number, WordRow[]>()
  for (const w of allWords) if (w.lesson !== null && hasKanji(w.expression)) byLesson.set(w.lesson, [...(byLesson.get(w.lesson) ?? []), w])
  const swaps = (c: string) => [...new Set([...(similar.get(c) ?? []), ...(onOf.get(c) ?? []).flatMap((on) => byOn.get(on) ?? [])])].filter((x) => x !== c)

  return {
    words,
    sentences,
    contextOf: (expression) => {
      const list = byExpression.get(expression)
      return list && list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null
    },
    readingsOf,
    expressionsByReading,
    swaps,
    siblingsOf: (word) => (word.lesson === null ? [] : (byLesson.get(word.lesson) ?? []).filter((w) => w.id !== word.id).map((w) => w.reading)),
    level,
  }
}

/** Đợt 2: một mục soạn sẵn chưa dùng trong phiên (mục có đoạn văn cho ra nhiều câu). */
function buildContent(type: ContentType, level: JlptLevel, used: Set<string>): JlptQuestion[] {
  const items = shuffle(approvedItems(CONTENT[level], type), Math.random)
  const item = items.find((i) => !used.has(`${type}:${i.code}`))
  if (!item) return []
  used.add(`${type}:${item.code}`)
  return contentQuestions(type, item as Parameters<typeof contentQuestions>[1], Math.random)
}

function buildOne(type: JlptType, m: Material, used: Set<string>): JlptQuestion | null {
  const rng = Math.random
  const kanjiWords = m.words.filter((w) => hasKanji(w.expression) && !used.has(`${type}:${w.code}`))
  // N5: 表記 hỏi cả Katakana (khoảng 1/4 số câu), như đề thật
  if (type === 'orthography' && m.level === 'N5' && rng() < 0.25) {
    for (const w of shuffle(m.words.filter((x) => isKatakanaWord(x.expression) && !used.has(`${type}:${x.code}`)), rng).slice(0, 40)) {
      const q = buildKatakana(w, m.contextOf(w.expression), rng)
      if (q) return q
    }
  }
  if (type === 'kanji_reading' || type === 'orthography') {
    for (const w of shuffle(kanjiWords, rng).slice(0, 40)) {
      const q =
        type === 'kanji_reading'
          ? buildKanjiReading(w, m.contextOf(w.expression), m.readingsOf.get(w.expression) ?? new Set(), rng, m.siblingsOf(w))
          : buildOrthography(w, m.contextOf(w.expression), m.swaps, m.expressionsByReading.get(w.reading) ?? new Set(), [], rng)
      if (q) return q
    }
    return null
  }
  const build = type === 'grammar_form' ? buildGrammarForm : type === 'sentence_order' ? buildSentenceOrder : type === 'quick_response' ? buildQuickResponse : null
  if (!build) return null
  for (const s of shuffle(m.sentences.filter((x) => !used.has(`${type}:${x.code}`)), rng).slice(0, 60)) {
    const q = build(s, rng)
    if (q) return q
  }
  return null
}

export interface JlptSessionView {
  id: string
  level: JlptLevel
  questions: PublicJlptQuestion[]
  /** Câu đã trả lời: lựa chọn, đúng/sai, đáp án, giải thích (để tải lại trang vẫn tiếp tục). */
  answered: Record<number, JlptAnswerResult>
}

export interface JlptAnswerResult {
  choice: number
  correct: boolean
  answer: number
  explanation: string
}

export async function startJlptSession(input: unknown): Promise<{ status: 'saved'; id: string } | { status: 'invalid' | 'empty' }> {
  const v = (input ?? {}) as { level?: unknown; types?: unknown; count?: unknown; scope?: unknown }
  const types = Array.isArray(v.types) ? [...new Set(v.types.filter(isJlptType))] : []
  const count = Number(v.count)
  const scope = v.scope === 'learned' ? 'learned' : 'all'
  if (!isJlptLevel(v.level) || types.length === 0 || !SESSION_SIZES.includes(count as (typeof SESSION_SIZES)[number])) return { status: 'invalid' }
  const level = v.level
  const allowed = readyTypes(level)
  const ready = types.filter((t) => allowed.includes(t))
  if (ready.length === 0) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const m = await readMaterial(supabase, user.id, level, scope)

  // Chia đều số câu cho các dạng; dạng thiếu câu thì dạng khác bù
  const questions: JlptQuestion[] = []
  const used = new Set<string>()
  // Mục có đoạn văn giữ các câu đi liền nhau (cùng một đoạn), nên xáo theo nhóm
  const groups: JlptQuestion[][] = []
  for (let round = 0; questions.length < count && round < count * 2; round++) {
    const type = ready[round % ready.length]
    const built = isContentType(type) ? buildContent(type, level, used).slice(0, count - questions.length) : [buildOne(type, m, used)].filter((q): q is JlptQuestion => q !== null)
    if (built.length === 0) continue
    for (const q of built) used.add(`${type}:${q.ref}`)
    questions.push(...built)
    groups.push(built)
  }
  if (questions.length === 0) return { status: 'empty' }
  const { data, error } = await supabase.from('jlpt_sessions').insert({ user_id: user.id, level, types: ready, scope, questions: shuffle(groups, Math.random).flat() }).select('id').single()
  if (error) throw new Error(`Không tạo được jlpt_sessions: ${error.message}`)
  return { status: 'saved', id: data.id as string }
}

type SessionRow = { id: string; level: JlptLevel; types: string[]; scope: Scope; questions: JlptQuestion[]; answers: Record<string, number>; status: 'active' | 'finished' }

async function readSession(supabase: Supabase, userId: string, id: unknown): Promise<SessionRow | null> {
  if (typeof id !== 'string' || !UUID.test(id)) return null
  const { data, error } = await supabase.from('jlpt_sessions').select('id, level, types, scope, questions, answers, status').eq('id', id).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được jlpt_sessions: ${error.message}`)
  return (data as SessionRow | null) ?? null
}

const resultOf = (q: JlptQuestion, choice: number): JlptAnswerResult => ({ choice, correct: choice === q.answer, answer: q.answer, explanation: q.explanation })

export async function getJlptSession(id: unknown): Promise<JlptSessionView | null> {
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, id)
  if (!s) return null
  const answered: Record<number, JlptAnswerResult> = {}
  for (const [k, choice] of Object.entries(s.answers)) answered[Number(k)] = resultOf(s.questions[Number(k)], choice)
  return { id: s.id, level: s.level, questions: s.questions.map(publicQuestion), answered }
}

export async function answerJlpt(input: unknown): Promise<({ status: 'graded' } & JlptAnswerResult) | { status: 'invalid' | 'not_found' }> {
  const v = (input ?? {}) as { id?: unknown; index?: unknown; choice?: unknown }
  const index = Number(v.index)
  const choice = Number(v.choice)
  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(choice) || choice < 0) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, v.id)
  if (!s || index >= s.questions.length) return { status: 'not_found' }
  const q = s.questions[index]
  if (choice >= q.options.length) return { status: 'invalid' }
  // Đã trả lời rồi (gửi lại): trả kết quả lần đầu
  const prev = s.answers[String(index)]
  if (prev !== undefined) return { status: 'graded', ...resultOf(q, prev) }
  const { error } = await supabase.from('jlpt_sessions').update({ answers: { ...s.answers, [index]: choice } }).eq('id', s.id).eq('user_id', user.id)
  if (error) throw new Error(`Không lưu được jlpt_sessions: ${error.message}`)
  const { error: logError } = await supabase
    .from('jlpt_logs')
    .insert({ user_id: user.id, session_id: s.id, question_index: index, level: s.level, type: q.type, ref: q.ref, correct: choice === q.answer, study_date: studyDate(new Date()) })
  if (logError && logError.code !== '23505') throw new Error(`Không ghi được jlpt_logs: ${logError.message}`)
  return { status: 'graded', ...resultOf(q, choice) }
}

export interface JlptSummary {
  total: number
  correct: number
  byType: { type: JlptType; total: number; correct: number }[]
  wrong: number
}

export async function finishJlpt(id: unknown): Promise<JlptSummary | { status: 'not_found' }> {
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, id)
  if (!s) return { status: 'not_found' }
  const results = s.questions.map((q, i) => ({ type: q.type, correct: s.answers[String(i)] === q.answer }))
  const correct = results.filter((r) => r.correct).length
  if (s.status === 'active') {
    const { error } = await supabase.from('jlpt_sessions').update({ status: 'finished', correct, finished_at: new Date().toISOString() }).eq('id', s.id).eq('user_id', user.id)
    if (error) throw new Error(`Không lưu được jlpt_sessions: ${error.message}`)
  }
  const types = [...new Set(results.map((r) => r.type))]
  return {
    total: results.length,
    correct,
    wrong: results.length - correct,
    byType: types.map((type) => ({ type, total: results.filter((r) => r.type === type).length, correct: results.filter((r) => r.type === type && r.correct).length })),
  }
}

/** Phiên mới chỉ gồm các câu sai (hoặc bỏ qua) của phiên trước, xáo lại lựa chọn. */
export async function retryWrongJlpt(id: unknown): Promise<{ status: 'saved'; id: string } | { status: 'not_found' | 'empty' }> {
  const user = await requireUser()
  const supabase = await createClient()
  const s = await readSession(supabase, user.id, id)
  if (!s) return { status: 'not_found' }
  const wrong = s.questions.filter((q, i) => s.answers[String(i)] !== q.answer)
  if (wrong.length === 0) return { status: 'empty' }
  const reshuffled = wrong.map((q) => {
    const options = shuffle(q.options, Math.random)
    return { ...q, options, answer: options.indexOf(q.options[q.answer]) }
  })
  const { data, error } = await supabase.from('jlpt_sessions').insert({ user_id: user.id, level: s.level, types: s.types, scope: s.scope, questions: shuffle(reshuffled, Math.random) }).select('id').single()
  if (error) throw new Error(`Không tạo được jlpt_sessions: ${error.message}`)
  return { status: 'saved', id: data.id as string }
}

// ---------------------------------------------------------------------------
// Tổng quan: tỷ lệ đúng từng dạng, 30 ngày gần nhất
// ---------------------------------------------------------------------------

export type JlptStats = Record<JlptLevel, Partial<Record<JlptType, { total: number; correct: number }>>>

export async function getJlptStats(): Promise<JlptStats> {
  const user = await requireUser()
  const supabase = await createClient()
  const since = addStudyDays(studyDate(new Date()), -STATS_DAYS)
  const rows = await readAllPages('jlpt_logs', (from, to) =>
    supabase.from('jlpt_logs').select('level, type, correct').eq('user_id', user.id).gte('study_date', since).order('id').range(from, to),
  )
  const stats: JlptStats = { N5: {}, N4: {} }
  for (const r of rows as { level: JlptLevel; type: JlptType; correct: boolean }[]) {
    const cur = stats[r.level][r.type] ?? { total: 0, correct: 0 }
    cur.total++
    if (r.correct) cur.correct++
    stats[r.level][r.type] = cur
  }
  return stats
}
