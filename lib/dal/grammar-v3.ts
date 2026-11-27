// Grammar V3 — Data Access Layer. Server-only. Luật: docs/grammar-rules-v3.md, lõi: lib/grammar/v3.
//   buildV3Session: phiên Học (thẻ giới thiệu + bài Intro hôm nay) hoặc Ôn (4 câu mỗi mẫu, gom theo dạng)
//   submitV3Bai: chấm và lưu một bài 5 câu (nhật ký + điểm bài Intro hoặc lịch FSRS)
//   checkV3Bai: chỉ chấm (vòng làm lại câu sai cuối buổi, không lưu)
//   v3Today: việc hôm nay cho trang tổng quan
import 'server-only'
import { randomUUID } from 'node:crypto'
import { requireUser } from '@/lib/dal/auth'
import { createClient } from '@/lib/supabase/server'
import { dueReview, freshPoints, readContent, readLogs, scheduleOf, snapshot, type GrammarPointContent, type LearnerRow, type Snapshot } from '@/lib/dal/grammar'
import { normalizeTyped } from '@/lib/exercise/answer-normalize'
import { newReviewSchedule, nextReviewSchedule, reviewRating } from '@/lib/grammar/rules'
import { bankPoint, hasBank, parseRef, questionAt, refOf, refsOfType, reviewTypesAvailable, typeAt, type BankBai, type BankQuestion, type BankRef } from '@/lib/grammar/v3/bank'
import { readingDict, toPieces } from '@/lib/grammar/v3/pieces'
import type { V3Answer, V3Bai, V3Graded, V3Intro, V3PublicQuestion, V3Session, V3Step, V3SubmitResponse } from '@/lib/grammar/v3/public'
import { applyBai, baiToday, GRAMMAR_V3, groupReview, rotationFor, reviewTypesFor, type DayCounts, type V3State, type V3Type } from '@/lib/grammar/v3/rules'
import { studyDate } from '@/lib/learning/time'
import type { Outcome } from '@/lib/learning/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const countsOf = (code: string): DayCounts => {
  const b = bankPoint(code)!
  return { day1: b.days['1'].length, day2: b.days['2'].length }
}

const stateOf = (l: LearnerRow): V3State => ({ day: l.v3_day === 2 ? 2 : 1, dayDate: l.v3_day_date, scores: l.v3_scores ?? {} })

/** Mẫu học được theo V3: có ngân hàng câu và mọi câu đã có trong database (đã seed). */
function readyPoints(content: readonly GrammarPointContent[]): Set<string> {
  return new Set(content.filter((p) => hasBank(p.code)).map((p) => p.code))
}

// ---------------------------------------------------------------------------
// Câu gửi xuống trình duyệt
// ---------------------------------------------------------------------------

interface Ctx {
  content: Map<string, GrammarPointContent>
  dicts: Map<string, Map<string, string>>
  sidIds: Map<string, string>
}

function ctxOf(content: readonly GrammarPointContent[]): Ctx {
  const sidIds = new Map<string, string>()
  for (const p of content) for (const s of p.sentences) sidIds.set(s.code, s.id)
  return { content: new Map(content.map((p) => [p.code, p])), dicts: new Map(), sidIds }
}

function dictOf(ctx: Ctx, code: string): Map<string, string> {
  let d = ctx.dicts.get(code)
  if (!d) {
    // Từ điển cách đọc của mẫu và các mẫu cùng bài (câu ôn trộn mẫu, nhiễu có thể là từ của mẫu khác)
    const p = ctx.content.get(code)
    const same = p ? [...ctx.content.values()].filter((x) => x.lesson <= p.lesson && x.lesson >= p.lesson - 1) : []
    d = readingDict(same.flatMap((x) => x.sentences))
    ctx.dicts.set(code, d)
  }
  return d
}

