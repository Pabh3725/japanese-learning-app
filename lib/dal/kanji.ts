// Kanji: "đã biết" của chữ (learner_kanji_exclusions) và trang chi tiết chữ trong Library. Server-only.
// Học và ôn chữ nằm ở V12 (lib/dal/v12); khu Kanji V11 đã gỡ ở gói 5.
import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { KANJI_COLUMNS, readKanjiVisuals } from '@/lib/dal/kanji-content'
import { readStarredKanjiIds } from '@/lib/dal/kanji-stars'
import { revealOf, type KanjiReveal, type KanjiRow } from '@/lib/kanji/questions'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function readKnownKanjiIdsUncached(supabase: Supabase, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('learner_kanji_exclusions').select('kanji_id').eq('user_id', userId).range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_kanji_exclusions: ${error.message}`)
  return new Set(data?.map((r) => r.kanji_id))
}

// Khử trùng trong một render pass (React cache, khóa theo client + userId); kết quả dùng chung nên caller không được sửa nó.
export const readKnownKanjiIds = cache(readKnownKanjiIdsUncached)

/** Ví dụ từ hiện dưới thẻ chữ. */
export interface KanjiIntroItem extends KanjiReveal {
  kanjiId: string
  examples: { expression: string; reading: string; meaning: string }[]
}

/** Đã biết chữ này: V12 không mở chữ và bỏ khỏi bộ thẻ. Bỏ đánh dấu thì điểm và lịch còn nguyên. */
export async function setKanjiKnown(kanjiId: unknown, known: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (typeof kanjiId !== 'string' || !UUID.test(kanjiId) || typeof known !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = known
    ? await supabase.from('learner_kanji_exclusions').upsert({ user_id: user.id, kanji_id: kanjiId }, { onConflict: 'user_id,kanji_id', ignoreDuplicates: true })
    : await supabase.from('learner_kanji_exclusions').delete().eq('user_id', user.id).eq('kanji_id', kanjiId)
  if (error) throw new Error(`Không lưu được learner_kanji_exclusions: ${error.message}`)
  return { status: 'saved' }
}

// ---------------------------------------------------------------------------
// Trang chi tiết chữ trong Library (V9 R12)
// ---------------------------------------------------------------------------

export interface KanjiDetail extends KanjiReveal {
  id: string
  jlpt: number | null
  strokeCount: number | null
  known: boolean
  /** V10: chữ có sao. */
  starred: boolean
  /** Chữ gần giống đã duyệt, kèm giải thích điểm khác. */
  similar: { character: string; hanViet: string; meaning: string; explanation: string }[]
  /** Từ trong lộ trình có chứa chữ này. */
  words: { code: string; expression: string; reading: string; meaning: string }[]
}

/** Trang chi tiết một chữ trong Library (V9 R12). */
export async function getKanjiDetail(character: string): Promise<KanjiDetail | null> {
  if ([...character].length !== 1) return null
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from('kanji').select(`${KANJI_COLUMNS}, stroke_count`).eq('character', character).maybeSingle()
  if (error) throw new Error(`Không đọc được kanji: ${error.message}`)
  if (!data) return null
  const kanji = data as KanjiRow & { stroke_count: number | null }

  const [visuals, known, starred, pairs, words] = await Promise.all([
    readKanjiVisuals(supabase, [kanji.id]),
    readKnownKanjiIds(supabase, user.id),
    readStarredKanjiIds(supabase, user.id),
    supabase
      .from('kanji_similar_pairs')
      .select('kanji_a, kanji_b, explanation, a:kanji!kanji_similar_pairs_kanji_a_fkey(character, han_viet, meaning_vi), b:kanji!kanji_similar_pairs_kanji_b_fkey(character, han_viet, meaning_vi)')
      .eq('approved', true)
      .or(`kanji_a.eq.${kanji.id},kanji_b.eq.${kanji.id}`)
      .order('score', { ascending: false })
      .range(0, 9),
    supabase
      .from('vocabulary_kanji')
      .select('vocabularies!inner(code, expression, reading_kana, meaning_vi, sort_order)')
      .eq('kanji_id', kanji.id)
      .range(0, 199),
  ])
  if (pairs.error) console.error(`Không đọc được kanji_similar_pairs: ${pairs.error.message}`)
  if (words.error) throw new Error(`Không đọc được vocabulary_kanji: ${words.error.message}`)

  type Side = { character: string; han_viet: string; meaning_vi: string }
  const similar = ((pairs.data ?? []) as unknown as { kanji_a: string; explanation: string; a: Side; b: Side }[]).map((p) => {
    const other = p.kanji_a === kanji.id ? p.b : p.a
    return { character: other.character, hanViet: other.han_viet, meaning: other.meaning_vi, explanation: p.explanation }
  })
  const wordRows = ((words.data ?? []) as unknown as { vocabularies: { code: string; expression: string; reading_kana: string; meaning_vi: string; sort_order: number } }[])
    .map((r) => r.vocabularies)
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    ...revealOf(kanji),
    visual: visuals.get(kanji.id),
    id: kanji.id,
    jlpt: kanji.jlpt_level ?? null,
    strokeCount: kanji.stroke_count && kanji.stroke_count > 0 ? kanji.stroke_count : null,
    known: known.has(kanji.id),
    starred: starred.has(kanji.id),
    similar,
    words: wordRows.map((w) => ({ code: w.code, expression: w.expression, reading: w.reading_kana, meaning: w.meaning_vi })),
  }
}
