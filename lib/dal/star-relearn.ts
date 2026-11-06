// Dấu sao và học lại, thay cho danh sách từ yếu. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { starRoundExercises, type StarRoundItem } from '@/lib/learn/star-round'
import { firstDueAt } from '@/lib/learning/cards'
import { relearnStagePoints } from '@/lib/learning/stage'
import type { ScoredStage } from '@/lib/learning/types'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

export async function readStarredIds(supabase: Supabase, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('learner_vocabulary_stars').select('vocabulary_id').eq('user_id', userId).range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary_stars: ${error.message}`)
  return (data ?? []).map((r) => r.vocabulary_id)
}

export async function isWordStarred(supabase: Supabase, userId: string, vocabularyId: string): Promise<boolean> {
  const { data, error } = await supabase.from('learner_vocabulary_stars').select('vocabulary_id').eq('user_id', userId).eq('vocabulary_id', vocabularyId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_vocabulary_stars: ${error.message}`)
  return data !== null
}

export async function setWordStarred(vocabularyId: unknown, starred: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (!isUuid(vocabularyId) || typeof starred !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = starred
    ? await supabase.from('learner_vocabulary_stars').upsert({ user_id: user.id, vocabulary_id: vocabularyId }, { onConflict: 'user_id,vocabulary_id', ignoreDuplicates: true })
    : await supabase.from('learner_vocabulary_stars').delete().eq('user_id', user.id).eq('vocabulary_id', vocabularyId)
  if (error) throw new Error(`Không lưu được learner_vocabulary_stars: ${error.message}`)
  if (starred) await ensureStarCard(supabase, user.id, vocabularyId)
  return { status: 'saved' }
}

/** Tạo Card riêng nếu từ đã gặp. Đã có thì giữ nguyên, nên đánh sao lại vẫn chạy tiếp lịch cũ. */
export async function ensureStarCard(supabase: Supabase, userId: string, vocabularyId: string): Promise<void> {
  const { data, error } = await supabase.from('learner_vocabulary').select('id').eq('user_id', userId).eq('vocabulary_id', vocabularyId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  if (!data) return
  const { error: insertError } = await supabase
    .from('review_cards')
    .upsert(
      { user_id: userId, learner_vocabulary_id: data.id, card_type: 'vocab.star_recall', due_at: firstDueAt(new Date()).toISOString() },
      { onConflict: 'learner_vocabulary_id,card_type', ignoreDuplicates: true },
    )
  if (insertError) throw new Error(`Không tạo được Card riêng: ${insertError.message}`)
}

export interface StarRoundWord<W> {
  learnerVocabularyId: string
  vocabularyId: string
  currentStage: number
  kanjiIntroSeen: boolean
  word: W
}

/** Từ có sao đã gặp, chưa làm xong vòng học thêm. Sao cũ nhất trước. */
export async function readStarRound<W extends { is_kana_only: boolean; han_viet: string | null }>(
  supabase: Supabase,
  userId: string,
  wordColumns: string,
  excludedIds: ReadonlySet<string>,
): Promise<StarRoundItem<StarRoundWord<W>>[]> {
  const { data: stars, error } = await supabase
    .from('learner_vocabulary_stars')
    .select('vocabulary_id, round_answered')
    .eq('user_id', userId)
    .order('starred_at')
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary_stars: ${error.message}`)
  const open = (stars ?? []).filter((s) => !excludedIds.has(s.vocabulary_id))
  if (open.length === 0) return []
  const { data: rows, error: rowsError } = await supabase
    .from('learner_vocabulary')
    .select(`id, vocabulary_id, current_stage, kanji_intro_seen_at, vocabularies!inner(${wordColumns})`)
    .eq('user_id', userId)
    .in('vocabulary_id', open.map((s) => s.vocabulary_id))
  if (rowsError) throw new Error(`Không đọc được learner_vocabulary: ${rowsError.message}`)
  const list = (rows ?? []) as unknown as { id: string; vocabulary_id: string; current_stage: number; kanji_intro_seen_at: string | null; vocabularies: W }[]
  const byWord = new Map(list.map((r) => [r.vocabulary_id, r]))
  return open.flatMap((star) => {
    const row = byWord.get(star.vocabulary_id)
    // Chưa gặp thì chờ tới khi từ được giới thiệu trong lộ trình
    if (!row) return []
    const known = { currentStage: row.current_stage, kanjiIntroSeen: row.kanji_intro_seen_at !== null }
    const exercises = starRoundExercises(row.vocabularies, known)
    if (star.round_answered >= exercises.length) return []
    return [{
      word: { learnerVocabularyId: row.id, vocabularyId: row.vocabulary_id, currentStage: row.current_stage, kanjiIntroSeen: known.kanjiIntroSeen, word: row.vocabularies },
      exercises,
      answered: star.round_answered,
    }]
  })
}

export type RelearnResponse = { status: 'saved' | 'invalid' | 'not_found' | 'not_completed' }

export async function relearnCard(cardId: unknown): Promise<RelearnResponse> {
  if (!isUuid(cardId)) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('relearn_card', { p_review_card_id: cardId })
  if (error) throw new Error(`relearn_card lỗi: ${error.message}`)
  return data as RelearnResponse
}

export async function relearnStage(scheduleId: unknown): Promise<RelearnResponse> {
  if (!isUuid(scheduleId)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { data: row, error: readError } = await supabase
    .from('learner_stage_schedules')
    .select('stage_number, learner_vocabulary!inner(vocabularies!inner(is_kana_only))')
    .eq('id', scheduleId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (readError) throw new Error(`Không đọc được learner_stage_schedules: ${readError.message}`)
  if (!row) return { status: 'not_found' }
  const schedule = row as unknown as { stage_number: ScoredStage; learner_vocabulary: { vocabularies: { is_kana_only: boolean } } }
  const { data, error } = await supabase.rpc('relearn_stage', {
    p_schedule_id: scheduleId,
    p_stage_points: relearnStagePoints(schedule.stage_number, schedule.learner_vocabulary.vocabularies.is_kana_only),
  })
  if (error) throw new Error(`relearn_stage lỗi: ${error.message}`)
  return data as RelearnResponse
}
