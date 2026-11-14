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
import { readStarredKanjiIds } from '@/lib/dal/kanji-stars'
import { libraryStatus } from '@/lib/library/status'

type Supabase = Awaited<ReturnType<typeof createClient>>
type CardCount = { active: number; archived: number }

/** V10: Card chính (không tính Card sao) của mỗi từ: còn ôn và đã lưu trữ. */
async function readWordCards(supabase: Supabase, userId: string): Promise<Map<string, CardCount>> {
  const rows = await readAllPages('review_cards', (from, to) =>
    supabase
      .from('review_cards')
      .select('archived_at, learner_vocabulary!inner(vocabulary_id)')
      .eq('user_id', userId)
      .in('card_type', ['vocab.kana', 'vocab.kanji'])
      .order('id')
      .range(from, to),
  )
  const out = new Map<string, CardCount>()
  for (const r of rows as unknown as { archived_at: string | null; learner_vocabulary: { vocabulary_id: string } }[]) {
    const c = out.get(r.learner_vocabulary.vocabulary_id) ?? { active: 0, archived: 0 }
    if (r.archived_at) c.archived++
    else c.active++
    out.set(r.learner_vocabulary.vocabulary_id, c)
  }
  return out
}

/** V10: chữ đã mở: xong giai đoạn Học chưa, và Card chính còn ôn / đã lưu trữ. */
async function readKanjiProgress(supabase: Supabase, userId: string): Promise<Map<string, { doneLearning: boolean; cards: CardCount }>> {
  const rows = await readAllPages('learner_kanji', (from, to) =>
    supabase.from('learner_kanji').select('kanji_id, phase, learner_kanji_cards(card_type, archived_at)').eq('user_id', userId).order('id').range(from, to),
  )
  const out = new Map<string, { doneLearning: boolean; cards: CardCount }>()
  for (const r of rows as unknown as { kanji_id: string; phase: string; learner_kanji_cards: { card_type: string; archived_at: string | null }[] }[]) {
    const main = r.learner_kanji_cards.filter((c) => c.card_type !== 'kanji.star')
    out.set(r.kanji_id, { doneLearning: r.phase === 'review', cards: { active: main.filter((c) => !c.archived_at).length, archived: main.filter((c) => c.archived_at).length } })
  }
  return out
}

/** V10: mục đang được đánh dấu "đã học" (chưa hoàn tác), theo loại. */
export async function readMarkedIds(supabase: Supabase, userId: string, kind: 'vocab' | 'grammar'): Promise<Set<string>> {
  const rows = await readAllPages('learner_mark_history', (from, to) =>
    supabase.from('learner_mark_history').select('item_id').eq('user_id', userId).eq('kind', kind).is('undone_at', null).order('id').range(from, to),
  )
  return new Set(rows.map((r) => r.item_id as string))
}

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
  const [wordCards, kanjiProgress, marked, starredKanji] = await Promise.all([
    readWordCards(supabase, user.id),
    readKanjiProgress(supabase, user.id),
    readMarkedIds(supabase, user.id, 'vocab'),
    readStarredKanjiIds(supabase, user.id),
  ])

  const vocabulary = toVocabList(vocab, progress)
  const kanjiList = toKanjiList(kanji)

  if (vocabulary.invalid || kanjiList.invalid) {
    console.warn(`[library] Bỏ qua dòng sai dạng: ${vocabulary.invalid} từ, ${kanjiList.invalid} Kanji`)
  }

  return {
    starredIds,
    starredKanjiIds: [...starredKanji],
    vocabulary: vocabulary.items.map((item) => ({
      ...item,
      known: known.has(item.id),
      marked: marked.has(item.id),
      status: libraryStatus({ started: item.progress.kind !== 'not_started', doneLearning: item.progress.kind === 'complete', cards: wordCards.get(item.id) ?? { active: 0, archived: 0 } }),
    })),
    kanji: kanjiList.items.map((item) => {
      const p = kanjiProgress.get(item.id)
      return { ...item, known: knownKanji.has(item.id), status: libraryStatus({ started: p !== undefined, doneLearning: p?.doneLearning ?? false, cards: p?.cards ?? { active: 0, archived: 0 } }) }
    }),
  }
}
