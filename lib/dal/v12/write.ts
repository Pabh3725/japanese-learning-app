// V12: ghi tiến độ — mở mục, lưu câu Stage, lưu Card FSRS, đánh dấu đã xem thẻ giới thiệu. Server-only.
// Luật tính ở lõi thuần (lib/v12/stage.ts, lib/srs/scheduler.ts); RPC chỉ ghi kết quả trong một transaction.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { firstDueAt } from '@/lib/learning/cards'
import { studyDate } from '@/lib/learning/time'
import { createScheduler, type ReviewCard } from '@/lib/srs/scheduler'
import { typesFor, type Area, type CardType, type ReviewCardType } from '@/lib/v12/card-types'
import { applyAnswer, canShow, type AnswerResult } from '@/lib/v12/stage'
import { readItem, toCard } from './state'

type Supabase = Awaited<ReturnType<typeof createClient>>
export type WriteStatus = 'saved' | 'duplicate' | 'conflict' | 'not_found' | 'not_active' | 'not_allowed'

const statusOf = (data: unknown): WriteStatus => ((data as { status?: string } | null)?.status as WriteStatus) ?? 'conflict'

/** Mở một mục mới ở Stage 1 từ hôm nay (đã có thì trả mục đang có). */
export async function openItem(
  supabase: Supabase,
  area: Area,
  ref: { vocabularyId?: string; kanjiId?: string; radicalNumber?: number },
  now: Date,
  hasSimilar = false,
): Promise<{ status: 'saved' | 'exists'; id: string }> {
  const { data, error } = await supabase.rpc('v12_open_item', {
    p_area: area,
    p_vocabulary_id: ref.vocabularyId ?? null,
    p_kanji_id: ref.kanjiId ?? null,
    p_radical_number: ref.radicalNumber ?? null,
    p_stage_from: studyDate(now),
    p_has_similar: hasSimilar,
    p_types: typesFor(area, 1, { hasSimilar }),
  })
  if (error) throw new Error(`v12_open_item lỗi: ${error.message}`)
  return data as { status: 'saved' | 'exists'; id: string }
}

/** Đã xem thẻ giới thiệu (Stage 1 dở dang hôm sau thì không hiện lại thẻ). */
export async function markIntroSeen(supabase: Supabase, userId: string, itemId: string, now: Date): Promise<void> {
  const { error } = await supabase.from('learner_items').update({ intro_seen_at: now.toISOString() }).eq('id', itemId).eq('user_id', userId).is('intro_seen_at', null)
  if (error) throw new Error(`Không lưu được learner_items: ${error.message}`)
}

/**
 * Lưu một câu Stage đã chấm ở server (§3): tính bằng applyAnswer rồi ghi qua v12_save_answer.
 * Trả kết quả để trình học biết có hỏi lại không, có xong Stage / tạo Card không.
 */
export async function saveStageAnswer(
  supabase: Supabase,
  userId: string,
  input: { itemId: string; type: CardType; correct: boolean; elapsedMs: number; clientEventId: string },
  now: Date,
): Promise<{ status: WriteStatus; result?: AnswerResult }> {
  const item = await readItem(supabase, userId, input.itemId)
  if (!item) return { status: 'not_found' }
  const today = studyDate(now)
  if (item.known || !canShow(item.state, input.type, today)) return { status: 'not_allowed' }
  const result = applyAnswer(item.state, input.type, input.correct, today)
  const stage = item.state.stage as 1 | 2 | 3
  const t = result.typeState
  const typeState = { points: t.points, seen_date: t.seenDate, seen_today: t.seenToday, wrong_today: t.wrongToday }
  const { data, error } = await supabase.rpc('v12_save_answer', {
    p_item_id: item.id,
    p_expected_version: item.version,
    p_client_event_id: input.clientEventId,
    p_stage: stage,
    p_card_type: input.type,
    p_correct: input.correct,
    p_points_delta: result.delta,
    p_type_state: typeState,
    p_new_stage: String(result.item.stage),
    p_new_stage_from: result.item.stageFrom,
    p_new_types: result.stageDone && result.item.stage !== 'review' ? Object.keys(result.item.types) : [],
    p_cards: result.cardsCreated.map((card) => ({ card_type: card, due_at: firstDueAt(now).toISOString() })),
    p_elapsed_ms: Math.max(0, Math.min(3_600_000, Math.round(input.elapsedMs))),
    p_study_date: today,
    p_answered_at: now.toISOString(),
  })
  if (error) throw new Error(`v12_save_answer lỗi: ${error.message}`)
  const status = statusOf(data)
  return status === 'saved' ? { status, result } : { status }
}

