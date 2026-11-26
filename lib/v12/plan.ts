// V12 §5–6, §8: chọn mục mới mở hôm nay — theo từng cấp, theo chỉ tiêu cân bằng (hoặc số thủ công), theo thứ tự mở. Pure.
import type { StudyDate } from '../learning/types'
import { balance, type BalanceResult, type BalanceTarget, type Remaining } from './balance'
import type { Area, Zone } from './card-types'
import { canOpenKanji, kanjiOrder, pastStage1, wordKanjiStatus, type KanjiRow, type Progress } from './order'
import type { WordKanjiPace } from './pace'

export interface PlanWord {
  id: string
  level: number | null
  sortOrder: number
  kanaOnly: boolean
  kanji: readonly string[]
}

export interface PlanKanji extends KanjiRow {
  id: string
}

export interface PlanInput {
  today: StudyDate
  words: readonly PlanWord[]
  /** Bộ trong phạm vi, theo thứ tự học. */
  radicals: readonly number[]
  kanji: readonly PlanKanji[]
  /** Từ có dạng Kanji học được (id từ). */
  wordKanji: readonly PlanWord[]
  /** Tiến độ: khoá `${area}:${ref}` (ref = id từ / id chữ / số bộ). Mục "đã biết" coi như đã mở. */
  progress: ReadonlyMap<string, Progress>
  /** Số mục đã mở hôm nay của từng loại mục (để không mở thêm khi tải lại). */
  openedToday: Readonly<Record<Area, number>>
  balanceOn: boolean
  target: BalanceTarget
  /** Số mục mới mỗi ngày khi tắt cân bằng (khu Kanji gồm bộ thủ và chữ). */
  manual: Readonly<Record<Zone, number>>
  carry?: Partial<Record<keyof Remaining, number>>
  seconds?: Record<Area, number>
  /** Khu đang tồn quá trần: hôm nay không mở mục mới (pausedZones). Thời gian của khu không chia cho khu khác. */
  paused?: Partial<Record<Zone, boolean>>
  /** Khu người học tự dừng trong Settings: không mở mục mới; khi bật cân bằng, thời gian của khu chia cho các khu còn chạy. */
  userPaused?: Partial<Record<Zone, boolean>>
}

/** Cấp của thẻ Từ vựng Kanji = cấp khó nhất giữa từ và các chữ của từ (N5 = 5, N4 = 4); từ có chữ ngoài N5–N4 thì chưa có. */
function wordKanjiLevelOf(w: PlanWord, kanjiLevel: ReadonlyMap<string, number | null>): number | null {
  let lv = w.level
  if (lv !== 5 && lv !== 4) return null
  for (const c of w.kanji) {
    const l = kanjiLevel.get(c)
    if (l !== 5 && l !== 4) return null
    lv = Math.min(lv, l)
  }
  return lv
}

export interface PlanResult {
  /** Cấp thấp nhất còn đang học trong các khu (5 = N5). null khi đã mở hết N5–N4. */
  level: number | null
  /** Cấp đang học của từng khu (chủ dự án chốt 2026-11-26: khu nào mở hết cấp thì sang cấp sau luôn). */
  levels: Record<Zone, number | null>
  /** Mục mới cần mở thêm hôm nay. */
  open: { kana: string[]; radical: number[]; kanji: string[]; word_kanji: string[] }
  /** Số mục chưa mở của cấp đang học của từng khu (trước khi mở hôm nay). */
  remaining: Remaining
  balance: BalanceResult | null
}

const LEVELS = [5, 4] as const
export const key = (area: Area, ref: string | number) => `${area}:${ref}`

