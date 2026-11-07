// Kỹ năng Từ Kanji: tự nhớ mặt chữ của từ. Từ mở khi đã xong Stage 2 và đã học xong mọi chữ trong từ. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readSkillLevels } from '@/lib/dal/skill-levels'
import { inLevel, nextLevel } from '@/lib/learn/levels'
import { RULES_V4 } from '@/lib/learning/rules'
import { studyDate } from '@/lib/learning/time'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Thẻ Kanji của từ: cả từ, rồi từng chữ. */
export interface KanjiIntroWord {
  kind: 'kanji'
  learnerVocabularyId: string
  vocabularyId: string
  reading: string
  expression: string
  hanViet: string
  meaning: string
  /** Từng chữ trong từ, không lặp: 学: HỌC, 校: HIỆU. */
  parts: { character: string; hanViet: string; meaning: string }[]
}

type WordRow = {
  id: string
  vocabulary_id: string
  vocabularies: {
    expression: string
    reading_kana: string
    meaning_vi: string
    han_viet: string | null
    sort_order: number
    is_kana_only: boolean
    jlpt_level: number
    vocabulary_kanji: { position: number; kanji_id: string; kanji: { character: string; han_viet: string; meaning_vi: string } }[]
  }
  learner_stage_schedules: { stage_number: number; completed_at: string | null }[]
}

/** Chữ đã xong giai đoạn Học, hoặc đã đánh dấu là đã biết. */
async function readLearnedKanji(supabase: Supabase, userId: string): Promise<Set<string>> {
  const [learned, known] = await Promise.all([
    supabase.from('learner_kanji').select('kanji_id').eq('user_id', userId).eq('phase', 'review').range(0, PAGE - 1),
    supabase.from('learner_kanji_exclusions').select('kanji_id').eq('user_id', userId).range(0, PAGE - 1),
  ])
  if (learned.error) throw new Error(`Không đọc được learner_kanji: ${learned.error.message}`)
  if (known.error) throw new Error(`Không đọc được learner_kanji_exclusions: ${known.error.message}`)
  return new Set([...(learned.data ?? []), ...(known.data ?? [])].map((r) => r.kanji_id))
}

async function readWords(supabase: Supabase, userId: string): Promise<WordRow[]> {
  const rows: WordRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('learner_vocabulary')
      .select(
        'id, vocabulary_id, learner_stage_schedules(stage_number, completed_at), ' +
          'vocabularies!inner(expression, reading_kana, meaning_vi, han_viet, sort_order, is_kana_only, jlpt_level, vocabulary_kanji(position, kanji_id, kanji(character, han_viet, meaning_vi)))',
      )
      .eq('user_id', userId)
      .eq('vocabularies.is_kana_only', false)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
    rows.push(...((data ?? []) as unknown as WordRow[]))
    if ((data?.length ?? 0) < PAGE) return rows
  }
}

