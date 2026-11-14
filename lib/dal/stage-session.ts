// DAL cho các câu Stage 2, 3, 5, 6 (VOC-02, VOC-03, VOC-07, VOC-08, SCH-02). Server-only.
//   buildStageQuestionFor: dựng một câu Stage cho bài Learn (V9, lib/dal/lesson.ts)
//   submitStageAnswer: SERVER chấm, tự cấp vị trí câu trong ngày, gọi submitExercise
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { readKanjiCharTier } from '@/lib/dal/kanji'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import { buildMatchRound, parseMatchPenalties, type MatchRoundData } from '@/lib/exercise/match-round'
import { deriveEarned } from '@/lib/exercise/mappers'
import { newWordsBlockedBy, QUESTIONS_PER_SESSION } from '@/lib/learn/session'
import { readDailyLimits, saveBorrowed } from '@/lib/dal/daily-limits'
import { readSpeedModes } from '@/lib/dal/speed-matching'
import { EXERCISES } from '@/lib/learning/rules'
import { readStarRound, readStarredIds, type StarRoundWord } from '@/lib/dal/star-relearn'
import { planStarQuestions, practiceSkillCode } from '@/lib/learn/star-round'
import { MIN_SPEED_WORDS, type SpeedWord } from '@/lib/speed-matching'
import { allowedBorrow } from '@/lib/learning/daily-plan'
import { kanjiPieces } from '@/lib/exercise/word-parts'
import {
  buildStageQuestion,
  chooseStageExercise,
  gradeStageAnswer,
  parseStageAnswerRequest,
  withHint,
  wordReveal,
  type KanjiRow,
  type QuestionData,
  type QuestionPools,
  type StageAnswerRequest,
  type StageWord,
  kanaView,
  type WordReveal,
} from '@/lib/exercise/stage-questions'
import { RULES_V9 } from '@/lib/learning/rules'
import { studyDate } from '@/lib/learning/time'
import { trailingCount } from '@/lib/learning/stage'
import type { Outcome, ScoredStage } from '@/lib/learning/types'
import { readAllPages } from '@/lib/dal/pages'
import { readKnownWordIds } from '@/lib/dal/known-words'

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const WORD_COLUMNS = 'id, expression, reading_kana, meaning_vi, han_viet, is_kana_only, emoji, romaji'

export type StageQuestion =
  | (QuestionData & {
      learnerVocabularyId: string
      /** Mã cho lần nộp câu này. Cấp ở server nên chạy được cả khi trình duyệt không có crypto.randomUUID. */
      clientEventId: string
      /** Số câu sai liên tiếp ngay trước câu này ở stage này. */
      wrongStreak: number
      stage: ScoredStage
      vocabularyId: string
      /** Có nghĩa là câu của vòng học thêm: chỉ ghi nhật ký, không đổi điểm và lịch. */
      starSessionId?: string
    })
  | MatchRoundData
  | BossRoundData

export interface BossRoundData {
  kind: 'boss'
  clientEventId: string
  words: SpeedWord[]
}

type Supabase = Awaited<ReturnType<typeof createClient>>

type WordRow = {
  id: string
  vocabulary_id: string
  current_stage: number
  kanji_intro_seen_at: string | null
  vocabularies: StageWord & { sort_order: number }
  learner_stage_schedules: { stage_number: number; due_at: string; stage_points: number; completed_at: string | null; reps: number }[]
}

/** Nội dung chỉ đổi khi seed, nên giữ kho đáp án nhiễu trong bộ nhớ một lúc: bài Learn dựng từng câu một. */
let poolsCache: { at: number; value: QuestionPools } | null = null
const POOLS_TTL_MS = 10 * 60_000

/** Từ người học đã gặp (có dòng learner_vocabulary): đáp án nhiễu ưu tiên từ đã học. */
async function readStartedWordIds(supabase: Supabase, userId: string): Promise<Set<string>> {
  const rows = await readAllPages('learner_vocabulary', (from, to) => supabase.from('learner_vocabulary').select('vocabulary_id').eq('user_id', userId).order('id').range(from, to))
  return new Set(rows.map((r) => r.vocabulary_id as string))
}