/** Chọn mục mới hôm nay (§8.2, cân bằng từng cấp; khu Kanji: bộ thủ trước chữ). */
export function planNewItems(input: PlanInput): PlanResult {
  const p = input.progress
  const opened = (area: Area, ref: string | number) => (p.get(key(area, ref)) ?? 'none') !== 'none'
  const unopenedWords = (level: number) => input.words.filter((w) => w.level === level && !opened('kana', w.id)).sort((a, b) => a.sortOrder - b.sortOrder)
  const unopenedKanji = (level: number) => input.kanji.filter((k) => k.level === level && !opened('kanji', k.id))
  // Cấp của thẻ Từ vựng Kanji = cấp khó nhất giữa từ và các chữ của từ (N5 = 5, N4 = 4); từ có chữ ngoài N5–N4 thì chưa có
  // (chủ dự án chốt 2026-11-24: từ học bằng Kana ở N5 không bắt buộc học dạng Kanji ở N5)
  const kanjiLevel = new Map(input.kanji.map((k) => [k.character, k.level]))
  const wordKanjiLevel = (w: PlanWord) => wordKanjiLevelOf(w, kanjiLevel)
  const unopenedWordKanji = (level: number) => input.wordKanji.filter((w) => wordKanjiLevel(w) === level && !opened('word_kanji', w.id))
  // Bộ thủ thuộc cấp N5 (phạm vi N5–N4 học trước chữ)
  const unopenedRadicals = (level: number) => (level === 5 ? input.radicals.filter((n) => !opened('radical', n)) : [])

  // Mỗi khu có cấp riêng: mở hết cấp này thì sang cấp sau, không chờ khu khác (chủ dự án chốt 2026-11-26)
  const levelOf = (count: (level: number) => number) => LEVELS.find((l) => count(l) > 0) ?? null
  const levels: Record<Zone, number | null> = {
    kana: levelOf((l) => unopenedWords(l).length),
    kanji: levelOf((l) => unopenedKanji(l).length + unopenedRadicals(l).length),
    word_kanji: levelOf((l) => unopenedWordKanji(l).length),
  }
  const at = <T>(lv: number | null, list: (level: number) => T[]): T[] => (lv === null ? [] : list(lv))
  const remaining: Remaining = {
    kana: at(levels.kana, unopenedWords).length,
    radical: at(levels.kanji, unopenedRadicals).length,
    kanji: at(levels.kanji, unopenedKanji).length,
    word_kanji: at(levels.word_kanji, unopenedWordKanji).length,
  }
  const active = Object.values(levels).filter((l): l is number => l !== null)
  const level = active.length > 0 ? Math.max(...active) : null

  // Chỉ tiêu hôm nay: tính trên số còn lại đầu ngày (cộng lại mục đã mở hôm nay), trừ phần đã mở
  let quota: Record<keyof Remaining, number>
  let result: BalanceResult | null = null
  const o = input.openedToday
  if (input.balanceOn) {
    const startOfDay = { kana: remaining.kana + o.kana, radical: remaining.radical + o.radical, kanji: remaining.kanji + o.kanji, word_kanji: remaining.word_kanji + o.word_kanji }
    result = balance(startOfDay, input.target, input.today, input.seconds, input.carry, input.userPaused)
    quota = {
      kana: Math.max(0, result.today.kana - o.kana),
      radical: Math.max(0, result.today.radical - o.radical),
      kanji: Math.max(0, result.today.kanji - o.kanji),
      word_kanji: Math.max(0, result.today.word_kanji - o.word_kanji),
    }
  } else {
    const kanjiZone = Math.max(0, input.manual.kanji - o.radical - o.kanji)
    const radical = Math.min(kanjiZone, remaining.radical)
    quota = { kana: Math.max(0, input.manual.kana - o.kana), radical, kanji: kanjiZone - radical, word_kanji: Math.max(0, input.manual.word_kanji - o.word_kanji) }
  }

  // Khu tồn quá trần: không mở mục mới hôm nay (cân bằng tự bù vào các ngày sau vì tính lại trên số còn lại thật)
  const paused = { ...input.userPaused, ...Object.fromEntries(Object.entries(input.paused ?? {}).filter(([, v]) => v)) } as Partial<Record<Zone, boolean>>
  if (paused.kana) quota.kana = 0
  if (paused.kanji) quota = { ...quota, radical: 0, kanji: 0 }
  if (paused.word_kanji) quota.word_kanji = 0

  const kana = at(levels.kana, unopenedWords).slice(0, quota.kana).map((w) => w.id)
  const radical = at(levels.kanji, unopenedRadicals).slice(0, quota.radical)

  // Chữ: theo thứ tự học, chỉ chữ đã đủ bộ thủ trong phạm vi qua Stage 1
  const inScope = new Set(input.radicals)
  const radicalProgress = new Map(input.radicals.map((n) => [n, p.get(key('radical', n)) ?? ('none' as Progress)]))
  const byChar = new Map(input.kanji.map((k) => [k.character, k]))
  const kanji = kanjiOrder(at(levels.kanji, unopenedKanji))
    .map((c) => byChar.get(c)!)
    .filter((k) => canOpenKanji(k, inScope, radicalProgress))
    .slice(0, quota.kanji)
    .map((k) => k.id)

  // Từ vựng Kanji: mở khi Kana của từ đã vào Stage 2 và mọi chữ của từ đã học xong; mọi từ N5–N4 đủ điều kiện,
  // từ N5 trước rồi tới N4, trong cấp theo thứ tự từ vựng.
  const kanjiProgress = new Map(input.kanji.map((k) => [k.character, p.get(key('kanji', k.id)) ?? ('none' as Progress)]))
  const word_kanji = input.wordKanji
    .filter((w) => {
      const lv = wordKanjiLevel(w)
      return lv !== null && !opened('word_kanji', w.id) && wordKanjiStatus(w, p.get(key('kana', w.id)), kanjiProgress) === 'open'
    })
    .sort((a, b) => wordKanjiLevel(b)! - wordKanjiLevel(a)! || a.sortOrder - b.sortOrder)
    .slice(0, quota.word_kanji)
    .map((w) => w.id)
  return { level, levels, open: { kana, radical, kanji, word_kanji }, remaining, balance: result }
}

