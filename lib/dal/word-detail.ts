// LIB-01 — Chi tiết một từ trong Library: thành phần Kanji, stage, Card và điểm của người học. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { isWordStarred } from '@/lib/dal/star-relearn'
import type { CardType, ScoredStage } from '@/lib/learning/types'

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
  /** Chưa gặp từ này thì không có. */
  progress: {
    currentStage: number
    completed: boolean
    stages: { id: string; stage: ScoredStage; points: number; dueAt: string; completed: boolean }[]
    cards: { id: string; type: CardType; dueAt: string }[]
  } | null
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

  const [learner, known, starred] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select('current_stage, learning_status, learner_stage_schedules(id, stage_number, stage_points, due_at, completed_at), review_cards(id, card_type, due_at)')
      .eq('user_id', user.id)
      .eq('vocabulary_id', word.id)
      .maybeSingle(),
    supabase.from('learner_vocabulary_exclusions').select('excluded_at').eq('user_id', user.id).eq('vocabulary_id', word.id).maybeSingle(),
    isWordStarred(supabase, user.id, word.id),
  ])
  if (learner.error) throw new Error(`Không đọc được learner_vocabulary: ${learner.error.message}`)
  if (known.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${known.error.message}`)

  const lv = learner.data as unknown as {
    current_stage: number
    learning_status: string
    learner_stage_schedules: { id: string; stage_number: ScoredStage; stage_points: number; due_at: string; completed_at: string | null }[]
    review_cards: { id: string; card_type: CardType; due_at: string }[]
  } | null

  const seen = new Set<string>()
  const kanji = [...word.vocabulary_kanji]
    .sort((a, b) => a.position - b.position)
    .filter(({ kanji: k }) => !seen.has(k.character) && Boolean(seen.add(k.character)))
    .map(({ kanji: k }) => ({ character: k.character, hanViet: k.han_viet, meaning: k.meaning_vi }))

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
    progress: lv && {
      currentStage: lv.current_stage,
      completed: lv.learning_status === 'initial_complete',
      stages: lv.learner_stage_schedules
        .map((s) => ({ id: s.id, stage: s.stage_number, points: s.stage_points, dueAt: s.due_at, completed: s.completed_at !== null }))
        .sort((a, b) => a.stage - b.stage),
      cards: lv.review_cards.map((c) => ({ id: c.id, type: c.card_type, dueAt: c.due_at })),
    },
  }
}
