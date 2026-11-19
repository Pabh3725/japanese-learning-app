// UI-01, FUN-01 — Số liệu thật cho Progress, thanh bên và khối tổng kết hôm nay ở màn kết thúc phiên, đọc từ nhật ký. Server-only.
import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { addStudyDays, studyDate } from '@/lib/learning/time'
import { currentStreak, lastSevenDays, weekdayLabel } from '@/lib/learning/streak'
import type { StudyDate } from '@/lib/learning/types'
import { readAllPages } from '@/lib/dal/pages'
import { computeRetention, type RetentionEntry, type RetentionStats } from '@/lib/srs/retention'
import { readV12Content } from '@/lib/dal/v12/content'
import { readV12State } from '@/lib/dal/v12/state'

type Supabase = Awaited<ReturnType<typeof createClient>>

const PAGE = 1000
const RETENTION_DAYS = 30

async function readStreakUncached(supabase: Supabase, userId: string, today: StudyDate) {
  // Mỗi ngày có đúng một câu học day_seq = 1, nên chỉ đọc một dòng cho mỗi ngày
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('study_date')
    .eq('user_id', userId)
    .eq('source', 'lesson')
    .eq('day_seq', 1)
    .range(0, PAGE - 1)
  if (error) throw new Error(`Không đọc được exercise_logs: ${error.message}`)
  const days = new Set<StudyDate>(data?.map((r) => r.study_date))

  // Review, Kanji và V12 không ghi day_seq: đọc từ mới về cũ, dừng khi đã qua chỗ chuỗi đứt
  for (const table of ['review_logs', 'kanji_logs', 'item_logs'] as const) {
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error: logError } = await supabase
        .from(table)
        .select('study_date')
        .eq('user_id', userId)
        .not('study_date', 'is', null)
        .order('study_date', { ascending: false })
        .range(from, from + PAGE - 1)
      if (logError) throw new Error(`Không đọc được ${table}: ${logError.message}`)
      for (const row of rows ?? []) days.add(row.study_date as StudyDate)
      const oldest = rows?.at(-1)?.study_date as StudyDate | undefined
      if (!oldest || (rows?.length ?? 0) < PAGE) break
      if (oldest < addStudyDays(today, -(currentStreak(days, today) + 1))) break
    }
  }
  return { streak: currentStreak(days, today), studiedToday: days.has(today) }
}

// Khử trùng trong một render pass (React cache, khóa theo client + userId); kết quả dùng chung nên caller không được sửa nó.
const readStreak = cache(readStreakUncached)

export async function getStudyStreak(): Promise<{ streak: number; studiedToday: boolean }> {
  const user = await requireUser()
  const supabase = await createClient()
  return readStreak(supabase, user.id, studyDate(new Date()))
}

/** Đếm số câu theo ngày: câu học, câu ôn, câu Kanji (V11) và câu của bộ thẻ V12. */
async function addCountsByDay(supabase: Supabase, table: 'exercise_logs' | 'review_logs' | 'kanji_logs' | 'item_logs', userId: string, since: StudyDate, counts: Map<StudyDate, number>) {
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select('study_date').eq('user_id', userId).gte('study_date', since).order('id').range(from, from + PAGE - 1)
    if (table === 'exercise_logs') query = query.eq('source', 'lesson')
    const { data, error } = await query
    if (error) throw new Error(`Không đọc được ${table}: ${error.message}`)
    for (const row of data ?? []) {
      const day = row.study_date as StudyDate
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    if ((data?.length ?? 0) < PAGE) return
  }
}

/**
 * V11: lần ôn để tính tỷ lệ nhớ thật. Card Từ vựng / Từ vựng Kanji: review_logs có state_before = 2 (đang ở giai đoạn ôn).
 * Card Kanji: kanji_logs của Card (kanji_logs không lưu trạng thái trước; lấy lần đầu mỗi ngày).
 */
