// Grammar — chọn dạng bài và câu gốc (§8). Pure.
import { buildQuestion, type GrammarQuestion, type SentenceRow } from './questions'
import { exercisesUpTo, GRAMMAR_V1, type Tier } from './rules'
import { EXERCISE_TIER, GRAMMAR_EXERCISES, type GrammarExercise } from './types'

type Rng = () => number

const DAY_MS = 86_400_000

/** Dạng một mẫu làm được: có ít nhất một câu dựng được câu hỏi dạng đó. */
export function availableExercises(sentences: readonly SentenceRow[]): GrammarExercise[] {
  return GRAMMAR_EXERCISES.filter((e) => sentences.some((s) => [1, 2, 3].some((seed) => buildQuestion(s, e, sentences, seed) !== null)))
}

/** Một câu đã hỏi của mẫu, mới nhất trước. */
export interface ExerciseHistory {
  exercise: GrammarExercise
  correct: boolean
}

/**
 * Chọn dạng theo độ thiếu: mong muốn chia đều cho các dạng hợp lệ (dạng của bậc hiện tại ×1,5, dạng hay sai ×1,5),
 * trừ phần đã hỏi. Không lặp dạng của câu ngay trước (`avoid`) khi còn dạng khác.
 * `tier` null: Ôn / Luyện thêm, mọi dạng hợp lệ.
 */
export function chooseExercise(available: readonly GrammarExercise[], tier: Tier | null, history: readonly ExerciseHistory[], avoid: GrammarExercise | null, rng: Rng, allowed?: readonly GrammarExercise[]): GrammarExercise | null {
  const { currentTierWeight, weakTypeWeight, weakTypeErrorRate, weakWindow } = GRAMMAR_V1.pick
  let pool = tier === null ? [...available] : exercisesUpTo(tier, available)
  if (allowed) pool = pool.filter((e) => allowed.includes(e))
  if (pool.length === 0) return null
  if (pool.length > 1 && avoid) pool = pool.filter((e) => e !== avoid)

  const weight = (e: GrammarExercise) => {
    let w = 1
    if (tier !== null && EXERCISE_TIER[e] === tier) w *= currentTierWeight
    const recent = history.filter((h) => h.exercise === e).slice(0, weakWindow)
    if (recent.length > 0 && recent.filter((h) => !h.correct).length / recent.length >= weakTypeErrorRate) w *= weakTypeWeight
    return w
  }
  const total = pool.reduce((sum, e) => sum + weight(e), 0)
  const asked = history.filter((h) => pool.includes(h.exercise))
  const deficit = (e: GrammarExercise) => (weight(e) / total) * (asked.length + 1) - asked.filter((h) => h.exercise === e).length
  const best = Math.max(...pool.map(deficit))
  const top = pool.filter((e) => Math.abs(deficit(e) - best) < 1e-9)
  return top[Math.floor(rng() * top.length)]
}

/** Mức câu theo bậc khi Học (§6.2); Ôn ưu tiên mức 2–3; Kiểm tra chỉ mức 3. */
export function levelsFor(mode: 'learning' | 'review' | 'practice' | 'test', tier: Tier | null): readonly number[] {
  if (mode === 'test') return [3]
  if (mode === 'review') return [3, 2]
  if (mode === 'practice') return [1, 2, 3]
  return tier === 3 ? [2, 3] : tier === 2 ? [1, 2] : [1]
}

/**
 * Chọn câu gốc cho dạng đã chọn: đúng mức, dựng được câu hỏi, các mẫu kết hợp (`uses`) đều đã học hoặc đang học;
 * trong số đó lấy câu lâu chưa gặp nhất, không lặp câu trong 7 ngày nếu còn câu khác.
 * `lastSeen`: id câu → thời điểm gặp gần nhất. Trả câu hỏi đã dựng (kèm seed).
 */
export function chooseQuestion(
  sentences: readonly SentenceRow[],
  exercise: GrammarExercise,
  levels: readonly number[],
  known: ReadonlySet<string>,
  lastSeen: ReadonlyMap<string, number>,
  now: number,
  rng: Rng,
  exclude: ReadonlySet<string> = new Set(),
): GrammarQuestion | null {
  const usable = sentences.filter((s) => !s.hidden && !exclude.has(s.id) && (s.uses ?? []).every((u) => known.has(u)))
  // Thử theo thứ tự mức ưu tiên, rồi mọi mức (mẫu ít câu ở mức đó vẫn hỏi được)
  for (const pool of [...levels.map((lv) => usable.filter((s) => s.level === lv)), usable]) {
    const ranked = [...pool].sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0) || rng() - 0.5)
    const fresh = ranked.filter((s) => now - (lastSeen.get(s.id) ?? 0) >= GRAMMAR_V1.pick.sentenceCooldownDays * DAY_MS)
    for (const s of fresh.length ? fresh : ranked) {
      const q = buildQuestion(s, exercise, sentences, Math.floor(rng() * 2 ** 31))
      if (q) return q
    }
  }
  return null
}
