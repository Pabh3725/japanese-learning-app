// DAL cho các câu Stage 2, 4, 5 (VOC-02, VOC-03, VOC-07, VOC-08, SCH-02). Server-only.
//   getStageSession:   từ đã đến hẹn ở stage này → mỗi từ một câu, ưu tiên phần bắt buộc còn thiếu
//   submitStageAnswer: SERVER chấm, tự cấp vị trí câu trong ngày, gọi submitExercise
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import { buildMatchRound, parseMatchPenalties, type MatchRoundData } from '@/lib/exercise/match-round'
import { deriveEarned } from '@/lib/exercise/mappers'
import { pickDueWords } from '@/lib/exercise/questions'
import {
  buildStageQuestion,
  chooseStageExercise,
  gradeStageAnswer,
  parseStageAnswerRequest,
  wordReveal,
  type QuestionData,
  type QuestionPools,
  type StageWord,
  type WordReveal,
} from '@/lib/exercise/stage-questions'
import { RULES_V3 } from '@/lib/learning/rules'
import { studyDate } from '@/lib/learning/time'
import type { Outcome, ScoredStage } from '@/lib/learning/types'

const PAGE = 1000
const WORD_COLUMNS = 'id, expression, reading_kana, meaning_vi, han_viet, is_kana_only, emoji, romaji'

export type StageQuestion =
  | (QuestionData & {
      learnerVocabularyId: string
      /** Mã cho lần nộp câu này. Cấp ở server nên chạy được cả khi trình duyệt không có crypto.randomUUID. */
      clientEventId: string
    })
  | MatchRoundData

export interface StageSessionData {
  questions: StageQuestion[]
  /** Lần hẹn gần nhất khi hiện chưa có từ nào đến hẹn; null = chưa có từ nào ở stage này. */
  nextDueAt: string | null
}

type Supabase = Awaited<ReturnType<typeof createClient>>

type WordRow = {
  id: string
  vocabulary_id: string
  current_stage: number
  vocabularies: StageWord & { sort_order: number }
  learner_stage_schedules: { due_at: string }[]
}

/** Kho đáp án nhiễu. Tự chia trang vì Data API trả tối đa 1000 dòng mỗi lần. */
async function loadPools(supabase: Supabase): Promise<QuestionPools> {
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
  const { data: kanji, error } = await supabase.from('kanji').select('character, han_viet').range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được kanji: ${error.message}`)
  return { words, kanji: kanji ?? [] }
}

export async function getStageSession(stage: ScoredStage): Promise<StageSessionData> {
  const user = await requireUser()
  const supabase = await createClient()

  const [words_, excluded] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select(`id, vocabulary_id, current_stage, vocabularies!inner(${WORD_COLUMNS}, sort_order), learner_stage_schedules!inner(due_at)`)
      .eq('user_id', user.id)
      .eq('learning_status', 'learning')
      // Một stage chạy tới khi hoàn tất, kể cả sau khi đã mở stage sau
      .eq('learner_stage_schedules.stage_number', stage)
      .is('learner_stage_schedules.completed_at', null)
      .range(0, PAGE - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, PAGE - 1),
  ])
  if (words_.error) throw new Error(`Không đọc được learner_vocabulary: ${words_.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)

  const excludedIds = new Set(excluded.data?.map((r) => r.vocabulary_id))
  const active = ((words_.data ?? []) as unknown as WordRow[])
    .filter((r) => !excludedIds.has(r.vocabulary_id))
    .map((r) => ({ row: r, dueAt: r.learner_stage_schedules[0].due_at, sortOrder: r.vocabularies.sort_order }))
  const due = pickDueWords(active, new Date())
  if (due.length === 0) return { questions: [], nextDueAt: active.map((r) => r.dueAt).sort()[0] ?? null }

  // Dạng bài đã có điểm của từng từ, để ưu tiên phần còn thiếu; kho đáp án nhiễu; các từ đã học
  const [logs, pools, started] = await Promise.all([
    supabase
      .from('exercise_logs')
      .select('learner_vocabulary_id, exercise_type, points')
      .eq('user_id', user.id)
      .eq('stage_number', stage)
      .gt('points', 0)
      .in('learner_vocabulary_id', due.map((r) => r.row.id)),
    loadPools(supabase),
    supabase.from('learner_vocabulary').select('vocabulary_id').eq('user_id', user.id).range(0, PAGE - 1),
  ])
  if (logs.error) throw new Error(`Không đọc được exercise_logs: ${logs.error.message}`)
  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  const poolsWithLearned = { ...pools, learnedWordIds: new Set(started.data?.map((r) => r.vocabulary_id)) }

  const questions: StageQuestion[] = due.map(({ row }): StageQuestion => {
    const earned = deriveEarned((logs.data ?? []).filter((l) => l.learner_vocabulary_id === row.id))
    const exercise = chooseStageExercise(row.vocabularies, stage, earned)
    const question = buildStageQuestion(row.vocabularies, exercise, poolsWithLearned)
    return {
      ...question,
      ...(question.kind === 'choice' ? { reveal: wordReveal(row.vocabularies, row.current_stage) } : {}),
      learnerVocabularyId: row.id,
      clientEventId: randomUUID(),
    }
  })

  if (stage === 5) {
    const round = await buildRoundForUser(supabase, user.id, excludedIds, due.map((r) => r.row.id), pools.words)
    // Cuối lượt: đặt sớm hơn thì các cặp ghép sẽ lộ cách đọc và nghĩa của những câu còn lại
    if (round) questions.push(round)
  }
  return { questions, nextDueAt: null }
}

