// DAL cho Stage 3 (VOC-05, VOC-06). Server-only. Stage 3 chỉ có xem: thẻ Hán Việt mở Stage 4 và tạo card;
// thẻ Giới thiệu Hán tự cho phép từ học tiếp bước 2 của Stage 4.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { firstDueAt } from '@/lib/learning/cards'
import { completeIntro, reachedKanjiIntro } from '@/lib/learning/stage'

const PAGE = 1000
const WORDS_PER_ROUND = 10

/** Thẻ Hán Việt: chưa có Kanji, nên không gửi cách viết xuống trình duyệt. */
export interface HanVietIntroWord {
  kind: 'hanviet'
  learnerVocabularyId: string
  reading: string
  hanViet: string
  meaning: string
  emoji: string | null
}

/** Thẻ Giới thiệu Hán tự: cả từ, rồi từng chữ. */
export interface KanjiIntroWord {
  kind: 'kanji'
  learnerVocabularyId: string
  reading: string
  expression: string
  hanViet: string
  meaning: string
  /** Từng chữ trong từ, không lặp: 学: HỌC, 校: HIỆU. */
  parts: { character: string; hanViet: string; meaning: string }[]
}

export type Stage3Item = HanVietIntroWord | KanjiIntroWord

type Row = {
  id: string
  vocabulary_id: string
  current_stage: number
  vocabularies: {
    expression: string
    reading_kana: string
    meaning_vi: string
    han_viet: string | null
    emoji: string | null
    sort_order: number
    is_kana_only: boolean
    vocabulary_kanji: { position: number; kanji: { character: string; han_viet: string; meaning_vi: string } }[]
  }
  learner_stage_schedules: { stage_number: number; stage_points: number }[]
}

function toItem(r: Row): Stage3Item {
  const v = r.vocabularies
  if (r.current_stage === 3) {
    return {
      kind: 'hanviet',
      learnerVocabularyId: r.id,
      reading: v.reading_kana,
      hanViet: v.han_viet ?? '',
      meaning: v.meaning_vi,
      emoji: v.emoji,
    }
  }
  const seen = new Set<string>()
  const parts = [...v.vocabulary_kanji]
    .sort((a, b) => a.position - b.position)
    .filter(({ kanji }) => !seen.has(kanji.character) && Boolean(seen.add(kanji.character)))
    .map(({ kanji }) => ({ character: kanji.character, hanViet: kanji.han_viet, meaning: kanji.meaning_vi }))
  return {
    kind: 'kanji',
    learnerVocabularyId: r.id,
    reading: v.reading_kana,
    expression: v.expression,
    hanViet: v.han_viet ?? '',
    meaning: v.meaning_vi,
    parts,
  }
}

/** Trang Stage 3 có hai loại thẻ: từ vừa mở Stage 3, và từ ở Stage 4 đã đủ điểm xem Hán tự. */
export async function getStage3Items(): Promise<Stage3Item[]> {
  const user = await requireUser()
  const supabase = await createClient()

  const [words, excluded] = await Promise.all([
    supabase
      .from('learner_vocabulary')
      .select(
        'id, vocabulary_id, current_stage, learner_stage_schedules(stage_number, stage_points), ' +
          'vocabularies!inner(expression, reading_kana, meaning_vi, han_viet, emoji, sort_order, is_kana_only, ' +
          'vocabulary_kanji(position, kanji(character, han_viet, meaning_vi)))',
      )
      .eq('user_id', user.id)
      .eq('learning_status', 'learning')
      .gte('current_stage', 3)
      .is('kanji_intro_seen_at', null)
      .eq('vocabularies.is_kana_only', false)
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
  const ready = (r: Row) =>
    r.current_stage === 3 ||
    r.learner_stage_schedules.some((s) => s.stage_number === 4 && reachedKanjiIntro(s.stage_points))
  return ((words.data ?? []) as unknown as Row[])
    .filter((r) => !excludedIds.has(r.vocabulary_id) && ready(r))
    .sort((a, b) => a.vocabularies.sort_order - b.vocabularies.sort_order)
    .slice(0, WORDS_PER_ROUND)
    .map(toItem)
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

/** Xem xong thẻ Giới thiệu Hán tự. Gọi lại nhiều lần vẫn giữ thời điểm đầu. */
export async function completeKanjiIntro(learnerVocabularyId: unknown): Promise<CompleteStage3Response> {
  if (typeof learnerVocabularyId !== 'string' || !UUID.test(learnerVocabularyId)) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('complete_kanji_intro', {
    p_learner_vocabulary_id: learnerVocabularyId,
    p_seen_at: new Date().toISOString(),
  })
  if (error) throw new Error(`complete_kanji_intro lỗi: ${error.message}`)
  return { status: (data as { status: CompleteStage3Response['status'] }).status }
}