function publicQuestion(ctx: Ctx, ref: BankRef, q: BankQuestion): V3PublicQuestion | null {
  if (!ctx.sidIds.has(q.sid)) return null // câu chưa seed: bỏ qua
  const dict = dictOf(ctx, ref.code)
  const P = (t: string | undefined) => (t ? toPieces(t, dict) : undefined)
  const out: V3PublicQuestion = { ref: refOf(ref), k: q.k, type: typeAt(ref) ?? 'G1', pointCode: ref.code, vi: q.vi ?? null }
  if (q.ctx) out.ctx = P(q.ctx)
  switch (q.k) {
    case 'choice':
      out.choices = shuffle(q.opts ?? [])
      if (q.lines) out.lines = q.lines.map(([who, t]) => ({ who, pieces: P(t)! }))
      else if (q.prompt) {
        out.prompt = P(q.prompt)
        out.promptVi = q.promptVi
      } else if (q.audio) {
        out.audioKana = q.audioKana ?? q.audio
        out.audioText = P(q.audio)
      } else out.text = P(q.text)
      break
    case 'tf':
      out.text = P(q.text)
      break
    case 'err':
      out.segs = (q.segs ?? []).map(([t, marked]) => ({ pieces: toPieces(t, dict), marked }))
      break
    case 'star':
      out.pre = P(q.pre)
      out.post = P(q.post)
      out.chips = shuffle((q.pieces ?? []).map((text, id) => ({ id, text })))
      out.star = q.star
      break
    case 'type':
      out.text = P(q.text)
      out.hint = q.hint
      break
  }
  return out
}

function grade(q: BankQuestion, ref: string, answer: V3Answer): V3Graded {
  const base = { ref, ex: q.ex }
  switch (q.k) {
    case 'choice': {
      const right = q.opts![0]
      return { ...base, correct: answer === right, expected: right, answer: right }
    }
    case 'tf':
      return { ...base, correct: answer === q.a, expected: q.a ? 'Right' : 'Wrong', answer: Boolean(q.a), fix: q.fix ?? null }
    case 'err': {
      const marked = (q.segs ?? []).filter(([, m]) => m)
      return { ...base, correct: answer === q.a, expected: marked[q.a as number]?.[0] ?? '', answer: q.a as number, fix: q.fix ?? null }
    }
    case 'star': {
      const order = Array.isArray(answer) ? answer : []
      return { ...base, correct: order.length === 4 && order[q.star!] === q.star, expected: q.pieces![q.star!], order: q.pieces }
    }
    case 'type': {
      const typed = typeof answer === 'string' ? normalizeTyped(answer) : ''
      return { ...base, correct: typed !== '' && (q.acc ?? []).some((a) => normalizeTyped(a) === typed), expected: q.acc![0] }
    }
  }
}

// ---------------------------------------------------------------------------
// Dựng phiên
// ---------------------------------------------------------------------------

function introOf(ctx: Ctx, p: GrammarPointContent): V3Intro {
  const b = bankPoint(p.code)!
  const byCode = new Map(p.sentences.map((s) => [s.code, s]))
  return {
    code: p.code,
    lesson: p.lesson,
    pattern: p.pattern,
    meaning: p.meaning,
    explanation: p.explanation,
    notes: p.notes,
    examples: b.examples.map((e) => ({ pieces: byCode.get(e.sid)?.pieces ?? toPieces(e.jp, dictOf(ctx, p.code)), meaning: e.vi, kana: e.kana })),
  }
}

