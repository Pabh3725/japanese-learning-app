// DAL cho cài đặt của người học. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { isValidStudyLimit, type StudyLimitKey } from '@/lib/learning/new-words'
import { GRAMMAR_V1 } from '@/lib/grammar/rules'
import { RULES_V9 } from '@/lib/learning/rules'
import { addStudyDays, studyDate } from '@/lib/learning/time'

export async function getStudyLimits(): Promise<Record<StudyLimitKey, number>> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('learner_settings')
    .select('lesson_size, learn_cap, review_cap, word_kanji_review_cap, review_session_size, unlock_threshold, kanji_new_per_day, kanji_cap, kanji_review_cap, grammar_new_per_day, grammar_review_cap')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  const { defaults } = RULES_V9
  return {
    lesson_size: data?.lesson_size ?? defaults.lessonSize,
    learn_cap: data?.learn_cap ?? defaults.learnCap,
    review_cap: data?.review_cap ?? defaults.reviewCap,
    word_kanji_review_cap: data?.word_kanji_review_cap ?? defaults.wordKanjiReviewCap,
    review_session_size: data?.review_session_size ?? defaults.reviewSessionSize,
    unlock_threshold: data?.unlock_threshold ?? defaults.unlockThreshold,
    kanji_new_per_day: data?.kanji_new_per_day ?? defaults.kanjiNewPerDay,
    kanji_cap: data?.kanji_cap ?? defaults.kanjiCap,
    kanji_review_cap: data?.kanji_review_cap ?? defaults.kanjiReviewCap,
    grammar_new_per_day: data?.grammar_new_per_day ?? GRAMMAR_V1.newPerDay.default,
    grammar_review_cap: data?.grammar_review_cap ?? GRAMMAR_V1.review.maxPerDay,
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

export async function getGrammarFurigana(): Promise<boolean> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from('learner_settings').select('grammar_furigana').eq('user_id', user.id).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  return data?.grammar_furigana ?? true
}

export async function saveGrammarFurigana(value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (typeof value !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('learner_settings').upsert({ user_id: user.id, grammar_furigana: value }, { onConflict: 'user_id' })
  if (error) throw new Error(`Không lưu được learner_settings: ${error.message}`)
  return { status: 'saved' }
}

/** §3a cân bằng mẫu ngữ pháp mới: bật/tắt, mục tiêu, số phút, ngày hoàn thành (từ ngày mai trở đi). */
export async function saveGrammarBalance(key: unknown, value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  let ok = false
  if (key === 'grammar_balance_on') ok = typeof value === 'boolean'
  else if (key === 'grammar_balance_target') ok = value === 'minutes' || value === 'date'
  else if (key === 'grammar_balance_minutes') ok = Number.isInteger(value) && (value as number) >= 5 && (value as number) <= 240
  else if (key === 'grammar_balance_date') ok = value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= addStudyDays(studyDate(new Date()), 1))
  if (!ok) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from('learner_settings').upsert({ user_id: user.id, [key as string]: value }, { onConflict: 'user_id' })
  if (error) throw new Error(`Không lưu được learner_settings: ${error.message}`)
  return { status: 'saved' }
}
