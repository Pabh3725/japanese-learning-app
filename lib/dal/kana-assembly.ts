// DAL cho bài ghép kana ở Stage 2 (VOC-03). Server-only: server giữ đáp án và tự chấm,
// trình duyệt chỉ gửi các mảnh đã ghép. Điểm và stage vẫn do submitExercise (VOC-04) tính.
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import {
  buildKanaAssemblyQuestion,
  isKanaAssemblyCorrect,
  parseKanaAssemblyRequest,
  pickStage2Words,
  splitKana,
  type Stage2WordRow,
} from '@/lib/exercise/kana-pieces'
import { studyDate } from '@/lib/learning/time'

/** Như lib/dal/library.ts: Data API trả tối đa 1000 dòng mỗi lần, hiện có 912 từ. */
const MAX_ROWS = 1000

export interface KanaAssemblyWord {
  learnerVocabularyId: string
  /** Mã cho lần nộp câu này. Cấp ở server nên chạy được cả khi trình duyệt không có crypto.randomUUID. */
  clientEventId: string
  meaning: string
  slots: number
  pool: string[]
}

/** Một lượt câu ghép kana cho các từ đang ở Stage 2. Rỗng = chưa có từ nào. */
export async function getKanaAssemblyWords(): Promise<KanaAssemblyWord[]> {
  const user = await requireUser()
  const supabase = await createClient()

  const [words, excluded] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select('id, vocabulary_id, last_practiced_at, vocabularies!inner(reading_kana, meaning_vi, sort_order)')
      .eq('user_id', user.id)
      .eq('current_stage', 2)
      .eq('learning_status', 'learning')
      .range(0, MAX_ROWS - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, MAX_ROWS - 1),
  ])
  if (words.error) throw new Error(`Không đọc được learner_vocabulary: ${words.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)

  const excludedIds = new Set(excluded.data?.map((r) => r.vocabulary_id))
  const rows = (words.data ?? []) as unknown as (Stage2WordRow & { vocabulary_id: string })[]

  return pickStage2Words(rows.filter((r) => !excludedIds.has(r.vocabulary_id))).map((row) => ({
    learnerVocabularyId: row.id,
    clientEventId: randomUUID(),
    meaning: row.vocabularies.meaning_vi,
    ...buildKanaAssemblyQuestion(row.vocabularies.reading_kana, Math.random),
  }))
}

export type SubmitKanaAssemblyResponse =
  | {
      status: 'graded'
      correct: boolean
      /** Đáp án đúng, chỉ trả về sau khi đã nộp. */
      answer: string[]
      /** Không có khi đây là lần gửi lại của một câu đã lưu. */
      result?: SubmitExerciseResponse['result']
    }
  | { status: 'invalid' | 'not_found' | 'stage_changed' | 'conflict' }

export async function submitKanaAssembly(input: unknown): Promise<SubmitKanaAssemblyResponse> {
  const req = parseKanaAssemblyRequest(input)
  if (!req) return { status: 'invalid' }

  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learner_vocabulary')
    .select('id, vocabularies!inner(reading_kana)')
    .eq('id', req.learnerVocabularyId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return { status: 'not_found' }

  const { reading_kana: reading } = (data as unknown as { vocabularies: { reading_kana: string } }).vocabularies
  const correct = isKanaAssemblyCorrect(req.pieces, reading)

  const saved = await submitExercise({
    learnerVocabularyId: req.learnerVocabularyId,
    clientEventId: req.clientEventId,
    exercise: 'kana_assembly',
    outcome: correct ? 'correct' : 'wrong',
    daySeq: await getNextDaySeq(studyDate(new Date())),
    responseMs: req.responseMs,
  })

  if (saved.status === 'saved' || saved.status === 'duplicate') {
    return { status: 'graded', correct, answer: splitKana(reading), result: saved.result }
  }
  return { status: saved.status }
}
