// DAL cho Stage 2 — chọn nghĩa / chọn kana (VOC-02). Server-only.
//   getStage2Session: các từ của bạn đang ở Stage 2 → câu hỏi (đáp án nhiễu theo data-spec §5)
//   answerStage2:     SERVER chấm đáp án đã chọn (D1), tự cấp vị trí câu trong ngày (D2), gọi submitExercise (VOC-04)
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import { studyDate } from '@/lib/learning/time'
import {
  STAGE2_CHOICE_EXERCISES,
  answerFor,
  buildChoiceQuestion,
  gradeChoice,
  planStage2Session,
  type ChoiceQuestion,
  type QuestionWord,
  type Stage2ChoiceExercise,
} from '@/lib/exercise/questions'
import type { Outcome } from '@/lib/learning/types'

const PAGE = 1000
const SESSION_QUESTIONS = 10

export interface Stage2Question extends ChoiceQuestion {
  learnerVocabularyId: string
}

type WordRow = { id: string; vocabularies: QuestionWord }

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

export async function getStage2Session(): Promise<{ questions: Stage2Question[]; wordCount: number }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learner_vocabulary')
    .select(
      'id, vocabularies!inner(id, reading_kana, meaning_vi), learner_stage_schedules!inner(stage_number)',
    )
    .eq('user_id', user.id)
    .eq('learning_status', 'learning')
    // V8: Stage 2 chạy tới khi hoàn tất, kể cả sau khi đã mở stage sau. SCH-02 sẽ lọc thêm theo hạn.
    .eq('learner_stage_schedules.stage_number', 2)
    .is('learner_stage_schedules.completed_at', null)
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  const words = (data ?? []) as unknown as WordRow[]
  if (words.length === 0) return { questions: [], wordCount: 0 }

  const pool = await loadPool(supabase)
  const questions = planStage2Session(words, SESSION_QUESTIONS).map(({ word, exercise }) => ({
    learnerVocabularyId: word.id,
    ...buildChoiceQuestion(word.vocabularies, pool, exercise),
  }))
  return { questions, wordCount: words.length }
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

/** D2 — Vị trí câu tiếp theo trong ngày học: câu lớn nhất hôm nay (học + review) + 1. */
async function nextDaySeq(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, today: string): Promise<number> {
  const [ex, rv] = await Promise.all([
    supabase.from('exercise_logs').select('day_seq').eq('user_id', userId).eq('study_date', today)
      .order('day_seq', { ascending: false }).limit(1),
    supabase.from('review_logs').select('day_seq').eq('user_id', userId).eq('study_date', today)
      .not('day_seq', 'is', null).order('day_seq', { ascending: false }).limit(1),
  ])
  if (ex.error) throw new Error(`Không đọc được exercise_logs: ${ex.error.message}`)
  if (rv.error) throw new Error(`Không đọc được review_logs: ${rv.error.message}`)
  const seqs = [...(ex.data ?? []), ...(rv.data ?? [])].map((r) => r.day_seq as number)
  return (seqs.length ? Math.max(...seqs) : 0) + 1
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
    nextDaySeq(supabase, user.id, studyDate(new Date())),
  ])
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return { save: { status: 'not_found' } }
  const word = (data as unknown as WordRow).vocabularies

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