/** Câu của một bài Intro: lần đầu dùng 5 câu chính; làm lại (chưa qua) thì dùng câu dự phòng trước. */
function introBai(ctx: Ctx, code: string, key: string, attempts: number): V3Bai | null {
  const [d, i] = key.split(':').map(Number) as [1 | 2, number]
  const b: BankBai | undefined = bankPoint(code)?.days[String(d) as '1' | '2'][i]
  if (!b) return null
  const main = b.qs.map((q, index) => ({ ref: { code, kind: 'intro', day: d, bai: i, pool: 'q', index } as BankRef, q }))
  const spare = b.extra.map((q, index) => ({ ref: { code, kind: 'intro', day: d, bai: i, pool: 'x', index } as BankRef, q }))
  const ordered = attempts > 0 ? [...spare, ...shuffle(main)] : [...main, ...spare]
  const pub = ordered.map((x) => publicQuestion(ctx, x.ref, x.q)).filter((x): x is V3PublicQuestion => !!x)
  if (pub.length < GRAMMAR_V3.perBai) return null
  return {
    key: `${code}:${key}`,
    type: b.type,
    dayKey: key,
    pointCode: code,
    pattern: bankPoint(code)!.pattern,
    stage: b.stage,
    level: b.lv,
    guide: b.guide,
    fallbackFor: b.fallbackFor,
    questions: pub.slice(0, GRAMMAR_V3.perBai),
    spare: pub.slice(GRAMMAR_V3.perBai),
  }
}

function lastSeenOf(snap: Snapshot): Map<string, number> {
  const out = new Map<string, number>()
  for (const l of snap.logs) if (!out.has(l.sentence_id)) out.set(l.sentence_id, Date.parse(l.answered_at))
  return out
}

/** Số ngày từ mốc, để dạng phụ của buổi ôn đổi mỗi ngày. */
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)

export async function buildV3Session(mode: 'learn' | 'review'): Promise<V3Session> {
  const user = await requireUser()
  const supabase = await createClient()
  const snap = await snapshot(supabase, user.id)
  const ctx = ctxOf(snap.content)
  const ready = readyPoints(snap.content)
  const today = studyDate(new Date())
  const steps: V3Step[] = []
  const rounds: V3Session['rounds'] = {}
  const patterns: Record<string, string> = {}
  const pointOf = new Map(snap.content.map((p) => [p.id, p]))

  if (mode === 'learn') {
    // Mẫu đang học: bài hôm nay (ngày 2 của mẫu hôm qua trước, rồi ngày 1 còn dở)
    const learning = snap.learners
      .filter((l) => l.phase === 'learning' && !l.archived_at && ready.has(pointOf.get(l.point_id)?.code ?? ''))
      .sort((a, b) => b.v3_day - a.v3_day || Date.parse(a.created_at) - Date.parse(b.created_at))
    for (const l of learning) {
      const p = pointOf.get(l.point_id)!
      patterns[p.code] = p.pattern
      const st = stateOf(l)
      for (const key of baiToday(st, countsOf(p.code), today)) {
        const b = introBai(ctx, p.code, key, st.scores[key]?.n ?? 0)
        if (b) steps.push({ kind: 'bai', bai: b })
      }
    }
    // Mẫu mới: thẻ giới thiệu + câu ví dụ, rồi 6 bài ngày 1
    for (const p of freshPoints(snap).filter((x) => ready.has(x.code))) {
      patterns[p.code] = p.pattern
      steps.push({ kind: 'intro', intro: introOf(ctx, p) })
      for (let i = 0; i < countsOf(p.code).day1; i++) {
        const b = introBai(ctx, p.code, `1:${i}`, 0)
        if (b) steps.push({ kind: 'bai', bai: b })
      }
    }
    return { mode, steps, furigana: snap.settings.furigana, rounds, patterns }
  }

  // Ôn: mẫu đến hạn chia nhóm 5; mỗi nhóm 2 dạng phụ; mỗi mẫu 4 câu, chọn câu lâu chưa gặp nhất
  const due = dueReview(snap).filter((l) => ready.has(pointOf.get(l.point_id)?.code ?? ''))
  const seen = lastSeenOf(snap)
  const used = new Set<string>()
  const items: { code: string; type: V3Type; question: V3PublicQuestion }[] = []
  due.forEach((l, n) => {
    const p = pointOf.get(l.point_id)!
    patterns[p.code] = p.pattern
    const types = reviewTypesFor(reviewTypesAvailable(p.code), rotationFor(Math.floor(n / GRAMMAR_V3.groupSize), dayNumber(today)))
    let got = 0
    for (const t of types) {
      const cands = refsOfType(p.code, t)
        .map((ref) => ({ ref, q: questionAt(ref)! }))
        .filter((x) => x.q && !used.has(x.q.sid))
        .sort((a, b) => (seen.get(ctx.sidIds.get(a.q.sid) ?? '') ?? 0) - (seen.get(ctx.sidIds.get(b.q.sid) ?? '') ?? 0) || Math.random() - 0.5)
      for (const c of cands) {
        const pub = publicQuestion(ctx, c.ref, c.q)
        if (!pub) continue
        used.add(c.q.sid)
        items.push({ code: p.code, type: t, question: { ...pub, type: t } })
        got++
        break
      }
    }
    if (got) rounds[p.code] = { roundId: randomUUID(), size: got }
  })
  groupReview(items, shuffle).forEach((g, i) => {
    steps.push({
      kind: 'bai',
      bai: {
        key: `review:${i}`,
        type: g.type,
        stage: `Review · ${Object.keys(rounds).length} ${Object.keys(rounds).length === 1 ? 'pattern' : 'patterns'}`,
        guide: g.type === 'mix' ? 'A few types with only one or two questions, mixed into one set.' : 'Questions from several patterns, mixed.',
        questions: g.items.map((x) => x.question),
        spare: [],
      },
    })
  })
  return { mode, steps, furigana: snap.settings.furigana, rounds, patterns }
}

