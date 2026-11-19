// V10 — Dấu sao cho Kanji, cùng thuật toán với từ vựng (docs/learning-rules.md §0): vòng học thêm tối đa 4 câu
// (câu luyện không điểm trong bài Learn) và Card riêng `kanji.star` ôn trong khu Kanji. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readAllPages } from '@/lib/dal/pages'

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

/** Đánh sao chữ: V12 thêm câu học thêm của chữ vào bộ thẻ (không tính điểm). */
export async function setKanjiStarred(kanjiId: unknown, starred: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (typeof kanjiId !== 'string' || !UUID.test(kanjiId) || typeof starred !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = starred
    ? await supabase.from('learner_kanji_stars').upsert({ user_id: user.id, kanji_id: kanjiId }, { onConflict: 'user_id,kanji_id', ignoreDuplicates: true })
    : await supabase.from('learner_kanji_stars').delete().eq('user_id', user.id).eq('kanji_id', kanjiId)
  if (error) throw new Error(`Không lưu được learner_kanji_stars: ${error.message}`)
  return { status: 'saved' }
}