export async function loadPoolsCached(supabase: Supabase): Promise<QuestionPools> {
  if (poolsCache && Date.now() - poolsCache.at < POOLS_TTL_MS) return poolsCache.value
  const value = await loadPools(supabase)
  poolsCache = { at: Date.now(), value }
  return value
}

/** Kho đáp án nhiễu. Tự chia trang vì Data API trả tối đa 1000 dòng mỗi lần. */
export async function loadPools(supabase: Supabase): Promise<QuestionPools> {
  const words: StageWord[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('vocabularies')
      .select(WORD_COLUMNS)
      .order('sort_order')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được vocabularies: ${error.message}`)
    words.push(...((data ?? []) as StageWord[]))
    if ((data?.length ?? 0) < PAGE) break
  }
  const kanji = await readAllPages('kanji', (from, to) => supabase.from('kanji').select('character, han_viet, meaning_vi').order('character').range(from, to))
  return { words, kanji }
}



export type StageQuestionItem = Extract<StageQuestion, { learnerVocabularyId: string }>

/**
 * V9 bài Learn: dựng một câu Stage cho một từ ở một stage. null khi stage đã xong hoặc từ không còn.
 * `avoid`: dạng bài của câu ngay trước, tránh hai câu cùng dạng liền nhau (R11), không tránh được thì thôi.
 */
export async function buildStageQuestionFor(supabase: Supabase, userId: string, lvId: string, stage: ScoredStage, avoid: string | null): Promise<StageQuestionItem | null> {
  const [rowRes, logsRes, started, pools, kanjiTier] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select(`id, vocabulary_id, current_stage, kanji_intro_seen_at, vocabularies!inner(${WORD_COLUMNS}), learner_stage_schedules(stage_number, stage_points, completed_at)`)
      .eq('id', lvId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('exercise_logs')
      .select('exercise_type, points, outcome')
      .eq('user_id', userId)
      .eq('learner_vocabulary_id', lvId)
      .eq('stage_number', stage)
      .eq('source', 'lesson')
      .order('answered_at', { ascending: false })
      .range(0, 199),
    readStartedWordIds(supabase, userId),
    loadPoolsCached(supabase),
    // Câu dính Kanji chỉ lấy đáp án nhiễu từ chữ đã học (chỉ Stage 4–6 hiện chữ Kanji / Hán Việt; Stage 2–3 không cần đọc)
    stage >= 4 ? readKanjiCharTier(supabase, userId) : undefined,
  ])
  if (rowRes.error) throw new Error(`Không đọc được learner_vocabulary: ${rowRes.error.message}`)
  if (logsRes.error) throw new Error(`Không đọc được exercise_logs: ${logsRes.error.message}`)
  const row = rowRes.data as unknown as (Omit<WordRow, 'learner_stage_schedules'> & { learner_stage_schedules: { stage_number: number; stage_points: number; completed_at: string | null }[] }) | null
  const schedule = row?.learner_stage_schedules.find((s) => s.stage_number === stage && s.completed_at === null)
  if (!row || !schedule) return null

  const logs = logsRes.data ?? []
  const earned = deriveEarned(logs)
  let exercise = chooseStageExercise(row.vocabularies, stage, earned, schedule.stage_points)
  for (let i = 0; i < 6 && exercise === avoid; i++) exercise = chooseStageExercise(row.vocabularies, stage, earned, schedule.stage_points)
  const word = stage === 2 || stage === 3 ? kanaView(row.vocabularies) : row.vocabularies
  const question = buildStageQuestion(word, exercise, { ...pools, learnedWordIds: started, kanjiTier }, undefined, { blind: stage === 3 || stage === 6 })
  const known = { currentStage: row.current_stage, kanjiIntroSeen: row.kanji_intro_seen_at !== null }
  return {
    ...question,
    ...(question.kind === 'choice' ? { reveal: wordReveal(row.vocabularies, known) } : {}),
    stage,
    wrongStreak: trailingCount(logs.map((l) => l.outcome as Outcome), 'wrong'),
    learnerVocabularyId: row.id,
    vocabularyId: row.vocabulary_id,
    clientEventId: randomUUID(),
  }
}

/** V9 bài Learn: câu kế tiếp trong vòng học thêm của một từ có sao. null khi xong vòng. */
export async function buildStarQuestionFor(supabase: Supabase, userId: string, vocabularyId: string, excludedIds: ReadonlySet<string>): Promise<StageQuestionItem | null> {
  const [items, pools] = await Promise.all([readStarRound<StageWord>(supabase, userId, WORD_COLUMNS, excludedIds), loadPoolsCached(supabase)])
  const item = items.find((i) => i.word.vocabularyId === vocabularyId)
  if (!item || item.answered >= item.exercises.length) return null
  return (buildStarQuestions([{ word: item.word, exercise: item.exercises[item.answered] }], pools)[0] as StageQuestionItem) ?? null
}

/** Ứng viên câu sao cho bài Learn: từ có sao còn câu trong vòng học thêm. */
export async function readStarCandidates(supabase: Supabase, userId: string, excludedIds: ReadonlySet<string>): Promise<{ vocabularyId: string; left: number }[]> {
  const items = await readStarRound<StageWord>(supabase, userId, WORD_COLUMNS, excludedIds)
  return items.map((i) => ({ vocabularyId: i.word.vocabularyId, left: i.exercises.length - i.answered }))
}

/** Khu Starred words: chỉ câu vòng học thêm, không giới hạn 3 câu như khi chèn vào phiên Learn. */
export async function getStarredSession(): Promise<{ questions: StageQuestion[]; starredIds: string[] }> {
  const user = await requireUser()
  const supabase = await createClient()
  const [excluded, starredIds, started, pools] = await Promise.all([
    readKnownWordIds(supabase, user.id),
    readStarredIds(supabase, user.id),
    readStartedWordIds(supabase, user.id),
    loadPools(supabase),
  ])
  const items = await readStarRound<StageWord>(supabase, user.id, WORD_COLUMNS, excluded)
  const poolsWithLearned = { ...pools, learnedWordIds: started }
  return { questions: buildStarQuestions(planStarQuestions(items, QUESTIONS_PER_SESSION), poolsWithLearned), starredIds }
}

function buildStarQuestions(plan: ReturnType<typeof planStarQuestions<StarRoundWord<StageWord>>>, pools: QuestionPools): StageQuestion[] {
  const starSessionId = randomUUID()
  return plan.map(({ word, exercise }) => {
    const question = buildStageQuestion(word.word, exercise, pools)
    const known = { currentStage: word.currentStage, kanjiIntroSeen: word.kanjiIntroSeen }
    return {
      ...question,
      ...(question.kind === 'choice' ? { reveal: wordReveal(word.word, known) } : {}),
      stage: 2 as const,
      wrongStreak: 0,
      learnerVocabularyId: word.learnerVocabularyId,
      vocabularyId: word.vocabularyId,
      clientEventId: randomUUID(),
      starSessionId,
    }
  })
}

/** Vòng boss: Speed Matching 30 giây với các từ đã gặp. Chỉ ôn vui, không tính vào giãn cách. */
export async function buildBossRound(supabase: Supabase, userId: string): Promise<BossRoundData | null> {
  const modes = await readSpeedModes(supabase, userId)
  const mixed = modes.find((m) => m.mode === 'mixed')
  if (!mixed || mixed.total < MIN_SPEED_WORDS) return null
  return { kind: 'boss', clientEventId: randomUUID(), words: mixed.words }
}

/** Vòng ghép ô dùng các từ đã học, ưu tiên từ đang ở Stage 3. */
export async function buildRoundForUser(
  supabase: Supabase,
  userId: string,
  excludedIds: ReadonlySet<string>,
  dueIds: readonly string[],
  words: readonly StageWord[],
): Promise<MatchRoundData | null> {
  const data = await readAllPages('learner_vocabulary', (from, to) =>
    supabase.from('learner_vocabulary').select('id, vocabulary_id, kanji_intro_seen_at, learner_stage_schedules(stage_number, completed_at)').eq('user_id', userId).order('id').range(from, to),
  )

  const byId = new Map(words.map((w) => [w.id, w]))
  const rows = data as unknown as {
    id: string
    vocabulary_id: string
    kanji_intro_seen_at: string | null
    learner_stage_schedules: { stage_number: number; completed_at: string | null }[]
  }[]
  const candidates = rows.flatMap((row) => {
    const word = byId.get(row.vocabulary_id)
    if (!word || excludedIds.has(row.vocabulary_id)) return []
    const stage3Active = row.learner_stage_schedules.some((s) => s.stage_number === 3 && s.completed_at === null)
    return [{ ...word, learnerVocabularyId: row.id, kanjiIntroSeen: row.kanji_intro_seen_at !== null, stage3Active }]
  })
  // Từ chưa có ở Stage 3 thì không bị trừ điểm, nên cần ít nhất một từ đang chạy Stage 3
  if (!candidates.some((c) => c.stage3Active && dueIds.includes(c.learnerVocabularyId))) return null
  return buildMatchRound(candidates, randomUUID)
}

export type SubmitStageAnswerResponse =
  | {
      status: 'graded'
      outcome: Outcome
      /** Đáp án đúng, chỉ trả về sau khi đã nộp. */
      answer: string
      /** Kana để đọc lại sau khi trả lời. */
      reading: string
      reveal: WordReveal
      /** Không có khi đây là lần gửi lại của một câu đã lưu. */
      result?: SubmitExerciseResponse['result']
    }
  | { status: 'invalid' | 'not_found' | 'stage_changed' | 'conflict' }

/** Chấm một câu theo đáp án thật trong database, không lấy từ trình duyệt. Không ghi gì. */
async function gradeOnServer(supabase: Supabase, userId: string, req: StageAnswerRequest) {
  const { data, error } = await supabase
    .from('learner_vocabulary')
    .select(`id, current_stage, kanji_intro_seen_at, vocabularies!inner(${WORD_COLUMNS})`)
    .eq('id', req.learnerVocabularyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return null

  const row = data as unknown as { vocabularies: StageWord; current_stage: number; kanji_intro_seen_at: string | null }
  const word = row.vocabularies
  const known = { currentStage: row.current_stage, kanjiIntroSeen: row.kanji_intro_seen_at !== null }

  let kanji: KanjiRow[] = []
  if (req.exercise === 'kanji_char_meaning') {
    const { data: kanjiRows, error: kanjiError } = await supabase
      .from('kanji')
      .select('character, han_viet, meaning_vi')
      .in('character', kanjiPieces(word.expression))
    if (kanjiError) throw new Error(`Không đọc được kanji: ${kanjiError.message}`)
    kanji = kanjiRows ?? []
  }
  return { word, known, reveal: wordReveal(word, known), ...gradeStageAnswer(word, req.exercise, req.answer, kanji) }
}

export type CheckStageAnswerResponse =
  | { status: 'graded'; outcome: Outcome; answer: string; reading: string; reveal: WordReveal }
  | { status: 'invalid' | 'not_found' }

/** Hỏi lại câu sai cuối lượt: chỉ chấm, không ghi nhật ký, không đổi điểm và lịch. */
export async function checkStageAnswer(input: unknown): Promise<CheckStageAnswerResponse> {
  const req = parseStageAnswerRequest(input)
  if (!req) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const graded = await gradeOnServer(supabase, user.id, req)
  if (!graded) return { status: 'not_found' }
  return { status: 'graded', outcome: graded.outcome, answer: graded.answer, reading: graded.word.reading_kana, reveal: graded.reveal }
}

export async function submitStageAnswer(input: unknown): Promise<SubmitStageAnswerResponse> {
  const req = parseStageAnswerRequest(input)
  if (!req) return { status: 'invalid' }

  const user = await requireUser()
  const supabase = await createClient()

  const [graded, daySeq] = await Promise.all([
    gradeOnServer(supabase, user.id, req),
    getNextDaySeq(studyDate(new Date())),
  ])
  if (!graded) return { status: 'not_found' }
  const { word, answer, reveal } = graded
  const outcome = withHint(graded.outcome, req.usedHint)

  const saved = await submitExercise({
    learnerVocabularyId: req.learnerVocabularyId,
    stage: req.stage,
    clientEventId: req.clientEventId,
    exercise: req.exercise,
    outcome,
    daySeq,
    responseMs: req.responseMs,
  })
  if (saved.status === 'saved' || saved.status === 'duplicate') {
    return { status: 'graded', outcome, answer, reading: word.reading_kana, reveal, result: saved.result }
  }
  return { status: saved.status }
}

/** Câu vòng học thêm của từ có sao: chấm rồi chỉ ghi nhật ký, không đổi điểm Stage, điểm Card hay lịch nào. */
export async function submitStarAnswer(input: unknown): Promise<SubmitStageAnswerResponse> {
  const req = parseStageAnswerRequest(input)
  const starSessionId = (input as { starSessionId?: unknown } | null)?.starSessionId
  if (!req || typeof starSessionId !== 'string' || !UUID.test(starSessionId)) return { status: 'invalid' }

  const user = await requireUser()
  const supabase = await createClient()
  const graded = await gradeOnServer(supabase, user.id, req)
  if (!graded) return { status: 'not_found' }
  const { data: row, error: rowError } = await supabase.from('learner_vocabulary').select('vocabulary_id').eq('id', req.learnerVocabularyId).eq('user_id', user.id).single()
  if (rowError) throw new Error(`Không đọc được learner_vocabulary: ${rowError.message}`)
  const outcome = withHint(graded.outcome, req.usedHint)
  const { error } = await supabase.rpc('submit_star_answer', {
    p_session_id: starSessionId,
    p_client_event_id: req.clientEventId,
    p_vocabulary_id: row.vocabulary_id,
    p_skill_code: practiceSkillCode(EXERCISES[req.exercise].skill),
    p_is_correct: outcome === 'correct',
    p_response_time_ms: Math.max(0, Math.round(req.responseMs ?? 0)),
    p_study_date: studyDate(new Date()),
  })
  if (error) throw new Error(`submit_star_answer lỗi: ${error.message}`)
  return { status: 'graded', outcome, answer: graded.answer, reading: graded.word.reading_kana, reveal: graded.reveal }
}

/** Vòng ghép ô: trừ điểm các từ bị ghép sai. Từ không chạy Stage 3 thì bỏ qua. */
export async function submitMatchPenalties(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  const penalties = parseMatchPenalties(input)
  if (!penalties) return { status: 'invalid' }
  if (penalties.length === 0) return { status: 'saved' }

  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('learner_stage_schedules')
    .select('id, learner_vocabulary_id')
    .eq('user_id', user.id)
    .eq('stage_number', 3)
    .is('completed_at', null)
    .in('learner_vocabulary_id', penalties.map((p) => p.learnerVocabularyId))
  if (error) throw new Error(`Không đọc được learner_stage_schedules: ${error.message}`)

  const scheduleOf = new Map((data ?? []).map((r) => [r.learner_vocabulary_id, r.id]))
  const applicable = penalties.filter((p) => scheduleOf.has(p.learnerVocabularyId))
  if (applicable.length === 0) return { status: 'saved' }

  const now = new Date()
  const { error: rpcError } = await supabase.rpc('apply_match_penalties', {
    p_schedule_ids: applicable.map((p) => scheduleOf.get(p.learnerVocabularyId)),
    p_client_event_ids: applicable.map((p) => p.clientEventId),
    p_points: RULES_V9.matchRound.wrongPoints,
    p_study_date: studyDate(now),
    p_answered_at: now.toISOString(),
  })
  if (rpcError) throw new Error(`apply_match_penalties lỗi: ${rpcError.message}`)
  return { status: 'saved' }
}

/** "Học thêm": mượn từ mới của ngày mai, tối đa trọn số từ của một ngày, khi từ mới không bị chặn. */
export async function borrowNewWords(requested: unknown): Promise<{ status: 'saved' | 'blocked' | 'invalid' }> {
  if (!Number.isInteger(requested) || (requested as number) < 1) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const limits = await readDailyLimits(supabase, user.id)
  const block = newWordsBlockedBy({
    cardsDue: limits.cardsDueToday,
    unlockThreshold: limits.unlockThreshold,
    stageDue: limits.stageDueToday,
    stageCap: limits.stageCap,
  })
  const allowed = block
    ? 0
    : allowedBorrow({
        dueSnapshot: limits.cardsDueToday,
        alreadyBorrowedForTomorrow: limits.borrowedForNext,
        requested: requested as number,
        settings: { newPerDay: limits.newPerDay, reviewCap: limits.reviewCap, unlockThreshold: limits.unlockThreshold },
      })
  if (allowed === 0) return { status: 'blocked' }
  await saveBorrowed(supabase, user.id, limits.borrowedForNext + allowed)
  return { status: 'saved' }
}
