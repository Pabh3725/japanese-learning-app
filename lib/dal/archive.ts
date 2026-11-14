// V9 R13 — Nút "Đã học xong" và kho lưu trữ Card. Chỉ đổi đúng Card được chọn. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import type { ArchivedCard, CardKind } from '@/lib/review/archive'
import type { CardType } from '@/lib/learning/types'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type { ArchivedCard, ArchiveCardType, CardKind } from '@/lib/review/archive'

export type ArchiveResponse = { status: 'saved' | 'duplicate' | 'already' | 'not_found' | 'invalid' | 'not_archived' }

const isKind = (v: unknown): v is CardKind => v === 'vocab' || v === 'kanji'
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

/** Lưu trữ riêng một Card. Card khác của từ và chữ thành phần không đổi. */
export async function archiveCard(kind: unknown, cardId: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  if (!isKind(kind) || !isUuid(cardId) || !isUuid(clientEventId)) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('archive_card', { p_kind: kind, p_card_id: cardId, p_client_event_id: clientEventId })
  if (error) throw new Error(`archive_card lỗi: ${error.message}`)
  return data as ArchiveResponse
}

/** Khôi phục: 'keep' giữ nguyên lịch; 'reset' học lại riêng Card đó từ đầu, log cũ giữ nguyên. */
export async function restoreCard(kind: unknown, cardId: unknown, mode: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  if (!isKind(kind) || !isUuid(cardId) || !isUuid(clientEventId) || (mode !== 'keep' && mode !== 'reset')) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('restore_card', { p_kind: kind, p_card_id: cardId, p_mode: mode, p_client_event_id: clientEventId })
  if (error) throw new Error(`restore_card lỗi: ${error.message}`)
  return data as ArchiveResponse
}

type VocabRow = {
  id: string
  card_type: CardType
  archived_at: string
  stability: number
  due_at: string
  reps: number
  lapses: number
  learner_vocabulary: { vocabularies: { expression: string; reading_kana: string; meaning_vi: string } }
}

type KanjiCardRow = {
  id: string
  card_type: 'kanji.meaning' | 'kanji.hanviet' | 'kanji.star'
  archived_at: string
  stability: number
  due_at: string
  reps: number
  lapses: number
  learner_kanji: { kanji: { character: string; han_viet: string; meaning_vi: string } }
}

async function readAll<T>(read: (from: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>, table: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await read(from)
    if (error) throw new Error(`Không đọc được ${table}: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if ((data?.length ?? 0) < PAGE) return rows
  }
}

/** Kho lưu trữ: mọi Card đã lưu trữ, mới nhất trước. */
export async function getArchivedCards(): Promise<ArchivedCard[]> {
  const user = await requireUser()
  const supabase: Supabase = await createClient()
  const [vocab, kanji] = await Promise.all([
    readAll<VocabRow>(
      (from) =>
        supabase
          .from('review_cards')
          .select('id, card_type, archived_at, stability, due_at, reps, lapses, learner_vocabulary!inner(vocabularies!inner(expression, reading_kana, meaning_vi))')
          .eq('user_id', user.id)
          .not('archived_at', 'is', null)
          .order('id')
          .range(from, from + PAGE - 1),
      'review_cards',
    ),
    readAll<KanjiCardRow>(
      (from) =>
        supabase
          .from('learner_kanji_cards')
          .select('id, card_type, archived_at, stability, due_at, reps, lapses, learner_kanji!inner(kanji!inner(character, han_viet, meaning_vi))')
          .eq('user_id', user.id)
          .not('archived_at', 'is', null)
          .order('id')
          .range(from, from + PAGE - 1),
      'learner_kanji_cards',
    ),
  ])
  const schedule = (r: { archived_at: string; stability: number; due_at: string; reps: number; lapses: number }) => ({
    archivedAt: r.archived_at,
    stability: r.stability,
    dueAt: r.due_at,
    reps: r.reps,
    lapses: r.lapses,
  })
  return [
    ...vocab.map((r): ArchivedCard => {
      const w = r.learner_vocabulary.vocabularies
      return { kind: 'vocab', id: r.id, type: r.card_type, title: w.expression, subtitle: w.reading_kana, meaning: w.meaning_vi, ...schedule(r) }
    }),
    ...kanji.map((r): ArchivedCard => {
      const k = r.learner_kanji.kanji
      return { kind: 'kanji', id: r.id, type: r.card_type, title: k.character, subtitle: k.han_viet, meaning: k.meaning_vi, ...schedule(r) }
    }),
  ].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt))
}
