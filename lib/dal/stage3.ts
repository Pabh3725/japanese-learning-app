// DAL cho Stage 3 (VOC-05, VOC-06). Server-only. Stage 3 chỉ có xem: xem xong thì mở Stage 4 và tạo card.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { firstDueAt } from '@/lib/learning/cards'
import { completeIntro } from '@/lib/learning/stage'

const PAGE = 1000
const WORDS_PER_ROUND = 10

export interface Stage3Word {
  learnerVocabularyId: string
  reading: string
  expression: string
  hanViet: string
  meaning: string
  emoji: string | null
  /** Từng chữ trong từ, không lặp: 学: HỌC, 校: HIỆU. */
  parts: { character: string; hanViet: string; meaning: string }[]
}

type Row = {
  id: string
  vocabulary_id: string
  vocabularies: {
    expression: string
    reading_kana: string
    meaning_vi: string
    han_viet: string | null
    emoji: string | null
    sort_order: number
    vocabulary_kanji: { position: number; kanji: { character: string; han_viet: string; meaning_vi: string } }[]
  }
}

export async function getStage3Words(): Promise<Stage3Word[]> {
  const user = await requireUser()
  const supabase = await createClient()

  const [words, excluded] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select(
        'id, vocabulary_id, vocabularies!inner(expression, reading_kana, meaning_vi, han_viet, emoji, sort_order, ' +
          'vocabulary_kanji(position, kanji(character, han_viet, meaning_vi)))',
      )
      .eq('user_id', user.id)
      .eq('learning_status', 'learning')
      .eq('current_stage', 3)
      .range(0, PAGE - 1),
    supabase
      .from('learner_vocabulary_exclusions')
      .select('vocabulary_id')
      .eq('user_id', user.id)
      .not('excluded_at', 'is', null)
      .range(0, PAGE - 1),
  ])
  if (words.error) throw new Error(`Không đọc được learner_vocabulary: ${words.error.message}`)
  if (excluded.error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${excluded.error.message}`)

  const excludedIds = new Set(excluded.data?.map((r) => r.vocabulary_id))
  return ((words.data ?? []) as unknown as Row[])
    .filter((r) => !excludedIds.has(r.vocabulary_id))
    .sort((a, b) => a.vocabularies.sort_order - b.vocabularies.sort_order)
    .slice(0, WORDS_PER_ROUND)
    .map((r) => {
      const seen = new Set<string>()
      const parts = [...r.vocabularies.vocabulary_kanji]
        .sort((a, b) => a.position - b.position)
        .filter(({ kanji }) => !seen.has(kanji.character) && Boolean(seen.add(kanji.character)))
        .map(({ kanji }) => ({ character: kanji.character, hanViet: kanji.han_viet, meaning: kanji.meaning_vi }))
      return {
        learnerVocabularyId: r.id,
        reading: r.vocabularies.reading_kana,
        expression: r.vocabularies.expression,
        hanViet: r.vocabularies.han_viet ?? '',
        meaning: r.vocabularies.meaning_vi,
        emoji: r.vocabularies.emoji,
        parts,
      }
    })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CompleteStage3Response {
  status: 'saved' | 'invalid' | 'not_found' | 'stage_changed'
}

/** Xem xong thẻ Stage 3. Gọi lại nhiều lần cũng chỉ áp dụng một lần. */
export async function completeStage3(learnerVocabularyId: unknown): Promise<CompleteStage3Response> {
  if (typeof learnerVocabularyId !== 'string' || !UUID.test(learnerVocabularyId)) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()

  const now = new Date()
  const { openedStage, cardsCreated } = completeIntro(3, false)
  const { data, error } = await supabase.rpc('complete_stage3', {
    p_learner_vocabulary_id: learnerVocabularyId,
    p_new_stage: openedStage,
    p_answered_at: now.toISOString(),
    p_new_card_types: cardsCreated,
    p_new_cards_due_at: firstDueAt(now).toISOString(),
  })
  if (error) throw new Error(`complete_stage3 lỗi: ${error.message}`)
  return { status: (data as { status: CompleteStage3Response['status'] }).status }
}
