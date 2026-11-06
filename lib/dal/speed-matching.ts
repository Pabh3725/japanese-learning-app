// Speed Matching dùng các từ người học đã gặp. Chưa lưu kết quả; cộng điểm Card thuộc GAME-01. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { uniqueSpeedWords, type SpeedWord } from '@/lib/speed-matching'

const PAGE = 1000

export async function getSpeedMatchWords(): Promise<SpeedWord[]> {
  const user = await requireUser()
  const supabase = await createClient()
  const [excluded, rows] = await Promise.all([
    supabase.from('learner_vocabulary_exclusions').select('vocabulary_id').eq('user_id', user.id).not('excluded_at', 'is', null).range(0, PAGE - 1),
    supabase
      .from('learner_vocabulary')
      .select('vocabulary_id, kanji_intro_seen_at, vocabularies!inner(expression, reading_kana, meaning_vi)')
      .eq('user_id', user.id)
      .range(0, PAGE - 1),
  ])
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)
  if (rows.error) throw new Error(`Không đọc được learner_vocabulary: ${rows.error.message}`)
  const excludedIds = new Set(excluded.data?.map((r) => r.vocabulary_id))
  const words = (rows.data ?? []) as unknown as {
    vocabulary_id: string
    kanji_intro_seen_at: string | null
    vocabularies: { expression: string; reading_kana: string; meaning_vi: string }
  }[]
  return uniqueSpeedWords(
    words
      .filter((r) => !excludedIds.has(r.vocabulary_id))
      // Kanji chỉ hiện sau khi đã được giới thiệu
      .map((r) => ({ id: r.vocabulary_id, word: r.kanji_intro_seen_at ? r.vocabularies.expression : r.vocabularies.reading_kana, meaning: r.vocabularies.meaning_vi })),
  )
}