// ---------------------------------------------------------------------------
// Chấm và lưu
// ---------------------------------------------------------------------------

interface SubmitItem {
  ref: BankRef
  refText: string
  q: BankQuestion
  answer: V3Answer
  clientEventId: string
  ms: number
}

function parseItems(input: unknown): SubmitItem[] | null {
  const v = input as { items?: unknown } | null
  if (!v || !Array.isArray(v.items) || v.items.length === 0 || v.items.length > GRAMMAR_V3.perBai) return null
  const out: SubmitItem[] = []
  for (const raw of v.items as Record<string, unknown>[]) {
    const ref = parseRef(raw?.ref)
    const q = ref && questionAt(ref)
    if (!ref || !q) return null
    const a = raw.answer
    const okAnswer =
      (typeof a === 'string' && a.length <= 200) || typeof a === 'boolean' || (typeof a === 'number' && Number.isInteger(a)) ||
      (Array.isArray(a) && a.length <= 4 && a.every((x) => Number.isInteger(x)))
    if (!okAnswer) return null
    if (typeof raw.clientEventId !== 'string' || !UUID.test(raw.clientEventId)) return null
    out.push({ ref, refText: raw.ref as string, q, answer: a as V3Answer, clientEventId: raw.clientEventId, ms: Math.max(0, Math.round(Number(raw.ms) || 0)) })
  }
  return out
}

/** Vòng làm lại câu sai: chỉ chấm, không lưu. */
export async function checkV3Bai(input: unknown): Promise<V3SubmitResponse> {
  const items = parseItems(input)
  if (!items) return { status: 'invalid' }
  await requireUser()
  const results = items.map((x) => grade(x.q, x.refText, x.answer))
  return { status: 'saved', results, correct: results.filter((r) => r.correct).length }
}

const introTier = (stage: string) => (stage.startsWith('Intro 3') ? 3 : stage.startsWith('Intro 2') ? 2 : 1)

