// V9 R11 — Adaptive Interleaving Scheduler: chọn câu kế tiếp trong một bài Learn. Pure.
// Luật: docs/learning-rules.md §14. AIS chỉ quyết định THỨ TỰ câu; điểm do R3, lịch do lịch Stage / lịch Kanji quyết định.
//
// Một bài có danh sách ứng viên chụp lúc bắt đầu (mục đến hẹn, mục mới còn trong quota). Sau mỗi bước, server gọi
// applyResult / applyIntro rồi planNext. Trạng thái là JSON thuần, lưu trong learn_lessons để thoát rồi vào lại vẫn tiếp tục.

import { RULES_V9 } from '../learning/rules'
import type { Outcome } from '../learning/types'

export type LessonGroup = 'vocabulary' | 'word_kanji' | 'kanji'
export const LESSON_GROUPS: readonly LessonGroup[] = ['vocabulary', 'word_kanji', 'kanji']

export type CandidateKind =
  /** Câu Stage đến hẹn (Stage 2, 3, 5, 6). */
  | 'stage'
  /** Chữ Kanji đang ở giai đoạn Học. */
  | 'kanji_learning'
  /** Card ôn dài hạn của chữ Kanji: không tính vào ngân sách Learn, có trần riêng. */
  | 'kanji_card'
  /** Mục mới: có thẻ giới thiệu trước. */
  | 'new_word'
  | 'new_word_kanji'
  | 'new_kanji'
  /** Câu học thêm của từ có sao: chỉ ôn vui, không tính vào số câu của bài. */
  | 'star'

export interface Candidate {
  key: string
  group: LessonGroup
  kind: CandidateKind
  /** Mục giãn cách: các câu cùng anchor (cùng từ, cùng chữ) phải cách nhau. */
  anchor: string
  /** Số ngày quá hẹn; mục đến hẹn hôm nay là 0. */
  overdueDays: number
  /** Số câu tính điểm tối đa của mục trong hôm nay. */
  left: number
}

const isNew = (kind: CandidateKind) => kind === 'new_word' || kind === 'new_word_kanji' || kind === 'new_kanji'

type ItemStep = 'waiting' | 'micro' | 'recall1' | 'recall2' | 'due' | 'done'

interface ItemState {
  step: ItemStep
  /** Câu tính điểm thứ mấy trong bài thì mục được hỏi tiếp. */
  readyAt: number
  /** Câu kiểm tra nhanh sau khi sai: hỏi khi tới câu tính điểm thứ này. */
  recheckAt: number | null
  asked: number
  left: number
  /** Đang đi thang ngắn hạn của mục mới. */
  ladder: boolean
}

export interface LessonLimits {
  /** Số câu của bài, tính cả câu kiểm tra nhanh, không tính câu sao. */
  target: number
  /** Ngân sách Learn còn lại hôm nay (câu Stage và câu Học Kanji). */
  budget: number
  /** Trần phụ: câu Học Kanji còn lại hôm nay. */
  kanjiLearning: number
  /** Trần Card Kanji còn lại hôm nay. */
  kanjiCards: number
}

export interface LessonState {
  version: 1
  seed: number
  groups: LessonGroup[]
  limits: LessonLimits
  /** Mọi câu đã trả lời trong bài (tính câu kiểm tra nhanh, không tính câu sao). */
  answered: number
  /** Câu tính điểm đã trả lời (câu Stage, câu Học Kanji, câu Card Kanji). Mọi khoảng cách đếm bằng số này. */
  counted: number
  /** Trong đó câu của mục cũ (không đi thang ngắn hạn), để mục cũ không bị bỏ đói. */
  countedOld: number
  stars: number
  lastStarAt: number | null
  groupCounts: Record<LessonGroup, number>
  shares: Record<LessonGroup, number>
  candidates: Candidate[]
  items: Record<string, ItemState>
  /** Lần gần nhất mỗi anchor xuất hiện (vị trí `counted` lúc đó). Câu kiểm tra nhanh cũng đặt mốc. */
  lastSeen: Record<string, number>
  lastIntroAt: number | null
}

export type StepPlan =
  | { type: 'intro'; key: string }
  | { type: 'question'; key: string; micro: boolean }
  | { type: 'end'; reason: EndReason }

