// DAL cho bài ghép kana ở Stage 2 (VOC-03). Server-only: server giữ đáp án và tự chấm,
// trình duyệt chỉ gửi các mảnh đã ghép. Điểm và stage vẫn do submitExercise tính.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { getNextDaySeq } from '@/lib/dal/day-seq'
import { submitExercise, type SubmitExerciseResponse } from '@/lib/dal/exercise'
import { isKanaAssemblyCorrect, parseKanaAssemblyRequest, splitKana } from '@/lib/exercise/kana-pieces'
import { studyDate } from '@/lib/learning/time'

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

  const [{ data, error }, daySeq] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select('id, vocabularies!inner(reading_kana)')
      .eq('id', req.learnerVocabularyId)
      .eq('user_id', user.id)
      .maybeSingle(),
    getNextDaySeq(studyDate(new Date())),
  ])
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return { status: 'not_found' }

  const { reading_kana: reading } = (data as unknown as { vocabularies: { reading_kana: string } }).vocabularies
  const correct = isKanaAssemblyCorrect(req.pieces, reading)

  const saved = await submitExercise({
    learnerVocabularyId: req.learnerVocabularyId,
    stage: 2,
    clientEventId: req.clientEventId,
    exercise: 'kana_assembly',
    outcome: correct ? 'correct' : 'wrong',
    daySeq,
    responseMs: req.responseMs,
  })

  if (saved.status === 'saved' || saved.status === 'duplicate') {
    return { status: 'graded', correct, answer: splitKana(reading), result: saved.result }
  }
  return { status: saved.status }
}
