// DAL cho các câu Stage 2, 4, 5 (VOC-02, VOC-03, VOC-07, VOC-08, SCH-02). Server-only.
//   getStageSession:   từ đã đến hẹn ở stage này → mỗi từ một câu, ưu tiên phần bắt buộc còn thiếu
//   submitStageAnswer: SERVER chấm, tự cấp vị trí câu trong ngày, gọi submitExercise
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import { deriveEarned } from '@/lib/exercise/mappers'
import { pickDueWords } from '@/lib/exercise/questions'
import {
  buildStageQuestion,
  chooseStageExercise,
  gradeStageAnswer,
  parseStageAnswerRequest,
  type QuestionData,
  type QuestionPools,
  type StageWord,
} from '@/lib/exercise/stage-questions'
import { studyDate } from '@/lib/learning/time'
import type { Outcome, ScoredStage } from '@/lib/learning/types'

const PAGE = 1000
const WORD_COLUMNS = 'id, expression, reading_kana, meaning_vi, han_viet, is_kana_only, emoji'

export type StageQuestion = QuestionData & {
  learnerVocabularyId: string
  /** Mã cho lần nộp câu này. Cấp ở server nên chạy được cả khi trình duyệt không có crypto.randomUUID. */
  clientEventId: string
}

export interface StageSessionData {
  questions: StageQuestion[]
  /** Lần hẹn gần nhất khi hiện chưa có từ nào đến hẹn; null = chưa có từ nào ở stage này. */
  nextDueAt: string | null
}

type Supabase = Awaited<ReturnType<typeof createClient>>

type WordRow = {
  id: string
  vocabulary_id: string
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
      .select(`id, vocabulary_id, vocabularies!inner(${WORD_COLUMNS}, sort_order), learner_stage_schedules!inner(due_at)`)
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

  const questions = due.map(({ row }): StageQuestion => {
    const earned = deriveEarned((logs.data ?? []).filter((l) => l.learner_vocabulary_id === row.id))
    const exercise = chooseStageExercise(row.vocabularies, stage, earned)
    return {
      ...buildStageQuestion(row.vocabularies, exercise, poolsWithLearned),
      learnerVocabularyId: row.id,
      clientEventId: randomUUID(),
    }
  })
  return { questions, nextDueAt: null }
}

export type SubmitStageAnswerResponse =
  | {
      status: 'graded'
      outcome: Outcome
      /** Đáp án đúng, chỉ trả về sau khi đã nộp. */
      answer: string
      /** Kana để đọc lại khi trả lời đúng. */
      reading: string
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
      .select(`id, vocabularies!inner(${WORD_COLUMNS})`)
      .eq('id', req.learnerVocabularyId)
      .eq('user_id', user.id)
      .maybeSingle(),
    getNextDaySeq(studyDate(new Date())),
  ])
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return { status: 'not_found' }

  const word = (data as unknown as { vocabularies: StageWord }).vocabularies
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
    return { status: 'graded', outcome, answer, reading: word.reading_kana, result: saved.result }
  }
  return { status: saved.status }
}
