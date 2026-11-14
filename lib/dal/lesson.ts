// V9 gói 5c — Bài Learn: AIS (lib/learn/ais.ts) chọn từng câu; server dựng câu, đọc kết quả từ nhật ký, lưu trạng thái. Server-only.
//   startLesson / getLessonView: mở hoặc tiếp tục bài đang làm (một bài active mỗi người, theo ngày học)
//   advanceLesson:   sau câu tính điểm (đã lưu bằng hàm lưu sẵn có), thẻ giới thiệu, vòng boss, vòng ghép
//   answerMicro:     câu kiểm tra nhanh: chấm, ghi learn_micro_logs, đi tiếp trong cùng một lần gọi
//   skipLessonItem:  từ đánh dấu đã biết / Card lưu trữ giữa bài
// Kết quả câu tính điểm lấy từ nhật ký theo client_event_id, không tin trình duyệt.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { readDailyLimits } from '@/lib/dal/daily-limits'
import { getLastDaySeq } from '@/lib/dal/day-seq'
import { completeWordIntro, getIntroData } from '@/lib/dal/intro'
import { buildKanjiMatchRound, buildKanjiPartsFor, buildKanjiSimilarFor } from '@/lib/dal/kanji-content'
import {
  buildKanjiIntro,
  buildKanjiQuestionFor,
  checkKanjiAnswer,
  openKanji,
  readKanjiCandidates,
  type KanjiIntroItem,
  type KanjiSessionQuestion,
  type SubmitKanjiResponse,
  readKnownKanjiIds,
} from '@/lib/dal/kanji'
import {
  buildBossRound,
  buildRoundForUser,
  buildStageQuestionFor,
  buildStarQuestionFor,
  checkStageAnswer,
  loadPoolsCached,
  readStarCandidates,
  type BossRoundData,
  type CheckStageAnswerResponse,
  type StageQuestionItem,
} from '@/lib/dal/stage-session'
import { readStarredIds } from '@/lib/dal/star-relearn'
import { openWordKanji, readEligibleWords, type KanjiIntroWord } from '@/lib/dal/word-kanji'
import type { MatchRoundData } from '@/lib/exercise/match-round'
import type { IntroWord } from '@/lib/intro/words'
import type { PartsQuestion, SimilarQuestion } from '@/lib/kanji/visual'
import {
  applyIntro,
  applyResult,
  applySupport,
  dropItem,
  LESSON_GROUPS,
  NEW_ITEM_RECALLS,
  addCandidates,
  planNext,
  startLesson as startAis,
  type Candidate,
  type EndReason,
  type LessonGroup,
  type LessonState,
  type StepPlan,
} from '@/lib/learn/ais'
import { newWordsBlockedBy } from '@/lib/learn/session'
import { RULES_V9 } from '@/lib/learning/rules'
import { studyDate } from '@/lib/learning/time'
import type { Outcome, ScoredStage } from '@/lib/learning/types'
import { readKnownWordIds } from '@/lib/dal/known-words'
import { readStagePool, type StagePoolItem } from '@/lib/dal/stage-pool'
import { bumpKanjiStarRound, readKanjiStarCandidates, readStarredKanjiIds } from '@/lib/dal/kanji-stars'

type Supabase = Awaited<ReturnType<typeof createClient>>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Thẻ Kanji của từ mỗi bài: không có quota ngày nên giới hạn để bài không toàn thẻ. */
const WORD_KANJI_INTROS_PER_LESSON = 5
const BOSS_EVERY = 25
const BOSS_MIN_WORDS = 6
/** Câu hỗ trợ Kanji trực quan (V9 R12) chiếm tối đa phần này của bài. */
const SUPPORT_SHARE = 0.3
/** Vòng ghép chữ cần từng này chữ đã gặp trong bài. */
const KANJI_MATCH_MIN = 4

export type LessonStep =
  | { kind: 'intro_word'; key: string; word: IntroWord }
  | { kind: 'intro_word_kanji'; key: string; word: KanjiIntroWord }
  | { kind: 'intro_kanji'; key: string; kanji: KanjiIntroItem }
  | { kind: 'stage'; key: string; micro: boolean; question: StageQuestionItem }
  | { kind: 'kanji'; key: string; micro: boolean; question: KanjiSessionQuestion }
  | { kind: 'star'; key: string; question: StageQuestionItem }
  | { kind: 'boss'; key: 'boss'; round: BossRoundData }
  | { kind: 'match'; key: 'match'; round: MatchRoundData }
  /** V9 R12: câu hỗ trợ Kanji trực quan. Tính vào số câu của bài; không điểm, không lịch, không tốn ngân sách, chấm ngay ở trình duyệt. */
  | { kind: 'kanji_parts'; key: string; question: PartsQuestion }
  | { kind: 'kanji_similar'; key: string; question: SimilarQuestion }
  | { kind: 'kanji_match'; key: 'kanji_match'; round: MatchRoundData }
  | { kind: 'end'; key: 'end'; reason: EndReason }

export interface LessonView {
  lessonId: string
  stepNo: number
  step: LessonStep
  answered: number
  target: number
  groups: LessonGroup[]
}