/** target: đủ số câu. budget: chạm ngân sách ngày. empty: không còn câu hợp lệ (không lặp câu cho đủ số). */
export type EndReason = 'target' | 'budget' | 'empty'

type Rng = () => number

function rngFor(state: Pick<LessonState, 'seed' | 'answered' | 'stars'>): Rng {
  // mulberry32, hạt giống theo vị trí trong bài: dựng lại đúng câu khi tải lại trang
  let a = (state.seed + state.answered * 7919 + state.stars * 104729) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const between = ([lo, hi]: readonly [number, number] | readonly number[], rng: Rng) => lo + Math.floor(rng() * (hi - lo + 1))

/** Bắt đầu bài: tỷ lệ mục tiêu của mỗi nhóm theo lượng việc, nhóm có việc được ít nhất 15%. */
export function startLesson(candidates: readonly Candidate[], groups: readonly LessonGroup[], limits: LessonLimits, seed: number): LessonState {
  const inGroups = candidates.filter((c) => groups.includes(c.group))
  const work = Object.fromEntries(LESSON_GROUPS.map((g) => [g, 0])) as Record<LessonGroup, number>
  for (const c of inGroups) if (c.kind !== 'star') work[c.group] += isNew(c.kind) ? c.left + 1 : c.left
  const total = Object.values(work).reduce((a, b) => a + b, 0)
  const { minGroupShare } = RULES_V9.ais
  const raw = Object.fromEntries(LESSON_GROUPS.map((g) => [g, work[g] > 0 && total > 0 ? Math.max(minGroupShare, work[g] / total) : 0])) as Record<LessonGroup, number>
  const sum = Object.values(raw).reduce((a, b) => a + b, 0) || 1
  const shares = Object.fromEntries(LESSON_GROUPS.map((g) => [g, raw[g] / sum])) as Record<LessonGroup, number>
  const items: Record<string, ItemState> = {}
  for (const c of inGroups) items[c.key] = { step: isNew(c.kind) ? 'waiting' : 'due', readyAt: 0, recheckAt: null, asked: 0, left: c.left, ladder: false }
  return {
    version: 1,
    seed,
    groups: [...groups],
    limits: { ...limits },
    answered: 0,
    counted: 0,
    countedOld: 0,
    stars: 0,
    lastStarAt: null,
    groupCounts: { vocabulary: 0, word_kanji: 0, kanji: 0 },
    shares,
    candidates: inGroups,
    items,
    lastSeen: {},
    lastIntroAt: null,
  }
}

const costsBudget = (kind: CandidateKind) => kind !== 'kanji_card' && kind !== 'star'

/** Câu tính điểm còn được hỏi cho mục này không, theo ngân sách và trần phụ. */
function withinLimits(state: LessonState, c: Candidate): boolean {
  if (c.kind === 'star') return true
  if (c.kind === 'kanji_card') return state.limits.kanjiCards > 0
  if (state.limits.budget <= 0) return false
  if (c.kind === 'kanji_learning' || c.kind === 'new_kanji') return state.limits.kanjiLearning > 0
  return true
}

/** Gap theo R3: số câu tính điểm đã qua kể từ lần gần nhất anchor xuất hiện. */
function spaced(state: LessonState, anchor: string): boolean {
  const last = state.lastSeen[anchor]
  return last === undefined || state.counted - last >= RULES_V9.spacing.minGap
}

interface Option {
  plan: StepPlan
  group: LessonGroup
  priority: number
}

/** `idle`: không còn câu nào khác hợp lệ; cho giới thiệu thêm mục mới thay vì kết thúc bài sớm. */
function options(state: LessonState, idle = false): Option[] {
  const { ais } = RULES_V9
  const p = ais.priority
  const out: Option[] = []
  const inLadder = state.candidates.filter((c) => state.items[c.key].ladder && state.items[c.key].step !== 'done').length
  const oldWaiting = state.candidates.some((c) => !isNew(c.kind) && c.kind !== 'star' && state.items[c.key].step === 'due' && state.items[c.key].left > 0)
  const introAllowed =
    state.limits.budget >= 2 &&
    (idle ||
      (inLadder < ais.maxItemsInLadder &&
        (state.lastIntroAt === null || state.answered - state.lastIntroAt >= ais.introduceEvery) &&
        (!oldWaiting || state.countedOld >= ais.minDueShare * state.counted)))

  for (const c of state.candidates) {
    const it = state.items[c.key]
    if (it.step === 'done' || it.asked >= ais.maxPerItemPerLesson) continue
    // Câu kiểm tra lại sau khi sai: không tính điểm, chỉ cần tới lượt
    if (it.recheckAt !== null) {
      if (state.counted >= it.recheckAt) out.push({ plan: { type: 'question', key: c.key, micro: true }, group: c.group, priority: p.recheck })
      continue
    }
    if (c.kind === 'star') {
      const due = state.stars < ais.starPerLesson && (state.lastStarAt === null || state.counted - state.lastStarAt >= ais.starEvery) && state.counted > 0
      if (due && it.left > 0 && spaced(state, c.anchor)) out.push({ plan: { type: 'question', key: c.key, micro: false }, group: c.group, priority: p.star })
      continue
    }
    if (it.step === 'waiting') {
      if (introAllowed && withinLimits(state, c)) out.push({ plan: { type: 'intro', key: c.key }, group: c.group, priority: p.intro })
      continue
    }
    if (!withinLimits(state, c)) continue
    if (it.step === 'micro') {
      // Kiểm tra nhanh ngay sau thẻ giới thiệu: luôn là câu kế tiếp
      out.push({ plan: { type: 'question', key: c.key, micro: true }, group: c.group, priority: Number.MAX_SAFE_INTEGER })
      continue
    }
    if (state.counted < it.readyAt || !spaced(state, c.anchor) || it.left <= 0) continue
    const overdue = Math.min(p.maxOverdue, c.overdueDays * p.perOverdueDay)
    const priority = it.ladder ? p.ladderDue : overdue + p.dueToday
    out.push({ plan: { type: 'question', key: c.key, micro: false }, group: c.group, priority })
  }
  return out
}

/** Chọn câu kế tiếp. Không còn câu hợp lệ thì kết thúc bài, không xếp câu lặp hoặc câu chưa đủ giãn cách. */
export function planNext(state: LessonState): StepPlan {
  if (state.answered >= state.limits.target) return { type: 'end', reason: 'target' }
  const all = options(state)
  const forced = all.find((o) => o.priority === Number.MAX_SAFE_INTEGER)
  if (forced) return forced.plan
  // Câu sao không tính vào bài: chen vào khi tới lượt
  const star = all.find((o) => o.plan.type === 'question' && state.candidates.find((c) => c.key === (o.plan as { key: string }).key)?.kind === 'star')
  if (star) return star.plan
  let real = all.filter((o) => o !== star)
  // Hết câu xen giữa: giới thiệu thêm mục mới (thẻ mới cũng là câu xen cho các mục đang chờ giãn cách)
  if (real.length === 0) real = options(state, true).filter((o) => o.plan.type === 'intro')
  if (real.length === 0) {
    const budgetGone = state.limits.budget <= 0 && state.candidates.some((c) => costsBudget(c.kind) && state.items[c.key].step !== 'done')
    return { type: 'end', reason: budgetGone ? 'budget' : 'empty' }
  }

  // Nhóm có thiếu hụt lớn nhất so với tỷ lệ mục tiêu
  const total = state.groupCounts.vocabulary + state.groupCounts.word_kanji + state.groupCounts.kanji
  const groups = [...new Set(real.map((o) => o.group))]
  const deficit = (g: LessonGroup) => state.shares[g] * (total + 1) - state.groupCounts[g]
  const group = groups.sort((a, b) => deficit(b) - deficit(a) || LESSON_GROUPS.indexOf(a) - LESSON_GROUPS.indexOf(b))[0]

  // Trong nhóm: chọn có trọng số trong vài ứng viên ưu tiên cao nhất
  const top = real.filter((o) => o.group === group).sort((a, b) => b.priority - a.priority).slice(0, RULES_V9.ais.topK)
  const weights = top.map((o) => Math.max(1, o.priority))
  const rng = rngFor(state)
  let roll = rng() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < top.length; i++) {
    roll -= weights[i]
    if (roll < 0) return top[i].plan
  }
  return top[top.length - 1].plan
}

