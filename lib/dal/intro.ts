// DAL cho Stage 1 (VOC-01). Server-only: chọn từ và tính stage ở server, không tin trình duyệt.
// Xem xong thẻ = tạo dòng learner_vocabulary ở stage kế tiếp. Stage 1 không tạo card
// (R5) nên chỉ có một lệnh ghi; RLS cho phép người học thêm dòng của chính mình.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { isVocabularyId, pickNewWords, stageAfterIntro, toIntroWord, type IntroVocabRow, type IntroWord } from '@/lib/intro/words'

const VOCAB_COLUMNS = 'id, reading_kana, romaji, meaning_vi, emoji, jlpt_level'

/** Như lib/dal/library.ts: Data API trả tối đa 1000 dòng mỗi lần, hiện có 912 từ. */
const MAX_ROWS = 1000

/** Các từ mới cho phiên giới thiệu, theo thứ tự lộ trình. Rỗng = đã hết từ. */
export async function getIntroWords(): Promise<IntroWord[]> {
  const user = await requireUser()
  const supabase = await createClient()

  const [vocab, started, excluded] = await Promise.all([
    supabase.from('vocabularies').select(VOCAB_COLUMNS).order('sort_order', { ascending: true }).range(0, MAX_ROWS - 1),
    supabase.from('learner_vocabulary').select('vocabulary_id').eq('user_id', user.id).range(0, MAX_ROWS - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, MAX_ROWS - 1),
  ])

  if (vocab.error) throw new Error(`Không đọc được vocabularies: ${vocab.error.message}`)
  if (started.error) throw new Error(`Không đọc được learner_vocabulary: ${started.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)

  const picked = pickNewWords<IntroVocabRow>(
    vocab.data ?? [],
    new Set(started.data?.map((r) => r.vocabulary_id)),
    new Set(excluded.data?.map((r) => r.vocabulary_id)),
  )
  const words = picked.map(toIntroWord).filter((w): w is IntroWord => w !== null)
  if (words.length < picked.length) {
    console.warn(`[intro] Bỏ qua ${picked.length - words.length} từ sai dạng`)
  }
  return words
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
