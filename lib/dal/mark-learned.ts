// Đánh dấu "đã học" (chủ dự án yêu cầu 2026-11-12). Server-only.
//   Từ vựng (V12): mục Kana sang Card; thêm mục Từ vựng Kanji khi từ có dạng Kanji học được.
//   Ngữ pháp: mẫu tính là học xong; có ôn (Card FSRS, lần đầu từ ngày mai) hoặc không ôn (lưu trữ, khôi phục được).
// Lần ôn đầu rải từ ngày mai để Review không dồn một ngày.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readV12Content } from '@/lib/dal/v12/content'
import { newReviewSchedule } from '@/lib/grammar/rules'
import { nextStudyDayStart } from '@/lib/learning/time'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY_MS = 86_400_000
/** Card mới tối đa mỗi ngày khi rải lần ôn đầu. */
const NEW_CARDS_PER_DAY = 20

/** Ngày ôn đầu của Card thứ i: từ 00:00 ngày mai, mỗi ngày tối đa NEW_CARDS_PER_DAY Card. */
export function spreadDue(i: number, now: Date, perDay = NEW_CARDS_PER_DAY): Date {
  return new Date(nextStudyDayStart(now).getTime() + Math.floor(i / perDay) * DAY_MS)
}

/**
 * V12 (gói 4): mục Kana của từ sang Card (2 Card Kana), và mục Từ vựng Kanji (1 Card) khi từ có dạng Kanji học được.
 * Card đã có giữ nguyên lịch; lần ôn đầu của Card mới rải từ ngày mai.
 */
export async function markWordsLearned(input: unknown): Promise<{ status: 'saved' | 'invalid'; marked?: number }> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 1000 || !input.every((x) => typeof x === 'string' && UUID.test(x))) return { status: 'invalid' }
  const ids = new Set(input as string[])
  await requireUser()
  const supabase = await createClient()
  const content = await readV12Content(supabase)
  const withKanji = new Set(content.wordKanji.map((w) => w.id))
  const now = new Date()
  let card = 0
  const items = content.words
    .filter((w) => ids.has(w.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((w) => {
      const kanji = withKanji.has(w.id)
      // Hai Card Kana cùng ngày; Card Từ vựng Kanji tính riêng
      const kanaDue = spreadDue(card, now)
      card += 2
      const kanjiDue = kanji ? spreadDue(card++, now) : null
      return { vocabulary_id: w.id, word_kanji: kanji, kana_due: kanaDue.toISOString(), kanji_due: kanjiDue?.toISOString() ?? null }
    })
  const { data, error } = await supabase.rpc('v12_mark_words_learned', { p_items: items, p_at: now.toISOString() })
  if (error) throw new Error(`v12_mark_words_learned lỗi: ${error.message}`)
  return { status: 'saved', marked: (data as { marked: number }).marked }
}

/** V12: hoàn tác "Mark as learned" của các từ (lần đánh dấu V12 gần nhất của mỗi từ). */
export async function undoWordsLearned(input: unknown): Promise<{ status: 'saved' | 'invalid'; undone?: number }> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 1000 || !input.every((x) => typeof x === 'string' && UUID.test(x))) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('v12_undo_mark_words_learned', { p_vocabulary_ids: [...new Set(input as string[])] })
  if (error) throw new Error(`v12_undo_mark_words_learned lỗi: ${error.message}`)
  return { status: 'saved', undone: (data as { undone: number }).undone }
}

/** Cột của learner_grammar được lưu lại trước khi đánh dấu, để hoàn tác (V10). */
const GRAMMAR_RESTORE_COLUMNS = ['phase', 'points', 'state', 'due_at', 'stability', 'difficulty', 'scheduled_days', 'learning_steps', 'reps', 'lapses', 'last_review_at', 'completed_at', 'archived_at'] as const