/** Phần trạng thái ngoài AIS, lưu cùng trong learn_lessons.state. */
interface LessonExtra {
  /** Mục mới đã xem thẻ: key → learner_vocabulary.id (từ mới) hoặc learner_kanji.id (chữ mới). */
  refs: Record<string, string>
  lastExercise: string | null
  /** Từ đã hỏi ở Stage 3 trong bài: cuối bài có vòng ghép ô. */
  stage3: string[]
  /** Các anchor đã hỏi, để biết đủ từ cho vòng boss. */
  anchors: string[]
  bossesShown: number
  matchDone: boolean
  /** Câu hỗ trợ Kanji trực quan. Bài tạo trước gói 7 không có. */
  support?: SupportState
  /** V10: đã nạp lại ứng viên một lần khi hết câu hợp lệ. */
  refilled?: boolean
  /** V10: dạng bài đã dùng cho các câu luyện sau thẻ giới thiệu của từng mục, để mỗi câu một dạng. */
  microSeen?: Record<string, string[]>
}

interface SupportState {
  queue: { kind: 'kanji_parts' | 'kanji_similar'; kanjiId: string }[]
  /** Đã xếp hàng trong bài, mỗi chữ mỗi dạng một lần: 'p:<kanjiId>', 'e:<kanjiId>'. */
  given: string[]
  /** Số câu tính điểm của mỗi chữ trong bài. */
  scored: Record<string, number>
  shown: number
  matchDone: boolean
}

const emptySupport = (): SupportState => ({ queue: [], given: [], scored: {}, shown: 0, matchDone: false })

const isSupportStep = (step: LessonStep) => step.kind === 'kanji_parts' || step.kind === 'kanji_similar' || step.kind === 'kanji_match'

/**
 * Sau một câu Kanji tính điểm (V10: câu ghép thành phần C chuyển lên ngay sau thẻ giới thiệu, xem queueParts):
 * - Phân biệt chữ gần giống (E) dạng không điểm: chỉ cho chữ đang ôn bằng Card, khi trả lời sai.
 *   Chữ đang học thì E là câu Kanji có điểm (similar_kanji), do lịch Học chọn.
 */
function queueSupport(extra: LessonExtra, step: Extract<LessonStep, { kind: 'kanji' }>, outcome: Outcome): LessonExtra {
  const prev = extra.support ?? emptySupport()
  const id = step.question.kanjiId
  const n = (prev.scored[id] ?? 0) + 1
  const support: SupportState = { ...prev, queue: [...prev.queue], given: [...prev.given], scored: { ...prev.scored, [id]: n } }
  if (step.question.phase === 'review' && outcome === 'wrong' && !support.given.includes(`e:${id}`)) {
    support.given.push(`e:${id}`)
    support.queue.push({ kind: 'kanji_similar', kanjiId: id })
  }
  return { ...extra, support }
}

/** V10: câu ghép thành phần (C) ngay sau thẻ giới thiệu chữ mới, trước các câu luyện. Không tính vào trần câu hỗ trợ. */
function queueParts(extra: LessonExtra, kanjiId: string): LessonExtra {
  const prev = extra.support ?? emptySupport()
  if (prev.given.includes(`p:${kanjiId}`)) return extra
  return { ...extra, support: { ...prev, given: [...prev.given, `p:${kanjiId}`], queue: [{ kind: 'kanji_parts', kanjiId }, ...prev.queue] } }
}

/** Vòng ghép chữ (F), bắt buộc một lần mỗi bài khi đã gặp đủ chữ. Không nằm trong trần câu hỗ trợ. */
async function kanjiMatchStep(supabase: Supabase, extra: LessonExtra): Promise<{ extra: LessonExtra; step: LessonStep | null }> {
  const support = extra.support
  const kanjiIds = extra.anchors.filter((a) => a.startsWith('kj:')).map((a) => a.slice(3))
  if (!support || support.matchDone || kanjiIds.length < KANJI_MATCH_MIN) return { extra, step: null }
  const round = await buildKanjiMatchRound(supabase, kanjiIds)
  return { extra: { ...extra, support: { ...support, matchDone: true } }, step: round ? { kind: 'kanji_match', key: 'kanji_match', round } : null }
}

/** Câu tới lượt ngoài AIS: vòng ghép chữ (F) khi đã qua nửa bài, rồi hàng đợi C/E trong trần câu hỗ trợ. */
async function nextSupport(supabase: Supabase, ais: LessonState, extra: LessonExtra): Promise<{ extra: LessonExtra; step: LessonStep | null }> {
  if (!extra.support || ais.answered >= ais.limits.target) return { extra, step: null }
  if (ais.answered * 2 >= ais.limits.target) {
    const match = await kanjiMatchStep(supabase, extra)
    if (match.step) return match
    extra = match.extra
  }
  const prev = extra.support!
  const capped = prev.shown >= Math.max(2, Math.ceil(ais.limits.target * SUPPORT_SHARE))
  const support: SupportState = { ...prev, queue: [...prev.queue] }
  const done = (step: LessonStep, counts = true) => ({ extra: { ...extra, support: { ...support, shown: support.shown + (counts ? 1 : 0) } }, step })
  while (support.queue.length > 0) {
    // V10: câu ghép thành phần (đầu hàng đợi, ngay sau thẻ giới thiệu) không tính vào trần; câu E vẫn theo trần
    if (support.queue[0].kind !== 'kanji_parts' && capped) break
    const task = support.queue.shift()!
    const key = `${task.kind === 'kanji_parts' ? 'kp' : 'ks'}:${task.kanjiId}`
    if (task.kind === 'kanji_parts') {
      const question = await buildKanjiPartsFor(supabase, task.kanjiId)
      if (question) return done({ kind: 'kanji_parts', key, question }, false)
    } else {
      const question = await buildKanjiSimilarFor(supabase, task.kanjiId)
      if (question) return done({ kind: 'kanji_similar', key, question })
    }
  }
  // Chữ không có dữ liệu thì đã rút khỏi hàng đợi, không thử lại
  return { extra: { ...extra, support }, step: null }
}