/**
 * Dữ liệu ước tính ngày xong khu Từ vựng Kanji (pace.wordKanjiDays): mỗi từ Kanji chưa mở (N5–N4) kèm vị trí của Kana
 * và các chữ của từ trong hàng chờ mở của khu Kana / Kanji (cấp N5 trước N4, thứ tự như khi mở), và số ngày còn lại
 * của Kana / chữ đã mở mà chưa xong.
 */
export function wordKanjiPaceRows(input: Pick<PlanInput, 'words' | 'kanji' | 'wordKanji' | 'progress'>, currentLevel: number | null): WordKanjiPace[] {
  const p = input.progress
  const opened = (area: Area, ref: string) => (p.get(key(area, ref)) ?? 'none') !== 'none'
  const kanaQueue = LEVELS.flatMap((lv) => input.words.filter((w) => w.level === lv && !opened('kana', w.id)).sort((a, b) => a.sortOrder - b.sortOrder))
  const kanaRank = new Map(kanaQueue.map((w, i) => [w.id, i]))
  const byChar = new Map(input.kanji.map((k) => [k.character, k]))
  const kanjiQueue = LEVELS.flatMap((lv) => kanjiOrder(input.kanji.filter((k) => k.level === lv && !opened('kanji', k.id))))
  const kanjiRank = new Map(kanjiQueue.map((c, i) => [c, i]))
  const kanjiLevel = new Map(input.kanji.map((k) => [k.character, k.level]))
  // Chữ đã mở mà chưa học xong: Stage 1 còn 3 ngày, Stage 2 còn 2, Stage 3 còn 1 (mỗi Intro một ngày, có Card ngày kế)
  const charDays = (c: string) => {
    const s = p.get(key('kanji', byChar.get(c)!.id)) ?? 'none'
    return s === 'none' || s === 'review' ? 0 : 4 - s
  }
  return input.wordKanji.flatMap((w) => {
    const level = wordKanjiLevelOf(w, kanjiLevel)
    if (level === null || opened('word_kanji', w.id)) return []
    const ranks = w.kanji.map((c) => kanjiRank.get(c)).filter((r): r is number => r !== undefined)
    return [
      {
        level,
        current: level === currentLevel,
        kanaRank: kanaRank.get(w.id) ?? null,
        // Kana của từ đang ở Intro 1: sang Intro 2 từ ngày học kế tiếp
        kanaDays: p.get(key('kana', w.id)) === 1 ? 1 : 0,
        kanjiRank: ranks.length > 0 ? Math.max(...ranks) : null,
        kanjiDays: Math.max(0, ...w.kanji.map(charDays)),
      },
    ]
  })
}

/**
 * Luật dừng mục mới (chủ dự án chốt 2026-11-19): khu nào có câu Stage đến lượt cộng Card đến hạn hôm nay
 * (không tính mục mới) từ trần trở lên thì hôm đó không mở mục mới cho khu đó.
 */
export function pausedZones(load: Readonly<Record<Zone, number>>, caps: Readonly<Record<Zone, number>>): Record<Zone, boolean> {
  return { kana: load.kana >= caps.kana, kanji: load.kanji >= caps.kanji, word_kanji: load.word_kanji >= caps.word_kanji }
}

export { pastStage1 }
