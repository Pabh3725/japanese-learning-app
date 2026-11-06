// DAL cho Stage 1 (VOC-01). Server-only: chọn từ và tính stage ở server, không tin trình duyệt.
// Xem xong thẻ = tạo dòng learner_vocabulary ở stage kế tiếp. Stage 1 không tạo card
// (R5) nên chỉ có một lệnh ghi; RLS cho phép người học thêm dòng của chính mình.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { countMetToday, newPerDayOf, remainingNewToday } from '@/lib/learning/new-words'
import { nextStudyDayStart } from '@/lib/learning/time'
import { INTRO_WORDS_PER_SESSION, isVocabularyId, pickNewWords, stageAfterIntro, toIntroWord, type IntroVocabRow, type IntroWord } from '@/lib/intro/words'

const VOCAB_COLUMNS = 'id, reading_kana, romaji, meaning_vi, emoji, jlpt_level'

/** Data API trả tối đa 1000 dòng mỗi lần; số từ đã vượt mức này nên bảng từ vựng phải đọc từng trang. */
const MAX_ROWS = 1000

const DAY_MS = 86_400_000

async function readAllVocabulary(supabase: Awaited<ReturnType<typeof createClient>>): Promise<IntroVocabRow[]> {
  const rows: IntroVocabRow[] = []
  for (let from = 0; ; from += MAX_ROWS) {
    const { data, error } = await supabase
      .from('vocabularies')
      .select(VOCAB_COLUMNS)
      .order('sort_order', { ascending: true })
      .range(from, from + MAX_ROWS - 1)
    if (error) throw new Error(`Không đọc được vocabularies: ${error.message}`)
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < MAX_ROWS) return rows
  }
}

export interface IntroData {
  words: IntroWord[]
  /** Giới hạn từ mới mỗi ngày trong Settings. */
  newPerDay: number
  /** Đã học đủ từ mới hôm nay. */
  limitReached: boolean
  /** Số từ mới còn học được hôm nay. */
  remainingToday: number
}

/** Các từ mới cho phiên giới thiệu, theo thứ tự lộ trình, không vượt giới hạn trong ngày. */
export async function getIntroData(): Promise<IntroData> {
  const user = await requireUser()
  const supabase = await createClient()

  const startOfToday = new Date(nextStudyDayStart(new Date()).getTime() - DAY_MS).toISOString()
  const [vocab, started, excluded, settings] = await Promise.all([
    readAllVocabulary(supabase),
    supabase.from('learner_vocabulary').select('vocabulary_id, created_at').eq('user_id', user.id).range(0, MAX_ROWS - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, MAX_ROWS - 1),
    supabase.from('learner_settings').select('daily_new_limit').eq('user_id', user.id).maybeSingle(),
  ])

  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)
  if (settings.error) throw new Error(`Không đọc được learner_settings: ${settings.error.message}`)

  const newPerDay = newPerDayOf(settings.data?.daily_new_limit)
  const metToday = countMetToday(started.data ?? [], new Set(excluded.data?.map((r) => r.vocabulary_id)), startOfToday)
  const remaining = remainingNewToday(newPerDay, metToday)
  const picked = pickNewWords<IntroVocabRow>(
    vocab,
    new Set(started.data?.map((r) => r.vocabulary_id)),
    new Set(excluded.data?.map((r) => r.vocabulary_id)),
    Math.min(INTRO_WORDS_PER_SESSION, remaining),
  )
  const words = picked.map(toIntroWord).filter((w): w is IntroWord => w !== null)
  if (words.length < picked.length) {
    console.warn(`[intro] Bỏ qua ${picked.length - words.length} từ sai dạng`)
  }
  return { words, newPerDay, limitReached: remaining === 0, remainingToday: remaining }
}

export interface CompleteIntroResponse {
  /** 'invalid' = trình duyệt gửi dữ liệu sai dạng. 'not_found' = không có từ này. */
  status: 'saved' | 'invalid' | 'not_found'
}

/**
 * Ghi nhận đã xem xong thẻ Stage 1. Gọi lại nhiều lần cũng chỉ có một dòng,
 * và không bao giờ làm lùi stage của từ đã học (on conflict do nothing).
 */
export async function completeWordIntro(vocabularyId: unknown): Promise<CompleteIntroResponse> {
  if (!isVocabularyId(vocabularyId)) return { status: 'invalid' }

  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vocabularies')
    .select('is_kana_only')
    .eq('id', vocabularyId)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được vocabularies: ${error.message}`)
  if (!data) return { status: 'not_found' }

  const { error: upsertError } = await supabase.from('learner_vocabulary').upsert(
    {
      user_id: user.id,
      vocabulary_id: vocabularyId,
      current_stage: stageAfterIntro(data.is_kana_only),
    },
    { onConflict: 'user_id,vocabulary_id', ignoreDuplicates: true },
  )
  if (upsertError) throw new Error(`Không ghi được learner_vocabulary: ${upsertError.message}`)

  return { status: 'saved' }
}
