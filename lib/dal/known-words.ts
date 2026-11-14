// "Đã biết từ này": bỏ từ khỏi toàn bộ lộ trình mà không xóa dữ liệu. Server-only.
// Dùng bảng learner_vocabulary_exclusions (R8): khôi phục là đặt excluded_at về null, Card và điểm còn nguyên.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { parseVocabularyIds } from '@/lib/intro/words'
import { readAllPages } from '@/lib/dal/pages'

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Từ đang được đánh dấu "đã biết" (excluded_at khác null). Đọc đủ mọi trang: có thể vượt 1000 từ. */
export async function readKnownWordIds(supabase: Supabase, userId: string): Promise<Set<string>> {
  const rows = await readAllPages('learner_vocabulary_exclusions', (from, to) =>
    supabase.from('learner_vocabulary_exclusions').select('vocabulary_id').eq('user_id', userId).not('excluded_at', 'is', null).order('vocabulary_id').range(from, to),
  )
  return new Set(rows.map((r) => r.vocabulary_id as string))
}

export async function markWordsKnown(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  const ids = parseVocabularyIds(input)
  if (!ids) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const excludedAt = new Date().toISOString()
  const { error } = await supabase
    .from('learner_vocabulary_exclusions')
    .upsert(ids.map((id) => ({ user_id: user.id, vocabulary_id: id, excluded_at: excludedAt })), { onConflict: 'user_id,vocabulary_id' })
  if (error) throw new Error(`Không lưu được learner_vocabulary_exclusions: ${error.message}`)
  return { status: 'saved' }
}

export async function unmarkWordsKnown(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  const ids = parseVocabularyIds(input)
  if (!ids) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('learner_vocabulary_exclusions')
    .update({ excluded_at: null })
    .eq('user_id', user.id)
    .in('vocabulary_id', ids)
  if (error) throw new Error(`Không lưu được learner_vocabulary_exclusions: ${error.message}`)
  return { status: 'saved' }
}
