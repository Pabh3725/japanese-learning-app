// LIB-01 — Chi tiết một từ trong Library: thành phần Kanji, Stage, điểm và Card V12 của người học. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { isWordStarred } from '@/lib/dal/star-relearn'
import type { CardType, ReviewCardType, Stage } from '@/lib/v12/card-types'

export interface WordDetail {
  id: string
  code: string
  expression: string
  reading: string
  meaning: string
  hanViet: string | null
  romaji: string | null
  lesson: number | null
  isKanaOnly: boolean
  known: boolean
  starred: boolean
  kanji: { character: string; hanViet: string; meaning: string }[]
  /** V12: từ có dạng Kanji học được (khu Từ vựng Kanji). */
  hasKanjiForm: boolean
  /** V12 (gói 4): mục Kana và mục Từ vựng Kanji của từ. Chưa mở thì rỗng. */
  items: { area: 'kana' | 'word_kanji'; stage: Stage | 'review'; types: { type: CardType; points: number }[] }[]
  /** Card của hai mục. archived: người học đã bấm "Đã học xong" cho Card này (R13). */
  cards: { id: string; type: ReviewCardType; dueAt: string; archived: boolean }[]
}

type RawItem = {
  area: 'kana' | 'word_kanji'
  stage: string
  learner_item_types: { stage: number; card_type: CardType; points: number }[]
  item_cards: { id: string; card_type: ReviewCardType; due_at: string; archived_at: string | null }[]
}

export async function getWordDetail(code: string): Promise<WordDetail | null> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vocabularies')
    .select('id, code, expression, reading_kana, meaning_vi, han_viet, romaji, lesson, is_kana_only, vocabulary_kanji(position, kanji(character, han_viet, meaning_vi))')
    .eq('code', code)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được vocabularies: ${error.message}`)
  if (!data) return null
  const word = data as unknown as {
    id: string
    code: string
    expression: string
    reading_kana: string
    meaning_vi: string
    han_viet: string | null
    romaji: string | null
    lesson: number | null
    is_kana_only: boolean
    vocabulary_kanji: { position: number; kanji: { character: string; han_viet: string; meaning_vi: string } }[]
  }

  const [items, known, starred] = await Promise.all([
    supabase
      .from('learner_items')
      .select('area, stage, learner_item_types(stage, card_type, points), item_cards(id, card_type, due_at, archived_at)')
      .eq('user_id', user.id)
      .eq('vocabulary_id', word.id),
    supabase.from('learner_vocabulary_exclusions').select('excluded_at').eq('user_id', user.id).eq('vocabulary_id', word.id).maybeSingle(),
    isWordStarred(supabase, user.id, word.id),
  ])
  if (items.error) throw new Error(`Không đọc được learner_items: ${items.error.message}`)
  if (known.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${known.error.message}`)

  const seen = new Set<string>()
  const kanji = [...word.vocabulary_kanji]
    .sort((a, b) => a.position - b.position)
    .filter(({ kanji: k }) => !seen.has(k.character) && Boolean(seen.add(k.character)))
    .map(({ kanji: k }) => ({ character: k.character, hanViet: k.han_viet, meaning: k.meaning_vi }))
  const rows = ((items.data ?? []) as unknown as RawItem[]).sort((a, b) => (a.area === 'kana' ? -1 : 1) - (b.area === 'kana' ? -1 : 1))

  return {
    id: word.id,
    code: word.code,
    expression: word.expression,
    reading: word.reading_kana,
    meaning: word.meaning_vi,
    hanViet: word.han_viet,
    romaji: word.romaji,
    lesson: word.lesson,
    isKanaOnly: word.is_kana_only,
    known: known.data?.excluded_at != null,
    starred,
    kanji,
    // Khớp khu Từ vựng Kanji của V12 (lib/dal/v12/content.ts)
    hasKanjiForm: !word.is_kana_only && !!word.han_viet && kanji.length > 0 && word.expression !== word.reading_kana,
    items: rows.map((r) => {
      const stage = r.stage === 'review' ? 'review' : (Number(r.stage) as Stage)
      return { area: r.area, stage, types: r.learner_item_types.filter((t) => t.stage === stage).map((t) => ({ type: t.card_type, points: t.points })) }
    }),
    cards: rows.flatMap((r) => r.item_cards.map((c) => ({ id: c.id, type: c.card_type, dueAt: c.due_at, archived: c.archived_at !== null }))),
  }
}
