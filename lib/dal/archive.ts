// V9 R13 — Nút "Đã học xong" và kho lưu trữ Card. Chỉ đổi đúng Card được chọn. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import type { ArchivedCard, CardKind } from '@/lib/review/archive'
import { readAllPages } from '@/lib/dal/pages'
import { firstDueAt } from '@/lib/learning/cards'
import { REVIEW_CARDS, type ReviewCardType } from '@/lib/v12/card-types'

type Supabase = Awaited<ReturnType<typeof createClient>>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type { ArchivedCard, ArchiveCardType, CardKind } from '@/lib/review/archive'

export type ArchiveResponse = { status: 'saved' | 'duplicate' | 'already' | 'not_found' | 'invalid' | 'not_archived' }

const isKind = (v: unknown): v is CardKind => v === 'vocab' || v === 'kanji' || v === 'item'
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

/** Lịch của Card mới: đến hạn 00:00 ngày học kế tiếp, chưa ôn lần nào. */
const freshSchedule = (now: Date) => ({ state: 0, due_at: firstDueAt(now).toISOString(), stability: 0, difficulty: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, last_review_at: null })

/**
 * Lưu trữ riêng một Card. Card khác của mục không đổi.
 * V12 (gói 4): Card nằm ở item_cards, chủ sở hữu được sửa trực tiếp (RLS); Card V11 (vocab/kanji) còn RPC cũ tới gói 5.
 */
export async function archiveCard(kind: unknown, cardId: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  if (!isKind(kind) || !isUuid(cardId) || !isUuid(clientEventId)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  if (kind === 'item') {
    const { data, error } = await supabase.from('item_cards').update({ archived_at: new Date().toISOString() }).eq('id', cardId).eq('user_id', user.id).is('archived_at', null).select('id')
    if (error) throw new Error(`Không lưu trữ được item_cards: ${error.message}`)
    return { status: data && data.length > 0 ? 'saved' : 'already' }
  }
  const { data, error } = await supabase.rpc('archive_card', { p_kind: kind, p_card_id: cardId, p_client_event_id: clientEventId })
  if (error) throw new Error(`archive_card lỗi: ${error.message}`)
  return data as ArchiveResponse
}

/** Khôi phục: 'keep' giữ nguyên lịch; 'reset' học lại riêng Card đó từ đầu, log cũ giữ nguyên. */
export async function restoreCard(kind: unknown, cardId: unknown, mode: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  if (!isKind(kind) || !isUuid(cardId) || !isUuid(clientEventId) || (mode !== 'keep' && mode !== 'reset')) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  if (kind === 'item') {
    const patch = mode === 'reset' ? { archived_at: null, ...freshSchedule(new Date()) } : { archived_at: null }
    const { data, error } = await supabase.from('item_cards').update(patch).eq('id', cardId).eq('user_id', user.id).not('archived_at', 'is', null).select('id')
    if (error) throw new Error(`Không khôi phục được item_cards: ${error.message}`)
    return { status: data && data.length > 0 ? 'saved' : 'not_archived' }
  }
  const { data, error } = await supabase.rpc('restore_card', { p_kind: kind, p_card_id: cardId, p_mode: mode, p_client_event_id: clientEventId })
  if (error) throw new Error(`restore_card lỗi: ${error.message}`)
  return data as ArchiveResponse
}

type ItemCardRow = {
  id: string
  card_type: ReviewCardType
  archived_at: string
  stability: number
  due_at: string
  reps: number
  lapses: number
  learner_items: {
    area: string
    radical_number: number | null
    vocabularies: { expression: string; reading_kana: string; meaning_vi: string } | null
    kanji: { character: string; han_viet: string; meaning_vi: string } | null
    radicals: { character: string; name_vi: string; meaning_vi: string | null } | null
  }
}

/** Kho lưu trữ (V12): mọi Card đã lưu trữ ở item_cards (Card V11 đã chuyển sang khi chạy migration gói 4), mới nhất trước. */
export async function getArchivedCards(): Promise<ArchivedCard[]> {
  const user = await requireUser()
  const supabase: Supabase = await createClient()
  const rows = await readAllPages('item_cards', (from, to) =>
    supabase
      .from('item_cards')
      .select('id, card_type, archived_at, stability, due_at, reps, lapses, learner_items!inner(area, radical_number, vocabularies(expression, reading_kana, meaning_vi), kanji(character, han_viet, meaning_vi), radicals(character, name_vi, meaning_vi))')
      .eq('user_id', user.id)
      .in('card_type', Object.keys(REVIEW_CARDS))
      .not('archived_at', 'is', null)
      .order('id')
      .range(from, to),
  )
  return (rows as unknown as ItemCardRow[])
    .map((r): ArchivedCard => {
      const it = r.learner_items
      const [title, subtitle, meaning] = it.vocabularies
        ? r.card_type === 'word_kanji'
          ? [it.vocabularies.expression, it.vocabularies.reading_kana, it.vocabularies.meaning_vi]
          : [it.vocabularies.reading_kana, it.vocabularies.reading_kana, it.vocabularies.meaning_vi]
        : it.kanji
          ? [it.kanji.character, it.kanji.han_viet, it.kanji.meaning_vi]
          : [it.radicals?.character ?? '', it.radicals ? `Bộ ${it.radicals.name_vi}` : '', it.radicals?.meaning_vi ?? '']
      return { kind: 'item', id: r.id, type: r.card_type, title, subtitle, meaning, archivedAt: r.archived_at, stability: r.stability, dueAt: r.due_at, reps: r.reps, lapses: r.lapses }
    })
    .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt))
}