async function readExcluded(supabase: Supabase, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('learner_vocabulary_exclusions').select('vocabulary_id').eq('user_id', userId).not('excluded_at', 'is', null).range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${error.message}`)
  return new Set(data?.map((r) => r.vocabulary_id))
}

function toIntro(row: WordRow): KanjiIntroWord {
  const v = row.vocabularies
  const seen = new Set<string>()
  const parts = [...v.vocabulary_kanji]
    .sort((a, b) => a.position - b.position)
    .filter(({ kanji }) => !seen.has(kanji.character) && Boolean(seen.add(kanji.character)))
    .map(({ kanji }) => ({ character: kanji.character, hanViet: kanji.han_viet, meaning: kanji.meaning_vi }))
  return {
    kind: 'kanji',
    learnerVocabularyId: row.id,
    vocabularyId: row.vocabulary_id,
    reading: v.reading_kana,
    expression: v.expression,
    hanViet: v.han_viet ?? '',
    meaning: v.meaning_vi,
    parts,
  }
}

const doneStage2 = (row: WordRow) => row.learner_stage_schedules.some((s) => s.stage_number === 2 && s.completed_at !== null)
const opened = (row: WordRow) => row.learner_stage_schedules.some((s) => s.stage_number === 4)

/** Từ đủ điều kiện mở trong cấp đang học, theo thứ tự lộ trình. */
export async function readEligibleWords(supabase: Supabase, userId: string): Promise<KanjiIntroWord[]> {
  const [rows, learned, excluded, levels] = await Promise.all([
    readWords(supabase, userId),
    readLearnedKanji(supabase, userId),
    readExcluded(supabase, userId),
    readSkillLevels(supabase, userId),
  ])
  return rows
    .filter((row) => !excluded.has(row.vocabulary_id) && !opened(row) && doneStage2(row) && inLevel(row.vocabularies.jlpt_level, levels.word_kanji))
    .filter((row) => row.vocabularies.vocabulary_kanji.length > 0 && row.vocabularies.vocabulary_kanji.every((link) => learned.has(link.kanji_id)))
    .sort((a, b) => a.vocabularies.sort_order - b.vocabularies.sort_order)
    .map(toIntro)
}

export interface WordKanjiOverview {
  questionsToday: number
  /** Từ đã đủ điều kiện, chờ xem thẻ. */
  waiting: number
  completed: number
  inProgress: number
  /** Từ đã xong Stage 2 nhưng còn chờ học chữ. */
  waitingForKanji: number
  total: number
  cap: number
  answeredToday: number
  level: number
  /** Cấp sau có thể mở; null khi chưa hết việc của cấp này hoặc không còn cấp. */
  nextLevel: number | null
}

export async function getWordKanjiOverview(): Promise<WordKanjiOverview> {
  const user = await requireUser()
  const supabase = await createClient()
  const now = new Date()
  const [rows, learned, excluded, levels, settings, answered, totals, due] = await Promise.all([
    readWords(supabase, user.id),
    readLearnedKanji(supabase, user.id),
    readExcluded(supabase, user.id),
    readSkillLevels(supabase, user.id),
    supabase.from('learner_settings').select('word_kanji_cap').eq('user_id', user.id).maybeSingle(),
    supabase.from('exercise_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('study_date', studyDate(now)).eq('source', 'lesson').in('stage_number', [4, 6]),
    supabase.from('vocabularies').select('id, jlpt_level').eq('is_kana_only', false).range(0, 1999),
    supabase
      .from('learner_stage_schedules')
      .select('learner_vocabulary!inner(vocabulary_id)')
      .eq('user_id', user.id)
      .in('stage_number', [4, 6])
      .is('completed_at', null)
      .lte('due_at', now.toISOString())
      .range(0, PAGE - 1),
  ])
  if (settings.error) throw new Error(`Không đọc được learner_settings: ${settings.error.message}`)
  if (answered.error) throw new Error(`Không đọc được exercise_logs: ${answered.error.message}`)
  if (totals.error) throw new Error(`Không đọc được vocabularies: ${totals.error.message}`)
  if (due.error) throw new Error(`Không đọc được learner_stage_schedules: ${due.error.message}`)

  const active = rows.filter((row) => !excluded.has(row.vocabulary_id))
  const cap = settings.data?.word_kanji_cap ?? RULES_V4.defaults.wordKanjiCap
  const answeredToday = answered.count ?? 0
  const dueCount = ((due.data ?? []) as unknown as { learner_vocabulary: { vocabulary_id: string } }[]).filter((r) => !excluded.has(r.learner_vocabulary.vocabulary_id)).length
  const allLearned = (row: WordRow) => row.vocabularies.vocabulary_kanji.every((link) => learned.has(link.kanji_id))
  const level = levels.word_kanji
  const eligible = active.filter((row) => !opened(row) && doneStage2(row) && allLearned(row) && inLevel(row.vocabularies.jlpt_level, level))
  const waitingForKanji = active.filter((row) => !opened(row) && doneStage2(row) && !allLearned(row)).length
  // Học xong từ mới của cấp: mọi từ của cấp đã mở, hoặc còn chờ chữ ở cấp sau
  const levelWords = (totals.data ?? []).filter((v) => v.jlpt_level === level)
  const openedIds = new Set(active.filter(opened).map((row) => row.vocabulary_id))
  const levelDone = levelWords.length > 0 && levelWords.every((v) => openedIds.has(v.id) || excluded.has(v.id))
  return {
    questionsToday: Math.min(dueCount, Math.max(0, cap - answeredToday)),
    waiting: eligible.length,
    completed: active.filter((row) => row.learner_stage_schedules.some((s) => s.stage_number === 6 && s.completed_at !== null)).length,
    inProgress: active.filter((row) => opened(row) && !row.learner_stage_schedules.some((s) => s.stage_number === 6 && s.completed_at !== null)).length,
    waitingForKanji,
    total: (totals.data ?? []).filter((v) => !excluded.has(v.id)).length,
    cap,
    answeredToday,
    level,
    nextLevel: levelDone ? nextLevel(level, (totals.data ?? []).map((v) => v.jlpt_level)) : null,
  }
}

export interface OpenWordKanjiResponse {
  status: 'saved' | 'invalid' | 'not_found'
}

/** Xem xong thẻ Kanji của từ: mở Stage 4. Gọi lại nhiều lần cũng chỉ áp dụng một lần. */
export async function openWordKanji(learnerVocabularyId: unknown): Promise<OpenWordKanjiResponse> {
  if (typeof learnerVocabularyId !== 'string' || !UUID.test(learnerVocabularyId)) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('open_word_kanji', { p_learner_vocabulary_id: learnerVocabularyId, p_seen_at: new Date().toISOString() })
  if (error) throw new Error(`open_word_kanji lỗi: ${error.message}`)
  return { status: (data as OpenWordKanjiResponse).status }
}