export async function submitV3Bai(input: unknown): Promise<V3SubmitResponse> {
  const items = parseItems(input)
  const v = input as { mode?: unknown; rounds?: unknown } | null
  if (!items || (v?.mode !== 'learning' && v?.mode !== 'review')) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const content = await readContent(supabase)
  const ctx = ctxOf(content)
  const now = new Date()
  const today = studyDate(now)
  const results = items.map((x) => grade(x.q, x.refText, x.answer))
  const correct = results.filter((r) => r.correct).length
  const codes = [...new Set(items.map((x) => x.ref.code))]
  const points = codes.map((c) => ctx.content.get(c))
  if (points.some((p) => !p) || items.some((x) => !ctx.sidIds.has(x.q.sid))) return { status: 'not_found' }
  // Gửi lại bài đã lưu (mất mạng lúc nhận kết quả): trả kết quả, không lưu lần nữa
  const { data: dup } = await supabase.from('grammar_logs').select('id').eq('user_id', user.id).eq('client_event_id', items[0].clientEventId).limit(1)
  if (dup && dup.length) return { status: 'saved', results, correct }

  const { data: rows, error } = await supabase
    .from('learner_grammar')
    .select('id, point_id, phase, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, completed_at, archived_at, version, created_at, v3_day, v3_day_date, v3_scores, last_review_round, points, points_today, points_date')
    .eq('user_id', user.id)
    .in('point_id', points.map((p) => p!.id))
  if (error) throw new Error(`Không đọc được learner_grammar: ${error.message}`)
  const learners = new Map(((rows ?? []) as LearnerRow[]).map((l) => [l.point_id, l]))

  const logOf = (x: SubmitItem, r: V3Graded, l: LearnerRow, extra: Record<string, unknown>) => ({
    learner_grammar_id: l.id, sentence_id: ctx.sidIds.get(x.q.sid), client_event_id: x.clientEventId,
    exercise_type: typeAt(x.ref) ?? 'G1', outcome: (r.correct ? 'correct' : 'wrong') as Outcome, response_time_ms: x.ms, ...extra,
  })
  const scheduleFields = (l: LearnerRow) => {
    const s = scheduleOf(l)
    return { state: s.state, due_at: s.due.toISOString(), stability: s.stability, difficulty: s.difficulty, scheduled_days: s.scheduledDays, learning_steps: s.learningSteps, reps: s.reps, lapses: s.lapses, last_review_at: s.lastReviewAt?.toISOString() ?? null }
  }

  let passed: boolean | undefined
  let completed: boolean | undefined
  const logs: Record<string, unknown>[] = []
  const updates: Record<string, unknown>[] = []

  if (v.mode === 'learning') {
    // Một bài Intro: mọi câu cùng mẫu, cùng bài
    const first = items[0].ref
    if (first.kind !== 'intro' || items.some((x) => x.ref.kind !== 'intro' || x.ref.code !== first.code || x.ref.day !== first.day || x.ref.bai !== first.bai)) return { status: 'invalid' }
    const p = points[0]!
    const l = learners.get(p.id)
    if (!l || l.phase !== 'learning') return { status: 'not_active' }
    const key = `${first.day}:${first.bai}`
    const st = stateOf(l)
    if (!baiToday(st, countsOf(p.code), today).includes(key)) return { status: 'not_active' }
    const r = applyBai(st, key, correct, countsOf(p.code), today)
    passed = (r.state.scores[key]?.c ?? 0) >= GRAMMAR_V3.passAt
    completed = r.completed
    const tier = introTier(bankPoint(p.code)!.days[String(first.day) as '1' | '2'][first.bai].stage)
    items.forEach((x, i) => logs.push(logOf(x, results[i], l, { tier, points: results[i].correct ? 1 : 0, round_id: null })))
    const sched = r.completed ? newReviewSchedule(now) : null
    updates.push({
      id: l.id, expected_version: l.version, phase: r.completed ? 'review' : 'learning',
      v3_day: r.state.day, v3_day_date: r.state.dayDate, v3_scores: r.state.scores,
      ...(sched
        ? { state: sched.state, due_at: sched.due.toISOString(), stability: sched.stability, difficulty: sched.difficulty, scheduled_days: sched.scheduledDays, learning_steps: sched.learningSteps, reps: sched.reps, lapses: sched.lapses, last_review_at: sched.lastReviewAt?.toISOString() ?? null }
        : { ...scheduleFields(l), scheduled_days: 0 }),
      completed: r.completed, review_round: null,
    })
  } else {
    // Ôn: câu của nhiều mẫu; mẫu đủ số câu của lượt thì chấm lịch FSRS (gộp kết quả: đúng hết Good, sai 1 Hard, sai ≥ nửa Again)
    const rounds = (v.rounds ?? {}) as Record<string, { roundId?: unknown; size?: unknown }>
    const prior = await readLogs(supabase, user.id, points.map((p) => p!.id))
    for (const p of points) {
      const l = learners.get(p!.id)
      if (!l || l.phase !== 'review') return { status: 'not_active' }
      const round = rounds[p!.code]
      if (!round || typeof round.roundId !== 'string' || !UUID.test(round.roundId) || !Number.isInteger(round.size) || (round.size as number) < 1 || (round.size as number) > GRAMMAR_V3.reviewPerPattern) return { status: 'invalid' }
      const mine = items.map((x, i) => ({ x, r: results[i] })).filter(({ x }) => x.ref.code === p!.code)
      mine.forEach(({ x, r }) => logs.push(logOf(x, r, l, { tier: null, points: 0, round_id: round.roundId })))
      const before = prior.filter((g) => g.round_id === round.roundId && g.mode === 'review').map((g) => g.outcome)
      const outcomes = [...before, ...mine.map(({ r }) => (r.correct ? 'correct' : 'wrong') as Outcome)]
      if (outcomes.length >= (round.size as number) && l.last_review_round !== round.roundId) {
        const s = nextReviewSchedule(scheduleOf(l), reviewRating(outcomes), now)
        updates.push({
          id: l.id, expected_version: l.version, phase: 'review', v3_day: l.v3_day, v3_day_date: l.v3_day_date, v3_scores: l.v3_scores ?? {},
          state: s.state, due_at: s.due.toISOString(), stability: s.stability, difficulty: s.difficulty, scheduled_days: s.scheduledDays,
          learning_steps: s.learningSteps, reps: s.reps, lapses: s.lapses, last_review_at: s.lastReviewAt?.toISOString() ?? null,
          completed: false, review_round: round.roundId,
        })
      }
    }
  }

  const { data, error: rpcError } = await supabase.rpc('submit_grammar_v3', {
    p_mode: v.mode, p_logs: logs, p_updates: updates, p_study_date: today, p_answered_at: now.toISOString(),
  })
  if (rpcError) throw new Error(`submit_grammar_v3 lỗi: ${rpcError.message}`)
  const status = (data as { status: string }).status
  if (status !== 'saved' && status !== 'duplicate') return { status: status as 'invalid' | 'not_found' | 'conflict' }
  return { status: 'saved', results, passed, completed, correct }
}

