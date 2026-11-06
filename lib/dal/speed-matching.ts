// GAME-01 — Từ cho Speed Matching và lưu từng lượt: chỉ đổi điểm Card, không đổi lịch ôn, lịch Stage hay điểm Stage. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { applyPracticeToCard } from '@/lib/learning/cards'
import { RULES_V4 } from '@/lib/learning/rules'
import { studyDate } from '@/lib/learning/time'
import type { CardType, Outcome } from '@/lib/learning/types'
import { cardTypeFor, isSpeedMode, skillOf, SPEED_MODES, wordsForMode, type SpeedMode, type SpeedModeData, type SpeedWordSource } from '@/lib/speed-matching'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CARD_FIELDS = 'id, card_type, card_points, retired_at, last_review_at, practice_points_today, practice_points_date, version'

type CardRow = {
  id: string
  card_type: CardType
  card_points: number
  retired_at: string | null
  last_review_at: string | null
  practice_points_today: number
  practice_points_date: string | null
  version: number
}

async function readExcluded(supabase: Supabase, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('learner_vocabulary_exclusions').select('vocabulary_id').eq('user_id', userId).not('excluded_at', 'is', null).range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được learner_vocabulary_exclusions: ${error.message}`)
  return new Set(data?.map((r) => r.vocabulary_id))
}

/** Mọi chế độ chơi với số từ của từng chế độ. Từ đã đánh dấu là đã biết không vào game. */
export async function readSpeedModes(supabase: Supabase, userId: string): Promise<SpeedModeData[]> {
  const [excludedIds, rows] = await Promise.all([
    readExcluded(supabase, userId),
    supabase
      .from('learner_vocabulary')
      .select(`vocabulary_id, kanji_intro_seen_at, vocabularies!inner(expression, reading_kana, meaning_vi, han_viet, is_kana_only), review_cards(${CARD_FIELDS})`)
      .eq('user_id', userId)
      .range(0, PAGE - 1),
  ])
  if (rows.error) throw new Error(`Không đọc được learner_vocabulary: ${rows.error.message}`)
  const list = (rows.data ?? []) as unknown as {
    vocabulary_id: string
    kanji_intro_seen_at: string | null
    vocabularies: { expression: string; reading_kana: string; meaning_vi: string; han_viet: string | null; is_kana_only: boolean }
    review_cards: CardRow[]
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
      cards: r.review_cards.map((c) => ({
        type: c.card_type,
        retired: c.retired_at !== null,
        lastReviewAt: c.last_review_at,
        practiceDate: c.practice_points_date,
        practiceToday: c.practice_points_today,
      })),
    }))
  const today = studyDate(new Date())
  return SPEED_MODES.map((mode) => wordsForMode(sources, mode, today, RULES_V4.practice.maxPositivePerCardPerDay))
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
  /** Từ đã bị trừ ở bàn này: vẫn ghi nhật ký nhưng không trừ thêm. */
  noPenalty: string[]
  responseMs: number
  boss: boolean
}

function parseRequest(input: unknown): SpeedPairRequest | null {
  const v = input as Partial<SpeedPairRequest> | null
  if (!v || typeof v.sessionId !== 'string' || !UUID.test(v.sessionId)) return null
  if (!Array.isArray(v.eventIds) || v.eventIds.length !== 2 || !v.eventIds.every((id) => typeof id === 'string' && UUID.test(id))) return null
  if (!isSpeedMode(v.mode)) return null
  if (typeof v.wordId !== 'string' || !UUID.test(v.wordId) || typeof v.meaningId !== 'string' || !UUID.test(v.meaningId)) return null
  if (!Array.isArray(v.noPenalty) || !v.noPenalty.every((id) => typeof id === 'string')) return null
  if (typeof v.responseMs !== 'number' || !Number.isFinite(v.responseMs)) return null
  return { ...(v as SpeedPairRequest), boss: v.boss === true }
}

export type SpeedPairResponse = { status: 'saved' | 'conflict' | 'invalid'; cardPoints: number }

async function saveAttempt(supabase: Supabase, userId: string, req: SpeedPairRequest, vocabularyId: string, eventId: string, outcome: Outcome, canScore: boolean) {
  const { data, error } = await supabase
    .from('learner_vocabulary')
    .select(`kanji_intro_seen_at, vocabularies!inner(is_kana_only), review_cards(${CARD_FIELDS})`)
    .eq('user_id', userId)
    .eq('vocabulary_id', vocabularyId)
    .maybeSingle()
  if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
  // Từ người học chưa gặp thì không thể có trên bàn
  if (!data) return { status: 'invalid' as const, cardPoints: 0 }
  const row = data as unknown as { kanji_intro_seen_at: string | null; vocabularies: { is_kana_only: boolean }; review_cards: CardRow[] }

  const excluded = await readExcluded(supabase, userId)
  const isKanaOnly = row.vocabularies.is_kana_only
  const type = cardTypeFor(req.mode, row.kanji_intro_seen_at !== null && !isKanaOnly)
  const card = row.review_cards.find((c) => c.card_type === type && c.retired_at === null)
  const now = new Date()

  const applied =
    card && canScore && !excluded.has(vocabularyId)
      ? applyPracticeToCard(
          { type, wordIsKanaOnly: isKanaOnly, status: 'active', points: card.card_points, practicePlusToday: card.practice_points_today, practiceDate: card.practice_points_date },
          outcome,
          now,
        )
      : null

  const { data: saved, error: rpcError } = await supabase.rpc('submit_practice_attempt', {
    p_session_id: req.sessionId,
    p_client_event_id: eventId,
    p_vocabulary_id: vocabularyId,
    p_skill_code: skillOf(type),
    p_is_correct: outcome === 'correct',
    p_response_time_ms: Math.max(0, Math.round(req.responseMs)),
    p_study_date: studyDate(now),
    p_settings: { mode: req.mode, boss: req.boss },
    p_review_card_id: applied ? card!.id : null,
    p_expected_version: applied ? card!.version : null,
    p_card_points: applied ? applied.card.points : null,
    p_card_points_delta: applied ? applied.delta : 0,
    p_practice_today: applied ? applied.card.practicePlusToday : null,
    p_retire: applied ? applied.retiredNow : false,
  })
  if (rpcError) throw new Error(`submit_practice_attempt lỗi: ${rpcError.message}`)
  const status = (saved as { status: string }).status
  if (status === 'conflict') return { status: 'conflict' as const, cardPoints: 0 }
  return { status: 'saved' as const, cardPoints: status === 'saved' && applied ? applied.delta : 0 }
}

/** Ghép đúng: +1 cho Card của từ đó. Ghép sai: −1 cho Card của cả 2 từ. Đúng hay sai do server so sánh. */
export async function submitSpeedPair(input: unknown): Promise<SpeedPairResponse> {
  const req = parseRequest(input)
  if (!req) return { status: 'invalid', cardPoints: 0 }
  const user = await requireUser()
  const supabase = await createClient()

  const attempts: { id: string; event: string; outcome: Outcome; canScore: boolean }[] =
    req.wordId === req.meaningId
      ? [{ id: req.wordId, event: req.eventIds[0], outcome: 'correct', canScore: true }]
      : [
          { id: req.wordId, event: req.eventIds[0], outcome: 'wrong', canScore: !req.noPenalty.includes(req.wordId) },
          { id: req.meaningId, event: req.eventIds[1], outcome: 'wrong', canScore: !req.noPenalty.includes(req.meaningId) },
        ]

  let cardPoints = 0
  for (const attempt of attempts) {
    const result = await saveAttempt(supabase, user.id, req, attempt.id, attempt.event, attempt.outcome, attempt.canScore)
    // Gửi lại an toàn: lượt đã lưu trả về duplicate, không cộng hai lần
    if (result.status !== 'saved') return { status: result.status, cardPoints }
    cardPoints += result.cardPoints
  }
  return { status: 'saved', cardPoints }
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