async function readRetention(supabase: Supabase, userId: string, since: StudyDate): Promise<RetentionStats> {
  const [cards, kanji, items] = await Promise.all([
    readAllPages('review_logs', (from, to) =>
      supabase
        .from('review_logs')
        .select('review_card_id, rating, study_date, reviewed_at, review_cards!inner(card_type)')
        .eq('user_id', userId)
        .eq('state_before', 2)
        .gte('study_date', since)
        .order('id')
        .range(from, to),
    ),
    readAllPages('kanji_logs', (from, to) =>
      supabase
        .from('kanji_logs')
        .select('learner_kanji_card_id, outcome, study_date, answered_at')
        .eq('user_id', userId)
        .not('learner_kanji_card_id', 'is', null)
        .gte('study_date', since)
        .order('id')
        .range(from, to),
    ),
    // V12: lần ôn Card đang ở giai đoạn ôn (state_before = 2)
    readAllPages('item_logs', (from, to) =>
      supabase
        .from('item_logs')
        .select('item_card_id, area, correct, study_date, answered_at')
        .eq('user_id', userId)
        .eq('stage', 'review')
        .eq('state_before', 2)
        .not('item_card_id', 'is', null)
        .gte('study_date', since)
        .order('id')
        .range(from, to),
    ),
  ])
  const entries: RetentionEntry[] = [
    ...(cards as unknown as { review_card_id: string; rating: number; study_date: string; reviewed_at: string; review_cards: { card_type: string } }[]).map((r) => ({
      area: r.review_cards.card_type === 'vocab.kanji' ? ('kanji_words' as const) : ('vocabulary' as const),
      cardId: r.review_card_id,
      date: r.study_date,
      at: r.reviewed_at,
      recalled: r.rating > 1,
    })),
    ...(kanji as unknown as { learner_kanji_card_id: string; outcome: string; study_date: string; answered_at: string }[]).map((r) => ({
      area: 'kanji' as const,
      cardId: r.learner_kanji_card_id,
      date: r.study_date,
      at: r.answered_at,
      recalled: r.outcome !== 'wrong',
    })),
    ...(items as unknown as { item_card_id: string; area: string; correct: boolean; study_date: string; answered_at: string }[]).map((r) => ({
      area: r.area === 'kana' ? ('vocabulary' as const) : r.area === 'word_kanji' ? ('kanji_words' as const) : ('kanji' as const),
      cardId: r.item_card_id,
      date: r.study_date,
      at: r.answered_at,
      recalled: r.correct,
    })),
  ]
  return computeRetention(entries)
}

export interface ProgressStats {
  streak: number
  /** V11: tỷ lệ nhớ thật trong 30 ngày (chỉ lần ôn đầu mỗi ngày của Card đang ở giai đoạn ôn), tách theo khu. */
  retention: RetentionStats
  week: { date: StudyDate; label: string; answered: number }[]
}

export async function getProgressStats(): Promise<ProgressStats> {
  const user = await requireUser()
  const supabase = await createClient()
  const today = studyDate(new Date())
  const week = lastSevenDays(today)
  const counts = new Map<StudyDate, number>()
  const since = addStudyDays(today, -RETENTION_DAYS)
  const [streak, retention] = await Promise.all([
    readStreak(supabase, user.id, today),
    readRetention(supabase, user.id, since),
    addCountsByDay(supabase, 'exercise_logs', user.id, week[0], counts),
    addCountsByDay(supabase, 'review_logs', user.id, week[0], counts),
    addCountsByDay(supabase, 'kanji_logs', user.id, week[0], counts),
    addCountsByDay(supabase, 'item_logs', user.id, week[0], counts),
  ])
  return {
    streak: streak.streak,
    retention,
    week: week.map((date) => ({ date, label: weekdayLabel(date), answered: counts.get(date) ?? 0 })),
  }
}

export interface LevelProgress {
  /** Từ vựng Kana theo cấp: đã có Card hoặc đã biết / tổng số từ của cấp. */
  levels: { level: 'N5' | 'N4'; completed: number; total: number }[]
  /** Mục đang học Stage ở cả ba khu. */
  inProgress: number
  /** Card V12 (kể cả đã lưu trữ). */
  cards: number
}

/** V12 (gói 4): tiến độ theo cấp cho trang Progress, đọc từ bảng mới. */
export async function getLevelProgress(): Promise<LevelProgress> {
  const user = await requireUser()
  const supabase = await createClient()
  const [content, state] = await Promise.all([readV12Content(supabase), readV12State(supabase, user.id)])
  const done = new Set([...state.knownWords, ...state.items.filter((i) => i.area === 'kana' && i.stage === 'review').map((i) => i.ref)])
  const levels = ([5, 4] as const).map((n) => {
    const words = content.words.filter((w) => w.level === n)
    return { level: `N${n}` as 'N5' | 'N4', completed: words.filter((w) => done.has(w.id)).length, total: words.length }
  })
  return { levels, inProgress: state.items.filter((i) => !i.known && i.stage !== 'review').length, cards: state.cards.length }
}