/** Câu học thêm của từ / chữ có sao: chỉ ghi log (stage 'star'), không tính điểm, không đổi lịch. Gửi trùng thì bỏ qua. */
export async function saveStarAnswer(
  supabase: Supabase,
  userId: string,
  input: { itemId: string; area: Area; type: CardType; correct: boolean; elapsedMs: number; clientEventId: string },
  now: Date,
): Promise<void> {
  const { error } = await supabase.from('item_logs').insert({
    user_id: userId,
    learner_item_id: input.itemId,
    client_event_id: input.clientEventId,
    area: input.area,
    stage: 'star',
    card_type: input.type,
    correct: input.correct,
    elapsed_ms: Math.max(0, Math.min(3_600_000, Math.round(input.elapsedMs))),
    study_date: studyDate(now),
    answered_at: now.toISOString(),
  })
  if (error && error.code !== '23505') throw new Error(`Không lưu được item_logs: ${error.message}`)
}

/** Lưu một lần ôn Card (§3.3): đúng là Good, sai là Again; lịch FSRS như hiện nay (tối đa 90 ngày, 00:00 giờ VN). */
export async function saveCardReview(
  supabase: Supabase,
  userId: string,
  input: { cardId: string; correct: boolean; elapsedMs: number; clientEventId: string },
  now: Date,
): Promise<{ status: WriteStatus; due?: Date; card?: ReviewCardType }> {
  const { data: raw, error: readError } = await supabase
    .from('item_cards')
    .select('id, learner_item_id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, archived_at, version')
    .eq('id', input.cardId)
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) throw new Error(`Không đọc được item_cards: ${readError.message}`)
  if (!raw) return { status: 'not_found' }
  const card = toCard(raw)
  if (card.archived) return { status: 'not_active' }
  const scheduler = createScheduler()
  const reviewed = scheduler.reviewCard({ type: 'vocab.kana', status: 'active', schedule: card.schedule } as ReviewCard, { outcome: input.correct ? 'correct' : 'wrong', exercise: card.type, responseMs: input.elapsedMs }, now)
  const s = reviewed.card.schedule
  const { data, error } = await supabase.rpc('v12_save_card', {
    p_card_id: card.id,
    p_expected_version: card.version,
    p_client_event_id: input.clientEventId,
    p_correct: input.correct,
    p_rating: reviewed.log.rating,
    p_state: s.state,
    p_due_at: s.due.toISOString(),
    p_stability: s.stability,
    p_difficulty: s.difficulty,
    p_scheduled_days: s.scheduledDays,
    p_learning_steps: s.learningSteps,
    p_reps: s.reps,
    p_lapses: s.lapses,
    p_last_review_at: s.lastReviewAt?.toISOString() ?? now.toISOString(),
    p_elapsed_ms: Math.max(0, Math.min(3_600_000, Math.round(input.elapsedMs))),
    p_study_date: studyDate(now),
    p_answered_at: now.toISOString(),
  })
  if (error) throw new Error(`v12_save_card lỗi: ${error.message}`)
  return { status: statusOf(data), due: s.due, card: card.type }
}

/**
 * Nút "đã biết cả nhóm" của bộ thủ (chủ dự án chốt 2026-11-19): known = true thì mọi bộ trong phạm vi coi như đã biết
 * (bộ chưa mở được tạo ở Stage 1 kèm known_at để bỏ đánh dấu thì học lại từ đầu); known = false thì bỏ đánh dấu cả nhóm.
 */
export async function setRadicalsKnown(supabase: Supabase, userId: string, numbers: readonly number[], known: boolean, now: Date): Promise<number> {
  if (!known) {
    const { data, error } = await supabase.from('learner_items').update({ known_at: null }).eq('user_id', userId).eq('area', 'radical').not('known_at', 'is', null).select('id')
    if (error) throw new Error(`Không lưu được learner_items: ${error.message}`)
    return data?.length ?? 0
  }
  const { data: rows, error: readError } = await supabase.from('learner_items').select('radical_number').eq('user_id', userId).eq('area', 'radical')
  if (readError) throw new Error(`Không đọc được learner_items: ${readError.message}`)
  const opened = new Set((rows ?? []).map((r) => r.radical_number as number))
  const at = now.toISOString()
  const { error: updateError } = await supabase.from('learner_items').update({ known_at: at }).eq('user_id', userId).eq('area', 'radical').is('known_at', null)
  if (updateError) throw new Error(`Không lưu được learner_items: ${updateError.message}`)
  const missing = numbers.filter((n) => !opened.has(n))
  if (missing.length > 0) {
    const { data: created, error } = await supabase
      .from('learner_items')
      .insert(missing.map((n) => ({ user_id: userId, area: 'radical', radical_number: n, stage: '1', stage_from: studyDate(now), known_at: at })))
      .select('id')
    if (error) throw new Error(`Không tạo được learner_items: ${error.message}`)
    const types = typesFor('radical', 1, { hasSimilar: false })
    const { error: typesError } = await supabase
      .from('learner_item_types')
      .insert((created ?? []).flatMap((r) => types.map((t) => ({ learner_item_id: r.id, user_id: userId, stage: 1, card_type: t }))))
    if (typesError) throw new Error(`Không tạo được learner_item_types: ${typesError.message}`)
  }
  return numbers.length
}