/** Ngữ pháp: đánh dấu học xong các mẫu đã duyệt. review = false thì lưu trữ (không có lịch ôn). */
export async function markGrammarLearned(input: unknown): Promise<{ status: 'saved' | 'invalid'; marked?: number }> {
  const v = (input ?? {}) as { codes?: unknown; review?: unknown }
  if (!Array.isArray(v.codes) || v.codes.length === 0 || v.codes.length > 300 || !v.codes.every((c) => typeof c === 'string' && /^g\d{2}-\d{2}$/.test(c)) || typeof v.review !== 'boolean') return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const { data: points, error } = await supabase.from('grammar_points').select('id, code, lesson, sort_order').in('code', v.codes as string[])
  if (error) throw new Error(`Không đọc được grammar_points: ${error.message}`)
  const { data: existing, error: e2 } = await supabase.from('learner_grammar').select('id, point_id, version, phase, points, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, completed_at, archived_at').eq('user_id', user.id)
  if (e2) throw new Error(`Không đọc được learner_grammar: ${e2.message}`)
  const byPoint = new Map((existing ?? []).map((r) => [r.point_id as string, r]))
  const now = new Date()
  const sorted = (points ?? []).sort((a, b) => a.lesson - b.lesson || a.sort_order - b.sort_order)
  let marked = 0
  for (const [i, p] of sorted.entries()) {
    const cur = byPoint.get(p.id)
    // V10: lưu trạng thái trước khi đánh dấu, để hoàn tác
    const before = cur ? Object.fromEntries(GRAMMAR_RESTORE_COLUMNS.map((c) => [c, (cur as unknown as Record<string, unknown>)[c]])) : { new: true }
    const { error: he } = await supabase.from('learner_mark_history').insert({ user_id: user.id, kind: 'grammar', item_id: p.id, before, marked_at: now.toISOString() })
    if (he) throw new Error(`Không ghi được learner_mark_history: ${he.message}`)
    // Mẫu đã ở giai đoạn Ôn: chỉ đổi lưu trữ theo lựa chọn
    if (cur?.phase === 'review') {
      const { error: up } = await supabase.from('learner_grammar').update({ archived_at: v.review ? null : now.toISOString(), version: cur.version + 1 }).eq('id', cur.id).eq('user_id', user.id)
      if (up) throw new Error(`Không lưu được learner_grammar: ${up.message}`)
      marked++
      continue
    }
    const s = newReviewSchedule(now)
    const row = {
      phase: 'review',
      points: 40,
      state: s.state,
      due_at: spreadDue(i, now).toISOString(),
      stability: s.stability,
      difficulty: s.difficulty,
      scheduled_days: 0,
      learning_steps: s.learningSteps,
      reps: s.reps,
      lapses: s.lapses,
      last_review_at: null,
      completed_at: now.toISOString(),
      archived_at: v.review ? null : now.toISOString(),
    }
    const { error: we } = cur
      ? await supabase.from('learner_grammar').update({ ...row, version: cur.version + 1 }).eq('id', cur.id).eq('user_id', user.id)
      : await supabase.from('learner_grammar').insert({ ...row, user_id: user.id, point_id: p.id })
    if (we && we.code !== '23505') throw new Error(`Không lưu được learner_grammar: ${we.message}`)
    marked++
  }
  return { status: 'saved', marked }
}

/** V10: hoàn tác lần đánh dấu gần nhất của từng mẫu (đã học, hoặc đã biết không ôn): trả learner_grammar về như trước. */
export async function undoGrammarLearned(input: unknown): Promise<{ status: 'saved' | 'invalid'; undone?: number }> {
  const v = (input ?? {}) as { codes?: unknown }
  if (!Array.isArray(v.codes) || v.codes.length === 0 || v.codes.length > 300 || !v.codes.every((c) => typeof c === 'string' && /^g\d{2}-\d{2}$/.test(c))) return { status: 'invalid' }
  await requireUser()
  const supabase = await createClient()
  const { data: points, error } = await supabase.from('grammar_points').select('id').in('code', v.codes as string[])
  if (error) throw new Error(`Không đọc được grammar_points: ${error.message}`)
  const { data, error: re } = await supabase.rpc('undo_mark_grammar_learned', { p_point_ids: (points ?? []).map((p) => p.id) })
  if (re) throw new Error(`undo_mark_grammar_learned lỗi: ${re.message}`)
  return { status: 'saved', undone: (data as { undone: number }).undone }
}
