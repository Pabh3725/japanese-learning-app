// V10 — Dấu sao cho Kanji, cùng thuật toán với từ vựng (docs/learning-rules.md §0): vòng học thêm tối đa 4 câu
// (câu luyện không điểm trong bài Learn) và Card riêng `kanji.star` ôn trong khu Kanji. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readAllPages, readInChunks } from '@/lib/dal/pages'
import { firstDueAt } from '@/lib/learning/cards'
import { KANJI_STAR_CARD, KANJI_STAR_ROUND } from '@/lib/kanji/rules'

type Supabase = Awaited<ReturnType<typeof createClient>>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type StarRow = { kanji_id: string; round_answered: number; starred_at: string }

async function readStars(supabase: Supabase, userId: string): Promise<StarRow[]> {
  return readAllPages('learner_kanji_stars', (from, to) =>
    supabase.from('learner_kanji_stars').select('kanji_id, round_answered, starred_at').eq('user_id', userId).order('starred_at').order('kanji_id').range(from, to),
  )
}

export async function readStarredKanjiIds(supabase: Supabase, userId: string): Promise<Set<string>> {
  return new Set((await readStars(supabase, userId)).map((r) => r.kanji_id))
}

/** Tạo Card riêng nếu chữ đã mở. Đã có thì giữ nguyên, nên đánh sao lại vẫn chạy tiếp lịch cũ. */
export async function ensureKanjiStarCard(supabase: Supabase, userId: string, kanjiId: string): Promise<void> {
  const { data, error } = await supabase.from('learner_kanji').select('id').eq('user_id', userId).eq('kanji_id', kanjiId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_kanji: ${error.message}`)
  if (!data) return
  const { error: insertError } = await supabase
    .from('learner_kanji_cards')
    .upsert({ user_id: userId, learner_kanji_id: data.id, card_type: KANJI_STAR_CARD, due_at: firstDueAt(new Date()).toISOString() }, { onConflict: 'learner_kanji_id,card_type', ignoreDuplicates: true })
  if (insertError) throw new Error(`Không tạo được Card riêng của chữ: ${insertError.message}`)
}

export async function setKanjiStarred(kanjiId: unknown, starred: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (typeof kanjiId !== 'string' || !UUID.test(kanjiId) || typeof starred !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = starred
    ? await supabase.from('learner_kanji_stars').upsert({ user_id: user.id, kanji_id: kanjiId }, { onConflict: 'user_id,kanji_id', ignoreDuplicates: true })
    : await supabase.from('learner_kanji_stars').delete().eq('user_id', user.id).eq('kanji_id', kanjiId)
  if (error) throw new Error(`Không lưu được learner_kanji_stars: ${error.message}`)
  if (starred) await ensureKanjiStarCard(supabase, user.id, kanjiId)
  return { status: 'saved' }
}

export interface KanjiStarCandidate {
  kanjiId: string
  learnerKanjiId: string
  /** Chữ đang ôn bằng Card: câu vòng học thêm dựng từ Card kanji.meaning. */
  cardId: string | null
  left: number
}

/** Chữ có sao đã mở, chưa làm xong vòng học thêm. Sao cũ nhất trước. Chữ đã đánh dấu là đã biết thì bỏ. */
export async function readKanjiStarCandidates(supabase: Supabase, userId: string, known: ReadonlySet<string>): Promise<KanjiStarCandidate[]> {
  const open = (await readStars(supabase, userId)).filter((s) => s.round_answered < KANJI_STAR_ROUND && !known.has(s.kanji_id))
  if (open.length === 0) return []
  const data = await readInChunks('learner_kanji', open.map((s) => s.kanji_id), (chunk) =>
    supabase.from('learner_kanji').select('id, kanji_id, phase, learner_kanji_cards(id, card_type, archived_at)').eq('user_id', userId).in('kanji_id', chunk),
  )
  const rows = data as unknown as { id: string; kanji_id: string; phase: 'learning' | 'review'; learner_kanji_cards: { id: string; card_type: string; archived_at: string | null }[] }[]
  const byKanji = new Map(rows.map((r) => [r.kanji_id, r]))
  return open.flatMap((s) => {
    const row = byKanji.get(s.kanji_id)
    // Chưa mở thì chờ tới khi chữ được giới thiệu trong lộ trình
    if (!row) return []
    const card = row.learner_kanji_cards.find((c) => c.card_type === 'kanji.meaning' && c.archived_at === null) ?? null
    if (row.phase === 'review' && !card) return []
    return [{ kanjiId: s.kanji_id, learnerKanjiId: row.id, cardId: row.phase === 'review' ? card!.id : null, left: KANJI_STAR_ROUND - s.round_answered }]
  })
}

/** Một câu vòng học thêm đã làm. Vừa bỏ sao thì không còn dòng nào để cập nhật. */
export async function bumpKanjiStarRound(supabase: Supabase, userId: string, kanjiId: string): Promise<void> {
  const { data, error } = await supabase.from('learner_kanji_stars').select('round_answered').eq('user_id', userId).eq('kanji_id', kanjiId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_kanji_stars: ${error.message}`)
  if (!data) return
  const { error: upError } = await supabase.from('learner_kanji_stars').update({ round_answered: data.round_answered + 1 }).eq('user_id', userId).eq('kanji_id', kanjiId)
  if (upError) throw new Error(`Không ghi được learner_kanji_stars: ${upError.message}`)
}

export interface StarredAreaKanji {
  id: string
  character: string
  hanViet: string
  meaning: string
  met: boolean
  roundAnswered: number
  roundSize: number
  cardDueAt: string | null
}

/** Khu Starred: các chữ có sao, tiến độ vòng học thêm và hạn Card riêng. */
export async function readStarredKanjiArea(supabase: Supabase, userId: string): Promise<StarredAreaKanji[]> {
  const stars = await readStars(supabase, userId)
  if (stars.length === 0) return []
  const ids = stars.map((s) => s.kanji_id)
  const [kanji, learners] = await Promise.all([
    readInChunks('kanji', ids, (chunk) => supabase.from('kanji').select('id, character, han_viet, meaning_vi').in('id', chunk)),
    readInChunks('learner_kanji', ids, (chunk) => supabase.from('learner_kanji').select('kanji_id, learner_kanji_cards(card_type, due_at, archived_at)').eq('user_id', userId).in('kanji_id', chunk)),
  ])
  const byId = new Map(kanji.map((k) => [k.id as string, k]))
  const learnerBy = new Map((learners as unknown as { kanji_id: string; learner_kanji_cards: { card_type: string; due_at: string; archived_at: string | null }[] }[]).map((r) => [r.kanji_id, r]))
  return stars.flatMap((s) => {
    const k = byId.get(s.kanji_id)
    if (!k) return []
    const learner = learnerBy.get(s.kanji_id)
    const card = learner?.learner_kanji_cards.find((c) => c.card_type === KANJI_STAR_CARD && c.archived_at === null)
    return [{ id: s.kanji_id, character: k.character as string, hanViet: k.han_viet as string, meaning: k.meaning_vi as string, met: learner !== undefined, roundAnswered: Math.min(s.round_answered, KANJI_STAR_ROUND), roundSize: KANJI_STAR_ROUND, cardDueAt: card?.due_at ?? null }]
  })
}

/** Trang Starred: các chữ có sao của người đang đăng nhập. */
export async function getStarredKanji(): Promise<StarredAreaKanji[]> {
  const user = await requireUser()
  const supabase = await createClient()
  return readStarredKanjiArea(supabase, user.id)
}
