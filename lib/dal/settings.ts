// DAL cho cài đặt của người học. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { isValidNewPerDay, newPerDayOf } from '@/lib/learning/new-words'

export async function getNewPerDay(): Promise<number> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from('learner_settings').select('daily_new_limit').eq('user_id', user.id).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  return newPerDayOf(data?.daily_new_limit)
}

export async function saveNewPerDay(value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (!isValidNewPerDay(value)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('learner_settings')
    .upsert({ user_id: user.id, daily_new_limit: value }, { onConflict: 'user_id' })
  if (error) throw new Error(`Không lưu được learner_settings: ${error.message}`)
  return { status: 'saved' }
}