/** Vòng ghép ô dùng các từ đã học, ưu tiên từ vừa đến hẹn trong lượt và từ đang ở Stage 5. */
async function buildRoundForUser(
  supabase: Supabase,
  userId: string,
  excludedIds: ReadonlySet<string>,
  dueIds: readonly string[],
  words: readonly StageWord[],
): Promise<MatchRoundData | null> {
  const { data, error } = await supabase
    .from('learner_vocabulary')
    .select('id, vocabulary_id, current_stage, learner_stage_schedules(stage_number, completed_at)')
    .eq('user_id', userId)
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)

  const byId = new Map(words.map((w) => [w.id, w]))
  const rows = (data ?? []) as unknown as {
    id: string
    vocabulary_id: string
    current_stage: number
    learner_stage_schedules: { stage_number: number; completed_at: string | null }[]
  }[]
  const candidates = rows.flatMap((row) => {
    const word = byId.get(row.vocabulary_id)
    if (!word || excludedIds.has(row.vocabulary_id)) return []
    const stage5Active = row.learner_stage_schedules.some((s) => s.stage_number === 5 && s.completed_at === null)
    return [{ ...word, learnerVocabularyId: row.id, currentStage: row.current_stage, stage5Active }]
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

export async function submitStageAnswer(input: unknown): Promise<SubmitStageAnswerResponse> {
  const req = parseStageAnswerRequest(input)
  if (!req) return { status: 'invalid' }

  const user = await requireUser()
  const supabase = await createClient()

  // Đáp án thật lấy từ database, không lấy từ trình duyệt
  const [{ data, error }, daySeq] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select(`id, current_stage, vocabularies!inner(${WORD_COLUMNS})`)
      .eq('id', req.learnerVocabularyId)
      .eq('user_id', user.id)
      .maybeSingle(),
    getNextDaySeq(studyDate(new Date())),
  ])
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return { status: 'not_found' }

  const { vocabularies: word, current_stage: currentStage } = data as unknown as { vocabularies: StageWord; current_stage: number }
  const { outcome, answer } = gradeStageAnswer(word, req.exercise, req.answer)

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
    return { status: 'graded', outcome, answer, reading: word.reading_kana, reveal: wordReveal(word, currentStage), result: saved.result }
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
    p_points: RULES_V3.matchRound.wrongPoints,
    p_study_date: studyDate(now),
    p_answered_at: now.toISOString(),
  })
  if (rpcError) throw new Error(`apply_match_penalties lỗi: ${rpcError.message}`)
  return { status: 'saved' }
}