/** Vòng ghép chữ: trừ điểm Học các chữ bị ghép sai (chỉ chữ đang học), mỗi chữ một lần. Mã chống gửi trùng lấy từ vòng đã lưu. */
async function applyKanjiMatchPenalties(supabase: Supabase, userId: string, step: Extract<LessonStep, { kind: 'kanji_match' }>, missed: unknown): Promise<boolean> {
  if (!Array.isArray(missed)) return missed === undefined
  const pairs = new Map(step.round.pairs.map((p) => [p.learnerVocabularyId, p.clientEventId]))
  const kanjiIds = [...new Set(missed)].filter((id): id is string => typeof id === 'string' && pairs.has(id))
  if (kanjiIds.length !== new Set(missed).size) return false
  if (kanjiIds.length === 0) return true
  const { data, error } = await supabase.from('learner_kanji').select('id, kanji_id').eq('user_id', userId).eq('phase', 'learning').in('kanji_id', kanjiIds)
  if (error) throw new Error(`Không đọc được learner_kanji: ${error.message}`)
  const rows = data ?? []
  if (rows.length === 0) return true
  const now = new Date()
  const { error: rpcError } = await supabase.rpc('apply_kanji_match_penalties', {
    p_learner_kanji_ids: rows.map((r) => r.id),
    p_client_event_ids: rows.map((r) => pairs.get(r.kanji_id)!),
    p_points: RULES_V9.matchRound.wrongPoints,
    p_study_date: studyDate(now),
    p_answered_at: now.toISOString(),
  })
  if (rpcError) throw new Error(`apply_kanji_match_penalties lỗi: ${rpcError.message}`)
  return true
}

interface StoredState {
  ais: LessonState
  extra: LessonExtra
}

interface LessonRow {
  id: string
  study_date: string
  groups: LessonGroup[]
  status: string
  state: StoredState
  step: LessonStep | null
  step_no: number
  version: number
}

const isGroup = (v: unknown): v is LessonGroup => LESSON_GROUPS.includes(v as LessonGroup)

export function parseGroups(input: unknown): LessonGroup[] | null {
  const list = (Array.isArray(input) ? input : [input]).filter(isGroup)
  const unique = LESSON_GROUPS.filter((g) => list.includes(g))
  return unique.length > 0 ? unique : null
}

// ---------------------------------------------------------------------------
// Ứng viên và giới hạn
// ---------------------------------------------------------------------------

async function readExcluded(supabase: Supabase, userId: string): Promise<Set<string>> {
  return readKnownWordIds(supabase, userId)
}

async function buildCandidates(supabase: Supabase, userId: string, groups: readonly LessonGroup[]) {
  const excluded = await readExcluded(supabase, userId)
  const limits = await readDailyLimits(supabase, userId)
  const candidates: Candidate[] = []
  // V10: mục đến hẹn và mục đã trả lời hôm nay mà chưa đủ 3 câu (lib/dal/stage-pool.ts)
  const stage = (g: LessonGroup, r: StagePoolItem): Candidate => ({
    key: `s:${r.lvId}:${r.stage}`,
    group: g,
    kind: 'stage',
    anchor: `w:${r.vocabularyId}`,
    overdueDays: r.overdueDays,
    left: r.left,
    weak: r.weak,
  })

  if (groups.includes('vocabulary')) {
    for (const r of await readStagePool(supabase, userId, [2, 3], excluded)) candidates.push(stage('vocabulary', r))
    const blocked = newWordsBlockedBy({ cardsDue: limits.cardsDueToday, unlockThreshold: limits.unlockThreshold, stageDue: limits.stageDueToday, stageCap: limits.stageCap })
    if (!blocked) {
      for (const w of (await getIntroData()).words) {
        candidates.push({ key: `nw:${w.id}`, group: 'vocabulary', kind: 'new_word', anchor: `w:${w.id}`, overdueDays: 0, left: NEW_ITEM_RECALLS })
      }
    }
    for (const s of await readStarCandidates(supabase, userId, excluded)) {
      candidates.push({ key: `st:${s.vocabularyId}`, group: 'vocabulary', kind: 'star', anchor: `w:${s.vocabularyId}`, overdueDays: 0, left: s.left })
    }
  }
  if (groups.includes('word_kanji')) {
    for (const r of await readStagePool(supabase, userId, [5, 6], excluded)) candidates.push(stage('word_kanji', r))
    for (const w of (await readEligibleWords(supabase, userId)).slice(0, WORD_KANJI_INTROS_PER_LESSON)) {
      candidates.push({ key: `nwk:${w.learnerVocabularyId}`, group: 'word_kanji', kind: 'new_word_kanji', anchor: `w:${w.vocabularyId}`, overdueDays: 0, left: NEW_ITEM_RECALLS })
    }
  }
  let kanjiLearning = 0
  let kanjiCards = 0
  if (groups.includes('kanji')) {
    const k = await readKanjiCandidates(supabase, userId)
    for (const r of k.learning) candidates.push({ key: `k:${r.learnerKanjiId}`, group: 'kanji', kind: 'kanji_learning', anchor: `kj:${r.kanjiId}`, overdueDays: r.overdueDays, left: r.left })
    for (const c of k.cards) candidates.push({ key: `c:${c.cardId}`, group: 'kanji', kind: 'kanji_card', anchor: `kj:${c.kanjiId}`, overdueDays: c.overdueDays, left: 1 })
    for (const f of k.fresh) candidates.push({ key: `nk:${f.kanjiId}`, group: 'kanji', kind: 'new_kanji', anchor: `kj:${f.kanjiId}`, overdueDays: 0, left: RULES_V9.kanji.questionsPerSitting })
    // V10: vòng học thêm của chữ có sao — câu luyện không điểm, tính chung trần câu sao của bài
    for (const s of await readKanjiStarCandidates(supabase, userId, await readKnownKanjiIds(supabase, userId))) {
      candidates.push({ key: `sk:${s.kanjiId}:${s.learnerKanjiId}:${s.cardId ?? '-'}`, group: 'kanji', kind: 'star', anchor: `kj:${s.kanjiId}`, overdueDays: 0, left: s.left })
    }
    kanjiLearning = k.learningLeft
    kanjiCards = k.cardsLeft
  }
  return { candidates, budget: Math.max(0, limits.stageCap - limits.answeredToday), kanjiLearning, kanjiCards, excluded }
}

