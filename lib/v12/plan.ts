// V12 §5–6, §8: chọn mục mới mở hôm nay — theo từng cấp, theo chỉ tiêu cân bằng (hoặc số thủ công), theo thứ tự mở. Pure.
import type { StudyDate } from '../learning/types'
import { balance, type BalanceResult, type BalanceTarget, type Remaining } from './balance'
import type { Area, Zone } from './card-types'
import { canOpenKanji, kanjiOrder, pastStage1, queueTriggered, wordKanjiStatus, type KanjiRow, type Progress } from './order'

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

export interface PlanResult {
  /** Cấp đang học (5 = N5). null khi đã mở hết N5–N4. */
  level: number | null
  /** Mục mới cần mở thêm hôm nay. */
  open: { kana: string[]; radical: number[]; kanji: string[]; word_kanji: string[] }
  /** Số mục chưa mở của cấp (trước khi mở hôm nay). */
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
  const unopenedWordKanji = (level: number) => input.wordKanji.filter((w) => w.level === level && !opened('word_kanji', w.id))
  // Bộ thủ thuộc cấp N5 (phạm vi N5–N4 học trước chữ)
  const unopenedRadicals = (level: number) => (level === 5 ? input.radicals.filter((n) => !opened('radical', n)) : [])
  const remainingOf = (level: number): Remaining => ({
    kana: unopenedWords(level).length,
    radical: unopenedRadicals(level).length,
    kanji: unopenedKanji(level).length,
    word_kanji: unopenedWordKanji(level).length,
  })

  const level = LEVELS.find((l) => Object.values(remainingOf(l)).some((n) => n > 0)) ?? null
  const empty = { kana: [], radical: [], kanji: [], word_kanji: [] }
  if (level === null) return { level, open: empty, remaining: { kana: 0, radical: 0, kanji: 0, word_kanji: 0 }, balance: null }
  const remaining = remainingOf(level)

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

  const kana = unopenedWords(level).slice(0, quota.kana).map((w) => w.id)
  const radical = unopenedRadicals(level).slice(0, quota.radical)

  // Chữ: theo thứ tự học, chỉ chữ đã đủ bộ thủ trong phạm vi qua Stage 1
  const inScope = new Set(input.radicals)
  const radicalProgress = new Map(input.radicals.map((n) => [n, p.get(key('radical', n)) ?? ('none' as Progress)]))
  const byChar = new Map(input.kanji.map((k) => [k.character, k]))
  const kanji = kanjiOrder(unopenedKanji(level))
    .map((c) => byChar.get(c)!)
    .filter((k) => canOpenKanji(k, inScope, radicalProgress))
    .slice(0, quota.kanji)
    .map((k) => k.id)

  // Từ vựng Kanji: mở theo cách thường trước, hàng chờ khi có điều kiện kích hoạt
  const kanjiProgress = new Map(input.kanji.map((k) => [k.character, p.get(key('kanji', k.id)) ?? ('none' as Progress)]))
  const candidates = unopenedWordKanji(level).sort((a, b) => a.sortOrder - b.sortOrder)
  const status = new Map(candidates.map((w) => [w.id, wordKanjiStatus(w, p.get(key('kana', w.id)), kanjiProgress)]))
  const openNow = candidates.filter((w) => status.get(w.id) === 'open')
  const word_kanji = openNow.slice(0, quota.word_kanji).map((w) => w.id)
  if (word_kanji.length < quota.word_kanji) {
    const triggered = queueTriggered({
      kanaAllOpened: unopenedWords(level).length - kana.length === 0,
      kanjiAllOpened: unopenedKanji(level).length - kanji.length === 0,
      otherOpenable: openNow.length - word_kanji.length,
    })
    if (triggered) word_kanji.push(...candidates.filter((w) => status.get(w.id) === 'queued').slice(0, quota.word_kanji - word_kanji.length).map((w) => w.id))
  }
  return { level, open: { kana, radical, kanji, word_kanji }, remaining, balance: result }
}

/**
 * Luật dừng mục mới (chủ dự án chốt 2026-11-19): khu nào có câu Stage đến lượt cộng Card đến hạn hôm nay
 * (không tính mục mới) từ trần trở lên thì hôm đó không mở mục mới cho khu đó.
 */
export function pausedZones(load: Readonly<Record<Zone, number>>, caps: Readonly<Record<Zone, number>>): Record<Zone, boolean> {
  return { kana: load.kana >= caps.kana, kanji: load.kanji >= caps.kanji, word_kanji: load.word_kanji >= caps.word_kanji }
}

export { pastStage1 }
