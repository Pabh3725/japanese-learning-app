// DAL cho trang Library (API-01). Server-only: SQL không bao giờ nằm trong component.
// Luôn xác thực trước (requireUser), luôn lọc tiến độ theo user đang đăng nhập.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readKnownKanjiIds } from '@/lib/dal/kanji'
import { readStarredIds } from '@/lib/dal/star-relearn'
import { toKanjiList, toVocabList } from '@/lib/library/mappers'
import type { LibraryData } from '@/lib/library/types'
import { readAllPages } from '@/lib/dal/pages'
import { readKnownWordIds } from '@/lib/dal/known-words'

const VOCAB_COLUMNS = 'id, code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level, lesson'
const PROGRESS_COLUMNS = 'vocabulary_id, current_stage, learning_status'
const KANJI_COLUMNS = 'id, character, han_viet, meaning_vi, onyomi, kunyomi, stroke_count, jlpt_level'

/**
 * Supabase Data API trả tối đa 1000 dòng mỗi lần (mặc định).
 * Bảng từ vựng đã vượt mức này nên đọc từng trang; Kanji hiện dưới 1000 chữ.
 */
const MAX_ROWS = 1000

async function readAllVocabulary(supabase: Awaited<ReturnType<typeof createClient>>): Promise<unknown[]> {
  const rows: unknown[] = []
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

export async function getLibraryData(): Promise<LibraryData> {
  const user = await requireUser()
  const supabase = await createClient()

  const [vocab, progress, kanji, known, starredIds, knownKanji] = await Promise.all([
    readAllVocabulary(supabase),
    // RLS đã chỉ trả dòng của chính user; lọc thêm user_id cho rõ ý và để query dùng index.
    readAllPages('learner_vocabulary', (from, to) => supabase.from('learner_vocabulary').select(PROGRESS_COLUMNS).eq('user_id', user.id).order('id').range(from, to)),
    readAllPages('kanji', (from, to) =>
      supabase
        .from('kanji')
        .select(KANJI_COLUMNS)
        .order('jlpt_level', { ascending: false, nullsFirst: false })
        .order('character', { ascending: true })
        .range(from, to),
    ),
    readKnownWordIds(supabase, user.id),
    readStarredIds(supabase, user.id),
    readKnownKanjiIds(supabase, user.id),
  ])

  const vocabulary = toVocabList(vocab, progress)
  const kanjiList = toKanjiList(kanji)

  if (vocabulary.invalid || kanjiList.invalid) {
    console.warn(`[library] Bỏ qua dòng sai dạng: ${vocabulary.invalid} từ, ${kanjiList.invalid} Kanji`)
  }

  return { starredIds, vocabulary: vocabulary.items.map((item) => ({ ...item, known: known.has(item.id) })), kanji: kanjiList.items.map((item) => ({ ...item, known: knownKanji.has(item.id) })) }
}