async function readLessonSize(supabase: Supabase, userId: string): Promise<number> {
  const { data, error } = await supabase.from('learner_settings').select('lesson_size').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_settings: ${error.message}`)
  return data?.lesson_size ?? RULES_V9.lesson.defaultQuestions
}

// ---------------------------------------------------------------------------
// Dựng bước kế tiếp
// ---------------------------------------------------------------------------

const keyParts = (key: string) => key.split(':')

/** Dựng câu hỏi hoặc thẻ cho một kế hoạch của AIS. null khi mục không còn cần hỏi (đã xong ở máy khác…). */
async function buildForPlan(supabase: Supabase, userId: string, plan: Exclude<StepPlan, { type: 'end' }>, extra: LessonExtra, excluded: () => Promise<ReadonlySet<string>>): Promise<LessonStep | null> {
  const [prefix, a, b] = keyParts(plan.key)
  if (plan.type === 'intro') {
    if (prefix === 'nw') {
      const word = (await getIntroData()).words.find((w) => w.id === a)
      return word ? { kind: 'intro_word', key: plan.key, word } : null
    }
    if (prefix === 'nwk') {
      const word = (await readEligibleWords(supabase, userId)).find((w) => w.learnerVocabularyId === a)
      return word ? { kind: 'intro_word_kanji', key: plan.key, word } : null
    }
    if (prefix === 'nk') {
      const kanji = await buildKanjiIntro(supabase, userId, a)
      return kanji ? { kind: 'intro_kanji', key: plan.key, kanji } : null
    }
    return null
  }
  const micro = plan.micro
  const avoid = [extra.lastExercise, ...(micro ? (extra.microSeen?.[plan.key] ?? []) : [])].filter((x): x is string => x !== null)
  const stageStep = async (lvId: string | undefined, stage: ScoredStage): Promise<LessonStep | null> => {
    if (!lvId) return null
    const question = await buildStageQuestionFor(supabase, userId, lvId, stage, avoid)
    return question ? { kind: 'stage', key: plan.key, micro, question } : null
  }
  const kanjiStep = async (target: { learnerKanjiId: string } | { cardId: string } | null): Promise<LessonStep | null> => {
    if (!target) return null
    const question = await buildKanjiQuestionFor(supabase, userId, target, avoid)
    return question ? { kind: 'kanji', key: plan.key, micro, question } : null
  }
  switch (prefix) {
    case 's':
      return stageStep(a, Number(b) as ScoredStage)
    case 'nw':
      return stageStep(extra.refs[plan.key], 2)
    case 'nwk':
      return stageStep(a, 5)
    case 'k':
      return kanjiStep({ learnerKanjiId: a })
    case 'nk':
      return kanjiStep(extra.refs[plan.key] ? { learnerKanjiId: extra.refs[plan.key] } : null)
    case 'c':
      return kanjiStep({ cardId: a })
    case 'sk': {
      // Chữ có sao: câu Kanji dựng như câu Học (chữ đang học) hoặc như Card (chữ đang ôn), chấm như câu luyện không điểm
      const cardId = keyParts(plan.key)[3]
      const question = await buildKanjiQuestionFor(supabase, userId, cardId && cardId !== '-' ? { cardId } : { learnerKanjiId: b }, avoid)
      return question ? { kind: 'kanji', key: plan.key, micro: true, question } : null
    }
    case 'st': {
      const question = await buildStarQuestionFor(supabase, userId, a, await excluded())
      return question ? { kind: 'star', key: plan.key, question } : null
    }
  }
  return null
}

/** Chọn bước kế tiếp: vòng boss khi tới lượt, câu/thẻ theo AIS, vòng ghép ô và màn kết thúc ở cuối bài. */
async function nextStep(supabase: Supabase, userId: string, stored: StoredState): Promise<{ stored: StoredState; step: LessonStep }> {
  let { ais } = stored
  const extra = { ...stored.extra }
  // Chỉ câu sao và vòng ghép ô cần danh sách từ đã loại: đọc khi cần, mỗi lần gọi đọc một lần
  let excludedRead: Promise<Set<string>> | null = null
  const excluded = () => (excludedRead ??= readExcluded(supabase, userId))

  // Vòng boss: mỗi 25 câu tính điểm trong bài, khi bài đã có đủ từ
  if (Math.floor(ais.counted / BOSS_EVERY) > extra.bossesShown && extra.anchors.length >= BOSS_MIN_WORDS) {
    extra.bossesShown = Math.floor(ais.counted / BOSS_EVERY)
    const round = await buildBossRound(supabase, userId)
    if (round) return { stored: { ais, extra }, step: { kind: 'boss', key: 'boss', round } }
  }

  const support = await nextSupport(supabase, ais, extra)
  if (support.step) return { stored: { ais, extra: support.extra }, step: support.step }
  Object.assign(extra, support.extra)

  for (let attempt = 0; attempt < 40; attempt++) {
    const plan = planNext(ais)
    if (plan.type === 'end' && plan.reason === 'empty' && !extra.refilled && ais.answered < ais.limits.target) {
      // V10: hết câu hợp lệ trước khi đủ số câu: đọc lại mục đến hẹn một lần (mục vừa mở, mục còn câu trong ngày)
      extra.refilled = true
      const refill = await buildCandidates(supabase, userId, ais.groups)
      const busy = new Set(ais.candidates.filter((c) => ais.items[c.key].step !== 'done').map((c) => c.anchor))
      const added = addCandidates(ais, refill.candidates.filter((c) => !busy.has(c.anchor)))
      if (added.added > 0) {
        ais = added.state
        continue
      }
    }
    if (plan.type === 'end') {
      // Vòng ghép chữ bắt buộc: bài dừng trước nửa bài thì hiện ngay trước khi kết thúc
      const match = await kanjiMatchStep(supabase, extra)
      Object.assign(extra, match.extra)
      if (match.step) return { stored: { ais, extra }, step: match.step }
      if (!extra.matchDone && extra.stage3.length > 0) {
        extra.matchDone = true
        const pools = await loadPoolsCached(supabase)
        const round = await buildRoundForUser(supabase, userId, await excluded(), extra.stage3, pools.words)
        if (round) return { stored: { ais, extra }, step: { kind: 'match', key: 'match', round } }
      }
      return { stored: { ais, extra }, step: { kind: 'end', key: 'end', reason: plan.reason } }
    }
    const step = await buildForPlan(supabase, userId, plan, extra, excluded)
    if (step) return { stored: { ais, extra }, step }
    // Mục không còn cần hỏi: bỏ khỏi bài và chọn lại
    ais = dropItem(ais, plan.key)
  }
  return { stored: { ais, extra }, step: { kind: 'end', key: 'end', reason: 'empty' } }
}

// ---------------------------------------------------------------------------
// Lưu và đọc bài
// ---------------------------------------------------------------------------

function toView(row: Pick<LessonRow, 'id' | 'step_no' | 'groups'>, stored: StoredState, step: LessonStep): LessonView {
  return { lessonId: row.id, stepNo: row.step_no, step, answered: stored.ais.answered, target: stored.ais.limits.target, groups: row.groups }
}

async function readActive(supabase: Supabase, userId: string): Promise<LessonRow | null> {
  const { data, error } = await supabase.from('learn_lessons').select('id, study_date, groups, status, state, step, step_no, version').eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (error) throw new Error(`Không đọc được learn_lessons: ${error.message}`)
  return data as LessonRow | null
}

async function closeLesson(supabase: Supabase, id: string, status: 'finished' | 'abandoned', reason: EndReason | 'quit') {
  const { error } = await supabase.from('learn_lessons').update({ status, end_reason: reason }).eq('id', id)
  if (error) throw new Error(`Không ghi được learn_lessons: ${error.message}`)
}

/** Ghi bước mới nếu bài chưa bị máy khác đi tiếp (version khớp). Trả về view đang đúng. */
async function saveStep(supabase: Supabase, row: LessonRow, stored: StoredState, step: LessonStep): Promise<LessonView> {
  const stepNo = row.step_no + 1
  const ended = step.kind === 'end'
  const { data, error } = await supabase
    .from('learn_lessons')
    .update({ state: stored, step, step_no: stepNo, version: row.version + 1, ...(ended ? { status: 'finished', end_reason: step.reason } : {}) })
    .eq('id', row.id)
    .eq('version', row.version)
    .select('id')
  if (error) throw new Error(`Không ghi được learn_lessons: ${error.message}`)
  if (!data || data.length === 0) {
    // Máy khác vừa đi tiếp: trả về bước đang lưu
    const { data: fresh, error: freshError } = await supabase.from('learn_lessons').select('id, study_date, groups, status, state, step, step_no, version').eq('id', row.id).single()
    if (freshError) throw new Error(`Không đọc được learn_lessons: ${freshError.message}`)
    const current = fresh as LessonRow
    return toView(current, current.state, current.step ?? { kind: 'end', key: 'end', reason: 'empty' })
  }
  return toView({ ...row, step_no: stepNo }, stored, step)
}

/** Bài đang làm hôm nay của đúng nhóm này, nếu có. Bài của hôm trước hoặc nhóm khác thì bỏ. */
async function activeFor(supabase: Supabase, userId: string, groups: readonly LessonGroup[]): Promise<LessonRow | null> {
  const row = await readActive(supabase, userId)
  if (!row) return null
  const sameGroups = row.groups.length === groups.length && row.groups.every((g) => groups.includes(g))
  if (row.study_date === studyDate(new Date()) && sameGroups && row.step) return row
  await closeLesson(supabase, row.id, 'abandoned', 'quit')
  return null
}

/** Mở bài: tiếp tục bài đang dở của cùng nhóm hôm nay, hoặc tạo bài mới. */
export async function startLesson(groupsInput: unknown): Promise<LessonView | { status: 'invalid' }> {
  const groups = parseGroups(groupsInput)
  if (!groups) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const active = await activeFor(supabase, user.id, groups)
  if (active) return toView(active, active.state, active.step!)

  const [built, size] = await Promise.all([buildCandidates(supabase, user.id, groups), readLessonSize(supabase, user.id)])
  const ais = startAis(built.candidates, groups, { target: size, budget: built.budget, kanjiLearning: built.kanjiLearning, kanjiCards: built.kanjiCards }, Math.floor(Math.random() * 2 ** 31))
  const stored: StoredState = { ais, extra: { refs: {}, lastExercise: null, stage3: [], anchors: [], bossesShown: 0, matchDone: false, support: emptySupport() } }
  const next = await nextStep(supabase, user.id, stored)
  const { data, error } = await supabase
    .from('learn_lessons')
    .insert({ user_id: user.id, study_date: studyDate(new Date()), groups, state: next.stored, step: next.step, step_no: 1, status: next.step.kind === 'end' ? 'finished' : 'active', end_reason: next.step.kind === 'end' ? next.step.reason : null })
    .select('id')
    .single()
  if (error) {
    // Hai thẻ cùng mở bài: bài của thẻ kia đã được tạo
    const other = await activeFor(supabase, user.id, groups)
    if (other) return toView(other, other.state, other.step!)
    throw new Error(`Không tạo được learn_lessons: ${error.message}`)
  }
  return { lessonId: data.id, stepNo: 1, step: next.step, answered: next.stored.ais.answered, target: next.stored.ais.limits.target, groups }
}

async function readLessonFor(supabase: Supabase, userId: string, lessonId: unknown, stepNo: unknown): Promise<LessonRow | 'invalid' | 'stale' | 'not_found'> {
  if (typeof lessonId !== 'string' || !UUID.test(lessonId) || !Number.isInteger(stepNo)) return 'invalid'
  const { data, error } = await supabase.from('learn_lessons').select('id, study_date, groups, status, state, step, step_no, version').eq('id', lessonId).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`Không đọc được learn_lessons: ${error.message}`)
  const row = data as LessonRow | null
  if (!row) return 'not_found'
  if (row.status !== 'active' || row.step_no !== stepNo || !row.step) return 'stale'
  return row
}

export type AdvanceResponse = { status: 'ok'; view: LessonView } | { status: 'invalid' | 'not_found' | 'not_saved' } | { status: 'stale'; view: LessonView | null }

async function staleView(supabase: Supabase, userId: string, lessonId: string): Promise<LessonView | null> {
  const { data } = await supabase.from('learn_lessons').select('id, study_date, groups, status, state, step, step_no, version').eq('id', lessonId).eq('user_id', userId).maybeSingle()
  const row = data as LessonRow | null
  return row?.step ? toView(row, row.state, row.step) : null
}

/** Kết quả câu tính điểm, đọc từ nhật ký theo mã câu. null khi chưa lưu. */
async function savedOutcome(supabase: Supabase, userId: string, step: LessonStep, clientEventId: string): Promise<Outcome | null> {
  if (step.kind === 'star') {
    const { data, error } = await supabase.from('practice_attempts').select('is_correct').eq('user_id', userId).eq('client_event_id', clientEventId).maybeSingle()
    if (error) throw new Error(`Không đọc được practice_attempts: ${error.message}`)
    return data ? (data.is_correct ? 'correct' : 'wrong') : null
  }
  const table = step.kind === 'kanji' ? 'kanji_logs' : 'exercise_logs'
  const { data, error } = await supabase.from(table).select('outcome').eq('user_id', userId).eq('client_event_id', clientEventId).maybeSingle()
  if (error) throw new Error(`Không đọc được ${table}: ${error.message}`)
  return (data?.outcome as Outcome | undefined) ?? null
}

function noteAsked(extra: LessonExtra, step: LessonStep): LessonExtra {
  const next = { ...extra, anchors: [...extra.anchors], stage3: [...extra.stage3] }
  if (step.kind === 'stage' || step.kind === 'star' || step.kind === 'kanji') {
    next.lastExercise = step.question.exercise
    if (step.kind !== 'star' && step.micro) next.microSeen = { ...next.microSeen, [step.key]: [...(next.microSeen?.[step.key] ?? []), step.question.exercise] }
    const anchor = step.kind === 'kanji' ? `kj:${step.question.kanjiId}` : `w:${step.question.vocabularyId}`
    if (!next.anchors.includes(anchor)) next.anchors.push(anchor)
  }
  if (step.kind === 'stage' && step.question.stage === 3 && !next.stage3.includes(step.question.learnerVocabularyId)) next.stage3.push(step.question.learnerVocabularyId)
  return next
}

/**
 * Đi tiếp sau bước hiện tại.
 * - Câu tính điểm, câu sao: trình duyệt đã lưu bằng hàm lưu sẵn có; ở đây đọc kết quả theo clientEventId.
 * - Thẻ giới thiệu: lưu đã xem (tạo tiến độ của từ / chữ) rồi vào thang ngắn hạn.
 * - Vòng boss, vòng ghép: chỉ đi tiếp (vòng ghép đã lưu phần trừ điểm riêng).
 */
export async function advanceLesson(input: unknown): Promise<AdvanceResponse> {
  const { lessonId, stepNo, clientEventId, missed } = (input ?? {}) as { lessonId?: unknown; stepNo?: unknown; clientEventId?: unknown; missed?: unknown }
  const user = await requireUser()
  const supabase = await createClient()
  const row = await readLessonFor(supabase, user.id, lessonId, stepNo)
  if (row === 'invalid' || row === 'not_found') return { status: row }
  if (row === 'stale') return { status: 'stale', view: await staleView(supabase, user.id, lessonId as string) }
  const step = row.step!
  let { ais, extra } = row.state

  if ((step.kind === 'stage' || step.kind === 'kanji') && step.micro) {
    // Câu kiểm tra nhanh thường đi tiếp ngay trong answerMicro. Tới đây là lần lưu đó lỗi:
    // đã ghi thì dùng kết quả đã ghi, chưa ghi thì coi như sai để AIS kiểm tra lại sau. Không có điểm nên không ảnh hưởng tiến độ.
    const { data, error } = await supabase.from('learn_micro_logs').select('outcome').eq('user_id', user.id).eq('client_event_id', step.question.clientEventId).maybeSingle()
    if (error) throw new Error(`Không đọc được learn_micro_logs: ${error.message}`)
    ais = applyResult(ais, { type: 'question', key: step.key, micro: true }, (data?.outcome as Outcome | undefined) ?? 'wrong')
    extra = noteAsked(extra, step)
  } else if (step.kind === 'stage' || step.kind === 'kanji' || step.kind === 'star') {
    if (typeof clientEventId !== 'string' || clientEventId !== step.question.clientEventId) return { status: 'invalid' }
    const outcome = await savedOutcome(supabase, user.id, step, clientEventId)
    if (!outcome) return { status: 'not_saved' }
    ais = applyResult(ais, { type: 'question', key: step.key, micro: false }, outcome)
    extra = noteAsked(extra, step)
    if (step.kind === 'kanji') extra = queueSupport(extra, step, outcome)
  } else if (isSupportStep(step)) {
    if (step.kind === 'kanji_match' && !(await applyKanjiMatchPenalties(supabase, user.id, step, missed))) return { status: 'invalid' }
    ais = applySupport(ais)
  } else if (step.kind === 'intro_word' || step.kind === 'intro_word_kanji' || step.kind === 'intro_kanji') {
    const ref = await saveIntro(supabase, user.id, step)
    if (ref === null) return { status: 'not_saved' }
    if (ref) extra = { ...extra, refs: { ...extra.refs, [step.key]: ref } }
    if (step.kind === 'intro_kanji') extra = queueParts(extra, step.kanji.kanjiId)
    ais = applyIntro(ais, step.key)
  } else if (step.kind === 'end') {
    return { status: 'stale', view: toView(row, row.state, step) }
  }
  const next = await nextStep(supabase, user.id, { ais, extra })
  return { status: 'ok', view: await saveStep(supabase, row, next.stored, next.step) }
}

/** Lưu đã xem thẻ. Trả id tiến độ vừa tạo (từ mới, chữ mới), '' khi không cần, null khi chưa lưu được. */
async function saveIntro(supabase: Supabase, userId: string, step: Extract<LessonStep, { kind: 'intro_word' | 'intro_word_kanji' | 'intro_kanji' }>): Promise<string | null> {
  if (step.kind === 'intro_word') {
    if ((await completeWordIntro(step.word.id)).status !== 'saved') return null
    const { data, error } = await supabase.from('learner_vocabulary').select('id').eq('user_id', userId).eq('vocabulary_id', step.word.id).maybeSingle()
    if (error) throw new Error(`Không đọc được learner_vocabulary: ${error.message}`)
    return data?.id ?? null
  }
  if (step.kind === 'intro_word_kanji') {
    const { status } = await openWordKanji(step.word.learnerVocabularyId)
    return status === 'saved' ? '' : null
  }
  if ((await openKanji(step.kanji.kanjiId)).status !== 'saved') return null
  const { data, error } = await supabase.from('learner_kanji').select('id').eq('user_id', userId).eq('kanji_id', step.kanji.kanjiId).maybeSingle()
  if (error) throw new Error(`Không đọc được learner_kanji: ${error.message}`)
  return data?.id ?? null
}

export type MicroResponse =
  | { status: 'ok'; grade: CheckStageAnswerResponse | SubmitKanjiResponse; view: LessonView }
  | { status: 'invalid' | 'not_found' }
  | { status: 'stale'; view: LessonView | null }

/**
 * Câu kiểm tra nhanh: chấm theo đáp án thật, ghi learn_micro_logs (đặt mốc giãn cách, không điểm, không lịch,
 * không tính ngân sách), rồi đi tiếp. Câu đang hỏi lấy từ bài đã lưu, không lấy từ trình duyệt.
 */
export async function answerMicro(input: unknown): Promise<MicroResponse> {
  const v = (input ?? {}) as { lessonId?: unknown; stepNo?: unknown; answer?: unknown; usedHint?: unknown }
  const user = await requireUser()
  const supabase = await createClient()
  const row = await readLessonFor(supabase, user.id, v.lessonId, v.stepNo)
  if (row === 'invalid' || row === 'not_found') return { status: row }
  if (row === 'stale') return { status: 'stale', view: await staleView(supabase, user.id, v.lessonId as string) }
  const step = row.step!
  if ((step.kind !== 'stage' && step.kind !== 'kanji') || !step.micro) return { status: 'invalid' }
  const q = step.question

  // Đọc thứ tự câu trong ngày song song với lúc chấm, khỏi chờ thêm một lượt mạng.
  // Trả về sớm (chấm không được) thì bỏ kết quả; lỗi thật vẫn ném ở chỗ await bên dưới.
  const today = studyDate(new Date())
  const daySeqRead = getLastDaySeq(today)
  daySeqRead.catch(() => {})

  let grade: CheckStageAnswerResponse | SubmitKanjiResponse
  let outcome: Outcome
  if (step.kind === 'stage') {
    const sq = step.question
    const res = await checkStageAnswer({ learnerVocabularyId: sq.learnerVocabularyId, stage: sq.stage, exercise: sq.exercise, answer: v.answer, clientEventId: sq.clientEventId, usedHint: v.usedHint })
    if (res.status !== 'graded') return { status: res.status === 'invalid' ? 'invalid' : 'not_found' }
    grade = res
    outcome = v.usedHint === true && res.outcome === 'correct' ? 'hint' : res.outcome
  } else {
    const kq = step.question
    const res = await checkKanjiAnswer({ learnerKanjiId: kq.learnerKanjiId, cardId: kq.cardId, clientEventId: kq.clientEventId, exercise: kq.exercise, answer: v.answer, responseMs: 0, wordId: 'wordId' in kq ? kq.wordId : undefined })
    if (res.status !== 'graded') return { status: res.status === 'invalid' ? 'invalid' : 'not_found' }
    grade = res
    outcome = res.outcome
  }

  const daySeq = await daySeqRead
  const { error } = await supabase.from('learn_micro_logs').insert({
    user_id: user.id,
    lesson_id: row.id,
    learner_vocabulary_id: step.kind === 'stage' ? step.question.learnerVocabularyId : null,
    learner_kanji_id: step.kind === 'kanji' ? step.question.learnerKanjiId : null,
    item_key: step.key,
    exercise_type: q.exercise,
    outcome,
    study_date: today,
    day_seq: daySeq,
    client_event_id: q.clientEventId,
  })
  // Gửi lại cùng câu: đã ghi rồi thì đi tiếp như thường
  if (error && error.code !== '23505') throw new Error(`Không ghi được learn_micro_logs: ${error.message}`)

  // V10: câu vòng học thêm của chữ có sao
  if (step.key.startsWith('sk:')) await bumpKanjiStarRound(supabase, user.id, keyParts(step.key)[1])
  const ais = applyResult(row.state.ais, { type: 'question', key: step.key, micro: true }, outcome)
  const next = await nextStep(supabase, user.id, { ais, extra: noteAsked(row.state.extra, step) })
  return { status: 'ok', grade, view: await saveStep(supabase, row, next.stored, next.step) }
}

/** Bỏ mục đang hỏi khỏi bài (đã biết từ / chữ, lưu trữ Card) rồi đi tiếp. */
export async function skipLessonItem(input: unknown): Promise<AdvanceResponse> {
  const { lessonId, stepNo } = (input ?? {}) as { lessonId?: unknown; stepNo?: unknown }
  const user = await requireUser()
  const supabase = await createClient()
  const row = await readLessonFor(supabase, user.id, lessonId, stepNo)
  if (row === 'invalid' || row === 'not_found') return { status: row }
  if (row === 'stale') return { status: 'stale', view: await staleView(supabase, user.id, lessonId as string) }
  const step = row.step!
  if (step.kind === 'end' || step.kind === 'boss' || step.kind === 'match' || isSupportStep(step)) return { status: 'invalid' }
  const next = await nextStep(supabase, user.id, { ais: dropItem(row.state.ais, step.key), extra: row.state.extra })
  return { status: 'ok', view: await saveStep(supabase, row, next.stored, next.step) }
}


/** Dấu sao của người học, cho nút sao trong bài. */
export async function getMyStarredIds(): Promise<string[]> {
  const user = await requireUser()
  const supabase = await createClient()
  return readStarredIds(supabase, user.id)
}

/** V10: chữ Kanji có sao, cho nút sao trong bài. */
export async function getMyStarredKanjiIds(): Promise<string[]> {
  const user = await requireUser()
  const supabase = await createClient()
  return [...(await readStarredKanjiIds(supabase, user.id))]
}
