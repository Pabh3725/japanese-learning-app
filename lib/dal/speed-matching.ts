// GAME-01 — Từ cho Speed Matching và lưu từng lượt. Chỉ ôn vui: không đổi điểm và lịch nào. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { studyDate } from '@/lib/learning/time'
import { isSpeedMode, skillOf, SPEED_MODES, wordsForMode, type SpeedMode, type SpeedModeData, type SpeedWordSource } from '@/lib/speed-matching'
import { readAllPages } from '@/lib/dal/pages'
import { readKnownWordIds } from '@/lib/dal/known-words'

type Supabase = Awaited<ReturnType<typeof createClient>>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function readExcluded(supabase: Supabase, userId: string): Promise<Set<string>> {
  return readKnownWordIds(supabase, userId)
}

/** Mọi chế độ chơi với số từ của từng chế độ. Từ đã đánh dấu là đã biết không vào game. */
export async function readSpeedModes(supabase: Supabase, userId: string): Promise<SpeedModeData[]> {
  const [excludedIds, rows] = await Promise.all([
    readExcluded(supabase, userId),
    readAllPages('learner_vocabulary', (from, to) =>
      supabase
        .from('learner_vocabulary')
        .select('vocabulary_id, kanji_intro_seen_at, vocabularies!inner(expression, reading_kana, meaning_vi, han_viet, is_kana_only), review_cards(last_review_at)')
        .eq('user_id', userId)
        .order('id')
        .range(from, to),
    ),
  ])
  const list = rows as unknown as {
    vocabulary_id: string
    kanji_intro_seen_at: string | null
    vocabularies: { expression: string; reading_kana: string; meaning_vi: string; han_viet: string | null; is_kana_only: boolean }
    review_cards: { last_review_at: string | null }[]
  }[]
  const sources: SpeedWordSource[] = list
    .filter((r) => !excludedIds.has(r.vocabulary_id))
    .map((r) => ({
      id: r.vocabulary_id,
      expression: r.vocabularies.expression,
      kana: r.vocabularies.reading_kana,
      meaning: r.vocabularies.meaning_vi,
      hanViet: r.vocabularies.han_viet,
      isKanaOnly: r.vocabularies.is_kana_only,
      kanjiSeen: r.kanji_intro_seen_at !== null,
      lastReviewAt: r.review_cards.map((c) => c.last_review_at).filter((at): at is string => at !== null).sort().at(-1) ?? null,
    }))
  return SPEED_MODES.map((mode) => wordsForMode(sources, mode))
}

export async function getSpeedModes(): Promise<SpeedModeData[]> {
  const user = await requireUser()
  const supabase = await createClient()
  return readSpeedModes(supabase, user.id)
}

export interface SpeedPairRequest {
  sessionId: string
  /** Hai mã: ghép sai ghi cho cả 2 từ. */
  eventIds: [string, string]
  mode: SpeedMode
  /** Từ của ô chữ và từ của ô nghĩa. Trùng nhau là ghép đúng. */
  wordId: string
  meaningId: string
  responseMs: number
  boss: boolean
}

function parseRequest(input: unknown): SpeedPairRequest | null {
  const v = input as Partial<SpeedPairRequest> | null
  if (!v || typeof v.sessionId !== 'string' || !UUID.test(v.sessionId)) return null
  if (!Array.isArray(v.eventIds) || v.eventIds.length !== 2 || !v.eventIds.every((id) => typeof id === 'string' && UUID.test(id))) return null
  if (!isSpeedMode(v.mode)) return null
  if (typeof v.wordId !== 'string' || !UUID.test(v.wordId) || typeof v.meaningId !== 'string' || !UUID.test(v.meaningId)) return null
  if (typeof v.responseMs !== 'number' || !Number.isFinite(v.responseMs)) return null
  return { ...(v as SpeedPairRequest), boss: v.boss === true }
}

export type SpeedPairResponse = { status: 'saved' | 'invalid' }

/** Game chỉ để ôn vui: ghi nhật ký từng lượt, không đổi điểm và lịch nào. */
export async function submitSpeedPair(input: unknown): Promise<SpeedPairResponse> {
  const req = parseRequest(input)
  if (!req) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const correct = req.wordId === req.meaningId
  const attempts = correct
    ? [{ id: req.wordId, event: req.eventIds[0] }]
    : [{ id: req.wordId, event: req.eventIds[0] }, { id: req.meaningId, event: req.eventIds[1] }]
  for (const attempt of attempts) {
    const { error } = await supabase.rpc('submit_practice_attempt', {
      p_session_id: req.sessionId,
      p_client_event_id: attempt.event,
      p_vocabulary_id: attempt.id,
      p_skill_code: skillOf(req.mode),
      p_is_correct: correct,
      p_response_time_ms: Math.max(0, Math.round(req.responseMs)),
      p_study_date: studyDate(new Date()),
      p_settings: { mode: req.mode, boss: req.boss },
    })
    if (error) throw new Error(`submit_practice_attempt lỗi: ${error.message}`)
  }
  return { status: 'saved' }
}

/** Ghi điểm khi hết giờ. Chưa có lượt nào thì chưa có phiên, không có gì để ghi. */
export async function finishSpeedSession(sessionId: unknown, score: unknown): Promise<void> {
  if (typeof sessionId !== 'string' || !UUID.test(sessionId) || !Number.isInteger(score) || (score as number) < 0) return
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from('practice_sessions')
    .update({ score: score as number, ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)
  if (error) throw new Error(`Không ghi được practice_sessions: ${error.message}`)
}
