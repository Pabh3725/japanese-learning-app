// DAL cho Stage 2 (VOC-02, SCH-02). Server-only.
//   getStage2Session: các từ của bạn đã đến hẹn ở Stage 2 → mỗi từ một câu, ưu tiên dạng bắt buộc chưa có điểm
//   answerStage2:     SERVER chấm đáp án đã chọn, tự cấp vị trí câu trong ngày, gọi submitExercise
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import { deriveEarned } from '@/lib/exercise/mappers'
import { buildKanaAssemblyQuestion } from '@/lib/exercise/kana-pieces'
import { studyDate } from '@/lib/learning/time'
import {
  STAGE2_CHOICE_EXERCISES,
  answerFor,
  buildChoiceQuestion,
  chooseStage2Exercise,
  gradeChoice,
  pickDueWords,
  type ChoiceQuestion,
  type QuestionWord,
  type Stage2ChoiceExercise,
} from '@/lib/exercise/questions'
import type { Outcome } from '@/lib/learning/types'

const PAGE = 1000

interface Stage2QuestionBase {
  learnerVocabularyId: string
  /** Mã cho lần nộp câu này. Cấp ở server nên chạy được cả khi trình duyệt không có crypto.randomUUID. */
  clientEventId: string
}

export type Stage2Question =
  | (Stage2QuestionBase & { kind: 'choice' } & ChoiceQuestion)
  /** Bài ghép: không có đáp án, server chấm sau khi nộp. */
  | (Stage2QuestionBase & { kind: 'assembly'; meaning: string; slots: number; pool: string[] })

export interface Stage2Session {
  questions: Stage2Question[]
  /** Lần hẹn gần nhất khi hiện chưa có từ nào đến hẹn; null = chưa có từ nào ở Stage 2. */
  nextDueAt: string | null
}

type WordRow = {
  id: string
  vocabulary_id: string
  vocabularies: QuestionWord & { sort_order: number }
  learner_stage_schedules: { due_at: string }[]
}

/** Toàn bộ từ vựng (kho đáp án nhiễu). Tự chia trang vì Data API trả tối đa 1000 dòng/lần. */
async function loadPool(supabase: Awaited<ReturnType<typeof createClient>>): Promise<QuestionWord[]> {
  const out: QuestionWord[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('vocabularies')
      .select('id, reading_kana, meaning_vi')
      .order('sort_order')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được vocabularies: ${error.message}`)
    out.push(...((data ?? []) as QuestionWord[]))
    if ((data?.length ?? 0) < PAGE) return out
  }
}

export async function getStage2Session(): Promise<Stage2Session> {
  const user = await requireUser()
  const supabase = await createClient()

  const [words_, excluded] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select(
        'id, vocabulary_id, vocabularies!inner(id, reading_kana, meaning_vi, sort_order), ' +
          'learner_stage_schedules!inner(due_at)',
      )
      .eq('user_id', user.id)
      .eq('learning_status', 'learning')
      // Stage 2 chạy tới khi hoàn tất, kể cả sau khi đã mở stage sau
      .eq('learner_stage_schedules.stage_number', 2)
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
    .map((r) => ({
      word: r,
      dueAt: r.learner_stage_schedules[0].due_at,
      sortOrder: r.vocabularies.sort_order,
    }))
  const due = pickDueWords(active, new Date())
  if (due.length === 0) {
    const next = active.map((r) => r.dueAt).sort()[0] ?? null
    return { questions: [], nextDueAt: next }
  }

  // Dạng bài đã có điểm của từng từ, để ưu tiên dạng còn thiếu
  const { data: logs, error: logsError } = await supabase
    .from('exercise_logs')
    .select('learner_vocabulary_id, exercise_type, points')
    .eq('user_id', user.id)
    .eq('stage_number', 2)
    .gt('points', 0)
    .in('learner_vocabulary_id', due.map((r) => r.word.id))
  if (logsError) throw new Error(`Không đọc được exercise_logs: ${logsError.message}`)

  const planned = due.map(({ word }) => ({
    word,
    exercise: chooseStage2Exercise(deriveEarned((logs ?? []).filter((l) => l.learner_vocabulary_id === word.id))),
  }))
  // Kho đáp án nhiễu chỉ cần cho bài chọn
  const pool = planned.some((p) => p.exercise !== 'kana_assembly') ? await loadPool(supabase) : []

  const questions = planned.map(({ word, exercise }): Stage2Question => {
    const base = { learnerVocabularyId: word.id, clientEventId: randomUUID() }
    if (exercise === 'kana_assembly') {
      return {
        ...base,
        kind: 'assembly',
        meaning: word.vocabularies.meaning_vi,
        ...buildKanaAssemblyQuestion(word.vocabularies.reading_kana, Math.random),
      }
    }
    return { ...base, kind: 'choice', ...buildChoiceQuestion(word.vocabularies, pool, exercise) }
  })
  return { questions, nextDueAt: null }
}

// ---------------------------------------------------------------------------

export interface Stage2AnswerRequest {
  learnerVocabularyId: string
  exercise: Stage2ChoiceExercise
  chosen: string
  clientEventId: string
  responseMs?: number
}

export interface Stage2AnswerResponse {
  /** Kết quả chấm của SERVER (giao diện tô màu theo đáp án đã biết; điểm theo kết quả này). */
  outcome?: Outcome
  answer?: string
  save: SubmitExerciseResponse
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseRequest(input: unknown): Stage2AnswerRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const v = input as Record<string, unknown>
  const ok =
    typeof v.learnerVocabularyId === 'string' && UUID.test(v.learnerVocabularyId) &&
    typeof v.clientEventId === 'string' && UUID.test(v.clientEventId) &&
    typeof v.exercise === 'string' && (STAGE2_CHOICE_EXERCISES as readonly string[]).includes(v.exercise) &&
    typeof v.chosen === 'string' && v.chosen.length > 0 && v.chosen.length <= 300 &&
    (v.responseMs === undefined || (typeof v.responseMs === 'number' && Number.isFinite(v.responseMs) && v.responseMs >= 0))
  return ok ? (v as unknown as Stage2AnswerRequest) : null
}

export async function answerStage2(input: unknown): Promise<Stage2AnswerResponse> {
  const req = parseRequest(input)
  if (!req) return { save: { status: 'invalid' } }

  const user = await requireUser()
  const supabase = await createClient()

  // Đáp án thật lấy từ database, không lấy từ trình duyệt
  const [{ data, error }, daySeq] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select('id, vocabularies!inner(id, reading_kana, meaning_vi)')
      .eq('id', req.learnerVocabularyId)
      .eq('user_id', user.id)
      .maybeSingle(),
    getNextDaySeq(studyDate(new Date())),
  ])
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return { save: { status: 'not_found' } }
  const word = (data as unknown as { vocabularies: QuestionWord }).vocabularies

  const outcome = gradeChoice(word, req.exercise, req.chosen)

  const save = await submitExercise({
    learnerVocabularyId: req.learnerVocabularyId,
    clientEventId: req.clientEventId,
    stage: 2,
    exercise: req.exercise,
    outcome,
    daySeq,
    responseMs: req.responseMs,
  })
  return { outcome, answer: answerFor(word, req.exercise), save }
}