// ---------------------------------------------------------------------------
// Việc hôm nay (trang tổng quan)
// ---------------------------------------------------------------------------

export interface V3Today {
  newLeft: number
  /** Mẫu đang học có bài hôm nay. */
  learningDue: number
  reviewDue: number
  /** Ngày Intro của từng mẫu đang học (mã → 1 | 2). */
  days: Record<string, 1 | 2>
  /** Mẫu có ngân hàng câu V3. */
  ready: Set<string>
}

export function v3Today(snap: Snapshot): V3Today {
  const ready = readyPoints(snap.content)
  const today = studyDate(new Date())
  const pointOf = new Map(snap.content.map((p) => [p.id, p]))
  const days: Record<string, 1 | 2> = {}
  let learningDue = 0
  for (const l of snap.learners) {
    const code = pointOf.get(l.point_id)?.code
    if (l.phase !== 'learning' || !code) continue
    days[code] = l.v3_day === 2 ? 2 : 1
    if (!l.archived_at && ready.has(code) && baiToday(stateOf(l), countsOf(code), today).length > 0) learningDue++
  }
  return {
    newLeft: freshPoints(snap).filter((p) => ready.has(p.code)).length,
    learningDue,
    reviewDue: dueReview(snap).filter((l) => ready.has(pointOf.get(l.point_id)?.code ?? '')).length,
    days,
    ready,
  }
}
