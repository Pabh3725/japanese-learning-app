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
import { isReviewCard } from '@/lib/v12/card-types'

type Supabase = Awaited<ReturnType<typeof createClient>>
type CardCount = { active: number; archived: number }

type ItemProgress = { stage: string; cards: CardCount }

/**
 * V12 (gói 4): tiến độ từ bảng mới. Từ: mục Kana (Stage, Card Kana) cộng Card của mục Từ vựng Kanji.
 * Chữ: mục Kanji (Stage, Card). Khóa: vocabulary_id / kanji_id.
 */
async function readV12Progress(supabase: Supabase, userId: string): Promise<{ words: Map<string, ItemProgress>; kanji: Map<string, ItemProgress> }> {
  const rows = await readAllPages('learner_items', (from, to) =>
    supabase.from('learner_items').select('area, vocabulary_id, kanji_id, stage, item_cards(card_type, archived_at)').eq('user_id', userId).in('area', ['kana', 'word_kanji', 'kanji']).order('id').range(from, to),
  )
  const words = new Map<string, ItemProgress>()
  const kanji = new Map<string, ItemProgress>()
  for (const r of rows as unknown as { area: string; vocabulary_id: string | null; kanji_id: string | null; stage: string; item_cards: { card_type: string; archived_at: string | null }[] }[]) {
    const map = r.area === 'kanji' ? kanji : words
    const id = (r.kanji_id ?? r.vocabulary_id)!
    const p = map.get(id) ?? { stage: 'none', cards: { active: 0, archived: 0 } }
    if (r.area !== 'word_kanji') p.stage = r.stage
    for (const c of r.item_cards.filter((x) => isReviewCard(x.card_type))) {
      if (c.archived_at) p.cards.archived++
      else p.cards.active++
    }
    map.set(id, p)
  }
  return { words, kanji }
}

/** V10: mục đang được đánh dấu "đã học" (chưa hoàn tác), theo loại. */
export async function readMarkedIds(supabase: Supabase, userId: string, kind: 'vocab' | 'grammar'): Promise<Set<string>> {
  const rows = await readAllPages('learner_mark_history', (from, to) =>
    // Từ vựng: chỉ lần đánh dấu V12 (before.v = 12) hoàn tác được ở V12
    (kind === 'vocab' ? supabase.from('learner_mark_history').select('item_id').eq('before->>v', '12') : supabase.from('learner_mark_history').select('item_id'))
      .eq('user_id', userId)
      .eq('kind', kind)
      .is('undone_at', null)
      .order('id')
      .range(from, to),
  )
  return new Set(rows.map((r) => r.item_id as string))
}

const VOCAB_COLUMNS = 'id, code, sort_order, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level, lesson'
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

  const [vocab, v12, kanji, known, starredIds, knownKanji] = await Promise.all([
    readAllVocabulary(supabase),
    readV12Progress(supabase, user.id),
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
  const [marked, starredKanji] = await Promise.all([
    readMarkedIds(supabase, user.id, 'vocab'),
    readStarredKanjiIds(supabase, user.id),
  ])

  // Dạng dòng tiến độ của mapper: Stage 1–3 của mục Kana, hoặc đã xong (đã có Card)
  const progress = [...v12.words].filter(([, p]) => p.stage !== 'none').map(([id, p]) => ({ vocabulary_id: id, current_stage: p.stage === 'review' ? 3 : Number(p.stage), learning_status: p.stage === 'review' ? 'initial_complete' : 'learning' }))
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
      status: libraryStatus({ started: item.progress.kind !== 'not_started', doneLearning: item.progress.kind === 'complete', cards: v12.words.get(item.id)?.cards ?? { active: 0, archived: 0 } }),
    })),
    kanji: kanjiList.items.map((item) => {
      const p = v12.kanji.get(item.id)
      return { ...item, known: knownKanji.has(item.id), status: libraryStatus({ started: p !== undefined, doneLearning: p?.stage === 'review', cards: p?.cards ?? { active: 0, archived: 0 } }) }
    }),
  }
}
