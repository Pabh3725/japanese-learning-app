// DAL cho cài đặt của người học. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { isValidNewPerDay, isValidStudyLimit, newPerDayOf, type StudyLimitKey } from '@/lib/learning/new-words'
import { RULES_V9 } from '@/lib/learning/rules'

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

export async function getStudyLimits(): Promise<Record<StudyLimitKey, number>> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('learner_settings')
    .select('lesson_size, learn_cap, review_cap, word_kanji_review_cap, unlock_threshold, kanji_new_per_day, kanji_cap, kanji_review_cap')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  const { defaults } = RULES_V9
  return {
    lesson_size: data?.lesson_size ?? defaults.lessonSize,
    learn_cap: data?.learn_cap ?? defaults.learnCap,
    review_cap: data?.review_cap ?? defaults.reviewCap,
    word_kanji_review_cap: data?.word_kanji_review_cap ?? defaults.wordKanjiReviewCap,
    unlock_threshold: data?.unlock_threshold ?? defaults.unlockThreshold,
    kanji_new_per_day: data?.kanji_new_per_day ?? defaults.kanjiNewPerDay,
    kanji_cap: data?.kanji_cap ?? defaults.kanjiCap,
    kanji_review_cap: data?.kanji_review_cap ?? defaults.kanjiReviewCap,
  }
}

export async function saveStudyLimit(key: unknown, value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (!isValidStudyLimit(key, value)) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('learner_settings').upsert({ user_id: user.id, [key]: value }, { onConflict: 'user_id' })
  if (error) throw new Error(`Không lưu được learner_settings: ${error.message}`)
  return { status: 'saved' }
}
