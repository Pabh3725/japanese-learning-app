// Dấu sao và học lại, thay cho danh sách từ yếu. Server-only.
import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

async function readStarredIdsUncached(supabase: Supabase, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('learner_vocabulary_stars').select('vocabulary_id').eq('user_id', userId).range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary_stars: ${error.message}`)
  return (data ?? []).map((r) => r.vocabulary_id)
}

// Khử trùng trong một render pass (React cache, khóa theo client + userId); kết quả dùng chung nên caller không được sửa nó.
export const readStarredIds = cache(readStarredIdsUncached)

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
  return { status: 'saved' }
}
