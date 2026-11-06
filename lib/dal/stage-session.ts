// DAL cho các câu Stage 2, 4, 5 (VOC-02, VOC-03, VOC-07, VOC-08, SCH-02). Server-only.
//   getLearnSession:   một phiên khu Learn: thẻ giới thiệu, rồi câu đến hẹn của mọi stage đã trộn
//   submitStageAnswer: SERVER chấm, tự cấp vị trí câu trong ngày, gọi submitExercise
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import { buildMatchRound, parseMatchPenalties, type MatchRoundData } from '@/lib/exercise/match-round'
import { getIntroData } from '@/lib/dal/intro'
import { getStage3Items, type Stage3Item } from '@/lib/dal/stage3'
import { deriveEarned } from '@/lib/exercise/mappers'
import type { IntroWord } from '@/lib/intro/words'
import { INTROS_PER_SESSION, mixQuestions, newWordsBlockedBy, QUESTIONS_PER_SESSION, sessionsFor, type NewWordsBlock } from '@/lib/learn/session'
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
  type WordReveal,
} from '@/lib/exercise/stage-questions'
import { RULES_V4 } from '@/lib/learning/rules'
import { studyDate } from '@/lib/learning/time'
import { reachedKanjiIntro, trailingCount } from '@/lib/learning/stage'
import type { Outcome, ScoredStage } from '@/lib/learning/types'

const PAGE = 1000
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
    })
  | MatchRoundData

type Supabase = Awaited<ReturnType<typeof createClient>>