const clone = (state: LessonState): LessonState => structuredClone(state)

/** Xem xong thẻ giới thiệu: mục vào thang ngắn hạn, câu kiểm tra nhanh đến ngay. */
export function applyIntro(state: LessonState, key: string): LessonState {
  const next = clone(state)
  const it = next.items[key]
  if (!it || it.step !== 'waiting') return next
  it.step = 'micro'
  it.ladder = true
  next.lastIntroAt = next.answered
  return next
}

/** Mục bị bỏ khỏi bài (đánh dấu đã biết, lưu trữ Card…). */
export function dropItem(state: LessonState, key: string): LessonState {
  const next = clone(state)
  if (next.items[key]) next.items[key].step = 'done'
  return next
}

/**
 * Ghi kết quả một câu.
 * - Câu kiểm tra nhanh: không tính điểm, không tốn ngân sách, nhưng đặt mốc giãn cách cho anchor.
 * - Sai: câu kiểm tra lại sau 2 câu tính điểm; mục mới quay về bước gọi lại lần 1.
 */
export function applyResult(state: LessonState, plan: Extract<StepPlan, { type: 'question' }>, outcome: Outcome): LessonState {
  const next = clone(state)
  const c = next.candidates.find((x) => x.key === plan.key)
  const it = next.items[plan.key]
  if (!c || !it) return next
  const { ais } = RULES_V9
  const rng = rngFor(next)
  it.asked += 1

  if (c.kind === 'star') {
    next.stars += 1
    next.lastStarAt = next.counted
    it.left -= 1
    if (it.left <= 0) it.step = 'done'
    next.lastSeen[c.anchor] = next.counted
    return next
  }

  next.answered += 1
  if (plan.micro) {
    next.lastSeen[c.anchor] = next.counted
    const wasRecheck = it.recheckAt !== null
    it.recheckAt = null
    if (it.step === 'micro') {
      it.step = 'recall1'
      it.readyAt = next.counted + between(ais.firstRecallGap, rng)
    }
    // Sai cả câu kiểm tra nhanh: kiểm tra lại thêm một lần, không quá số câu tối đa của mục
    if (outcome === 'wrong' && !wasRecheck && it.asked < ais.maxPerItemPerLesson) it.recheckAt = next.counted + ais.wrongRecheckAfter
    return next
  }

  next.counted += 1
  next.groupCounts[c.group] += 1
  next.lastSeen[c.anchor] = next.counted
  if (c.kind === 'kanji_card') next.limits.kanjiCards -= 1
  else {
    next.limits.budget -= 1
    if (c.kind === 'kanji_learning' || c.kind === 'new_kanji') next.limits.kanjiLearning -= 1
  }
  if (!it.ladder) next.countedOld += 1
  it.left -= 1

  if (outcome === 'wrong') {
    it.recheckAt = next.counted + ais.wrongRecheckAfter
    if (it.ladder) {
      it.step = 'recall1'
      it.readyAt = next.counted + ais.wrongRecheckAfter + between(ais.firstRecallGap, rng)
    }
  } else if (it.ladder && it.step === 'recall1') {
    it.step = 'recall2'
    it.readyAt = next.counted + between(ais.secondRecallGap, rng)
  } else if (it.ladder && it.step === 'recall2') {
    // Xong thang ngắn hạn; còn câu trong hôm nay (chữ Kanji: buổi 3 câu) thì hỏi tiếp như mục đến hẹn
    it.ladder = false
    it.step = 'due'
    it.readyAt = next.counted + RULES_V9.spacing.minGap
  }
  if (it.left <= 0 && it.recheckAt === null) it.step = 'done'
  if (it.asked >= ais.maxPerItemPerLesson) it.step = 'done'
  return next
}

/** Mục nào trong bài đã từng được hỏi ở Stage 3, để cuối bài có vòng ghép ô. */
export function askedKeys(state: LessonState): string[] {
  return state.candidates.filter((c) => state.items[c.key].asked > 0).map((c) => c.key)
}

/** Số câu mục mới cần cho thang ngắn hạn (gọi lại 2 lần), dùng khi dựng ứng viên. */
export const NEW_ITEM_RECALLS = 2
