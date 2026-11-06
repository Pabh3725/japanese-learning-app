// DAL cho trang Library (API-01). Server-only: SQL không bao giờ nằm trong component.
// Luôn xác thực trước (requireUser), luôn lọc tiến độ theo user đang đăng nhập.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { DUPLICATE_KANA_CODES } from '@/lib/intro/words'
import { toKanjiList, toVocabList } from '@/lib/library/mappers'
import type { LibraryData } from '@/lib/library/types'

const VOCAB_COLUMNS = 'id, code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level'
const PROGRESS_COLUMNS = 'vocabulary_id, current_stage, learning_status'
const KANJI_COLUMNS = 'id, character, han_viet, meaning_vi, onyomi, kunyomi, stroke_count, jlpt_level'

/**
 * Supabase Data API trả tối đa 1000 dòng mỗi lần (mặc định).
 * Hiện có 912 từ và 516 Kanji; khi vượt mức này cần chuyển sang phân trang.
 */
const MAX_ROWS = 1000

export async function getLibraryData(): Promise<LibraryData> {
  const user = await requireUser()
  const supabase = await createClient()

  const [vocab, progress, kanji, known] = await Promise.all([
    supabase.from('vocabularies').select(VOCAB_COLUMNS).order('sort_order', { ascending: true }).range(0, MAX_ROWS - 1),
    // RLS đã chỉ trả dòng của chính user; lọc thêm user_id cho rõ ý và để query dùng index.
    supabase.from('learner_vocabulary').select(PROGRESS_COLUMNS).eq('user_id', user.id).range(0, MAX_ROWS - 1),
    supabase
      .from('kanji')
      .select(KANJI_COLUMNS)
      .order('jlpt_level', { ascending: false, nullsFirst: false })
      .order('character', { ascending: true })
      .range(0, MAX_ROWS - 1),
    supabase.from('learner_vocabulary_exclusions').select('vocabulary_id').eq('user_id', user.id).not('excluded_at', 'is', null).range(0, MAX_ROWS - 1),
  ])

  if (vocab.error) throw new Error(`Không đọc được vocabularies: ${vocab.error.message}`)
  if (progress.error) throw new Error(`Không đọc được learner_vocabulary: ${progress.error.message}`)
  if (kanji.error) throw new Error(`Không đọc được kanji: ${kanji.error.message}`)
  if (known.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${known.error.message}`)

  // Dòng trùng chỉ còn hiện với người đang học dòng đó
  const startedIds = new Set(progress.data?.map((r) => r.vocabulary_id))
  const visibleVocab = (vocab.data ?? []).filter((r) => !DUPLICATE_KANA_CODES.includes(r.code) || startedIds.has(r.id))
  const vocabulary = toVocabList(visibleVocab, progress.data ?? [])
  const kanjiList = toKanjiList(kanji.data ?? [])

  if (vocabulary.invalid || kanjiList.invalid) {
    console.warn(`[library] Bỏ qua dòng sai dạng: ${vocabulary.invalid} từ, ${kanjiList.invalid} Kanji`)
  }
  if ((vocab.data?.length ?? 0) >= MAX_ROWS || (kanji.data?.length ?? 0) >= MAX_ROWS) {
    console.warn('[library] Có thể đã chạm giới hạn 1000 dòng — cần phân trang')
  }

  const knownIds = new Set(known.data?.map((r) => r.vocabulary_id))
  return { vocabulary: vocabulary.items.map((item) => ({ ...item, known: knownIds.has(item.id) })), kanji: kanjiList.items }
}