type WordRow = {
  id: string
  vocabulary_id: string
  current_stage: number
  kanji_intro_seen_at: string | null
  vocabularies: StageWord & { sort_order: number }
  learner_stage_schedules: { stage_number: number; due_at: string; stage_points: number; completed_at: string | null; reps: number }[]
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
  const { data: kanji, error } = await supabase.from('kanji').select('character, han_viet, meaning_vi').range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được kanji: ${error.message}`)
  return { words, kanji: kanji ?? [] }
}

type DueEntry = { row: WordRow; stage: ScoredStage; schedule: WordRow['learner_stage_schedules'][number] }

export interface DailyLimits {
  newPerDay: number
  stageCap: number
  reviewCap: number
  unlockThreshold: number
  /** Card đến hạn đầu ngày, tính gần đúng bằng số đang đến hạn cộng số đã ôn hôm nay. */
  cardsDueToday: number
  answeredToday: number
}

export async function readDailyLimits(supabase: Supabase, userId: string): Promise<DailyLimits> {
  const today = studyDate(new Date())
  const [settings, cardsDue, reviewed, answered] = await Promise.all([
    supabase.from('learner_settings').select('daily_new_limit, stage_cap, review_cap, unlock_threshold').eq('user_id', userId).maybeSingle(),
    supabase.from('review_cards').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('retired_at', null).lte('due_at', new Date().toISOString()),
    supabase.from('review_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('study_date', today),
    supabase.from('exercise_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('study_date', today).eq('source', 'lesson'),
  ])
  if (settings.error) throw new Error(`Không đọc được learner_settings: ${settings.error.message}`)
  if (cardsDue.error) throw new Error(`Không đọc được review_cards: ${cardsDue.error.message}`)
  if (reviewed.error) throw new Error(`Không đọc được review_logs: ${reviewed.error.message}`)
  if (answered.error) throw new Error(`Không đọc được exercise_logs: ${answered.error.message}`)
  const { defaults } = RULES_V4
  return {
    newPerDay: settings.data?.daily_new_limit ?? defaults.newPerDay,
    stageCap: settings.data?.stage_cap ?? defaults.stageCap,
    reviewCap: settings.data?.review_cap ?? defaults.reviewCap,
    unlockThreshold: settings.data?.unlock_threshold ?? defaults.unlockThreshold,
    cardsDueToday: (cardsDue.count ?? 0) + (reviewed.count ?? 0),
    answeredToday: answered.count ?? 0,
  }
}

export type LearnIntroItem = { kind: 'new'; word: IntroWord } | Stage3Item

export interface LearnSessionData {
  /** Cụm thẻ giới thiệu ở đầu phiên. Có thẻ thì làm xong mới sang câu hỏi. */
  intros: LearnIntroItem[]
  questions: StageQuestion[]
  /** Số phiên còn lại hôm nay, kể cả phiên này. */
  sessionsLeft: number
  /** Lý do hôm nay không có thêm từ mới. */
  block: NewWordsBlock
  stageLimitReached: boolean
  /** Lần hẹn gần nhất khi hiện không có câu nào đến hẹn. */
  nextDueAt: string | null
}

/**
 * Một phiên của khu Learn. `practiceOnly`: đã xong cụm thẻ giới thiệu nên chỉ lấy câu hỏi.
 * Từ vừa giới thiệu chưa từng được hỏi nên đứng trước, để câu đầu tiên đến ngay sau thẻ.
 */
export async function getLearnSession(practiceOnly: boolean): Promise<LearnSessionData> {
  const user = await requireUser()
  const supabase = await createClient()

  const [words_, excluded, limits] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select(`id, vocabulary_id, current_stage, kanji_intro_seen_at, vocabularies!inner(${WORD_COLUMNS}, sort_order), learner_stage_schedules(stage_number, due_at, stage_points, completed_at, reps)`)
      .eq('user_id', user.id)
      .eq('learning_status', 'learning')
      .range(0, PAGE - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, PAGE - 1),
    readDailyLimits(supabase, user.id),
  ])
  if (words_.error) throw new Error(`Không đọc được learner_vocabulary: ${words_.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)

  const excludedIds = new Set(excluded.data?.map((r) => r.vocabulary_id))
  const now = Date.now()
  const active: DueEntry[] = ((words_.data ?? []) as unknown as WordRow[])
    .filter((row) => !excludedIds.has(row.vocabulary_id))
    .flatMap((row) =>
      row.learner_stage_schedules
        .filter((s) => s.completed_at === null && (s.stage_number === 2 || s.stage_number === 4 || s.stage_number === 5))
        // Stage 4: đủ điểm mà chưa xem thẻ Giới thiệu Hán tự thì tạm dừng, vì các câu tiếp theo có Kanji
        .filter((s) => !(s.stage_number === 4 && row.kanji_intro_seen_at === null && reachedKanjiIntro(s.stage_points)))
        .map((schedule) => ({ row, stage: schedule.stage_number as ScoredStage, schedule })),
    )
  const dueAll = active
    .filter((e) => Date.parse(e.schedule.due_at) <= now)
    .sort(
      (a, b) =>
        Number(b.schedule.reps === 0) - Number(a.schedule.reps === 0) ||
        Date.parse(a.schedule.due_at) - Date.parse(b.schedule.due_at) ||
        a.row.vocabularies.sort_order - b.row.vocabularies.sort_order,
    )
  const stageRoom = Math.max(0, limits.stageCap - limits.answeredToday)
  const dueCount = Math.min(dueAll.length, stageRoom)
  const block = newWordsBlockedBy({
    cardsDue: limits.cardsDueToday,
    unlockThreshold: limits.unlockThreshold,
    stageDue: dueAll.length + limits.answeredToday,
    stageCap: limits.stageCap,
  })

  const [intro, stage3Items] = await Promise.all([getIntroData(), getStage3Items()])
  const newLeft = block ? 0 : intro.remainingToday
  const common = { block, stageLimitReached: stageRoom === 0 && dueAll.length > 0 }

  if (!practiceOnly) {
    const newItems: LearnIntroItem[] = block ? [] : intro.words.map((word) => ({ kind: 'new' as const, word }))
    const intros = [...stage3Items, ...newItems].slice(0, INTROS_PER_SESSION)
    if (intros.length > 0) {
      return {
        ...common,
        intros,
        questions: [],
        sessionsLeft: Math.max(1, sessionsFor(dueCount + newLeft + stage3Items.length)),
        nextDueAt: null,
      }
    }
  }

  const entries = dueAll.slice(0, Math.min(QUESTIONS_PER_SESSION, stageRoom))
  if (entries.length === 0) {
    const nextDueAt = active.filter((e) => Date.parse(e.schedule.due_at) > now).map((e) => e.schedule.due_at).sort()[0] ?? null
    return { ...common, intros: [], questions: [], sessionsLeft: 0, nextDueAt }
  }

  const [logs, pools, started] = await Promise.all([
    supabase
      .from('exercise_logs')
      .select('learner_vocabulary_id, stage_number, exercise_type, points, outcome')
      .eq('user_id', user.id)
      .eq('source', 'lesson')
      .in('learner_vocabulary_id', [...new Set(entries.map((e) => e.row.id))])
      .order('answered_at', { ascending: false })
      .range(0, PAGE - 1),
    loadPools(supabase),
    supabase.from('learner_vocabulary').select('vocabulary_id').eq('user_id', user.id).range(0, PAGE - 1),
  ])
  if (logs.error) throw new Error(`Không đọc được exercise_logs: ${logs.error.message}`)
  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  const poolsWithLearned = { ...pools, learnedWordIds: new Set(started.data?.map((r) => r.vocabulary_id)) }

  const built = entries.map(({ row, stage, schedule }) => {
    const wordLogs = (logs.data ?? []).filter((l) => l.learner_vocabulary_id === row.id && l.stage_number === stage)
    const exercise = chooseStageExercise(row.vocabularies, stage, deriveEarned(wordLogs), schedule.stage_points)
    const question = buildStageQuestion(row.vocabularies, exercise, poolsWithLearned, undefined, { blind: stage === 5 })
    const known = { currentStage: row.current_stage, kanjiIntroSeen: row.kanji_intro_seen_at !== null }
    return {
      ...question,
      ...(question.kind === 'choice' ? { reveal: wordReveal(row.vocabularies, known) } : {}),
      stage,
      wrongStreak: trailingCount(wordLogs.map((l) => l.outcome as Outcome), 'wrong'),
      learnerVocabularyId: row.id,
      vocabularyId: row.vocabulary_id,
      clientEventId: randomUUID(),
      wordId: row.id,
    }
  })
  const questions: StageQuestion[] = mixQuestions(built)

  const stage5Ids = entries.filter((e) => e.stage === 5).map((e) => e.row.id)
  if (stage5Ids.length > 0) {
    const round = await buildRoundForUser(supabase, user.id, excludedIds, stage5Ids, pools.words)
    // Cuối phiên: đặt sớm hơn thì các cặp ghép sẽ lộ cách đọc và nghĩa của những câu còn lại
    if (round) questions.push(round)
  }
  return { ...common, intros: [], questions, sessionsLeft: Math.max(1, sessionsFor(dueCount + newLeft)), nextDueAt: null }
}

/** Vòng ghép ô dùng các từ đã học, ưu tiên từ đang ở Stage 5. */
async function buildRoundForUser(
  supabase: Supabase,
  userId: string,
  excludedIds: ReadonlySet<string>,
  dueIds: readonly string[],
  words: readonly StageWord[],
): Promise<MatchRoundData | null> {
  const { data, error } = await supabase
    .from('learner_vocabulary')
    .select('id, vocabulary_id, kanji_intro_seen_at, learner_stage_schedules(stage_number, completed_at)')
    .eq('user_id', userId)
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)

  const byId = new Map(words.map((w) => [w.id, w]))
  const rows = (data ?? []) as unknown as {
    id: string
    vocabulary_id: string
    kanji_intro_seen_at: string | null
    learner_stage_schedules: { stage_number: number; completed_at: string | null }[]
  }[]
  const candidates = rows.flatMap((row) => {
    const word = byId.get(row.vocabulary_id)
    if (!word || excludedIds.has(row.vocabulary_id)) return []
    const stage5Active = row.learner_stage_schedules.some((s) => s.stage_number === 5 && s.completed_at === null)
    return [{ ...word, learnerVocabularyId: row.id, kanjiIntroSeen: row.kanji_intro_seen_at !== null, stage5Active }]
  })
  // Từ chưa có ở Stage 5 thì không bị trừ điểm, nên cần ít nhất một từ đang chạy Stage 5
  if (!candidates.some((c) => c.stage5Active && dueIds.includes(c.learnerVocabularyId))) return null
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
  return { word, reveal: wordReveal(word, known), ...gradeStageAnswer(word, req.exercise, req.answer, kanji) }
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

/** Vòng ghép ô: trừ điểm các từ bị ghép sai. Từ không chạy Stage 5 thì bỏ qua. */
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
    .eq('stage_number', 5)
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
    p_points: RULES_V4.matchRound.wrongPoints,
    p_study_date: studyDate(now),
    p_answered_at: now.toISOString(),
  })
  if (rpcError) throw new Error(`apply_match_penalties lỗi: ${rpcError.message}`)
  return { status: 'saved' }
}
