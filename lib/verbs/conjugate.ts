// Thể động từ (Grammar G5): quy tắc chia. Pure. Chia trên cả chữ viết (Kanji) và cách đọc, giữ tiền tố của cụm từ.
import { isVerb, type VerbKind, type VerbWord } from './types'

export type VerbFormId =
  | 'masu' | 'masen' | 'mashita' | 'masendeshita' | 'tai' | 'te' | 'nai' | 'dict' | 'ta' | 'nakatta'
  | 'potential' | 'volitional' | 'imperative' | 'prohibitive' | 'ba' | 'passive' | 'causative'
  | 'a-neg' | 'a-past' | 'a-pastneg' | 'a-te' | 'a-plainneg' | 'a-plainpast' | 'a-plainpastneg'

export interface FormInfo {
  id: VerbFormId
  /** Tên hiện trên giao diện. */
  label: string
  /** Bài Minna dạy thể này: thể mở khi bài đó mở trong Grammar. */
  lesson: number
  for: 'verb' | 'adj'
}

/** Danh sách thể theo thứ tự bài (docs/grammar-rules.md §10). */
export const VERB_FORMS: readonly FormInfo[] = [
  { id: 'masu', label: 'ます form', lesson: 4, for: 'verb' },
  { id: 'masen', label: 'ません (negative)', lesson: 4, for: 'verb' },
  { id: 'mashita', label: 'ました (past)', lesson: 4, for: 'verb' },
  { id: 'masendeshita', label: 'ませんでした (past negative)', lesson: 4, for: 'verb' },
  { id: 'a-neg', label: 'Adjective negative (polite)', lesson: 8, for: 'adj' },
  { id: 'a-past', label: 'Adjective past (polite)', lesson: 12, for: 'adj' },
  { id: 'a-pastneg', label: 'Adjective past negative (polite)', lesson: 12, for: 'adj' },
  { id: 'tai', label: 'たい (want to)', lesson: 13, for: 'verb' },
  { id: 'te', label: 'て form', lesson: 14, for: 'verb' },
  { id: 'a-te', label: 'Adjective て form', lesson: 16, for: 'adj' },
  { id: 'nai', label: 'ない form', lesson: 17, for: 'verb' },
  { id: 'dict', label: 'Dictionary form', lesson: 18, for: 'verb' },
  { id: 'ta', label: 'た form', lesson: 19, for: 'verb' },
  { id: 'nakatta', label: 'なかった (plain past negative)', lesson: 20, for: 'verb' },
  { id: 'a-plainneg', label: 'Adjective negative (plain)', lesson: 20, for: 'adj' },
  { id: 'a-plainpast', label: 'Adjective past (plain)', lesson: 20, for: 'adj' },
  { id: 'a-plainpastneg', label: 'Adjective past negative (plain)', lesson: 20, for: 'adj' },
  { id: 'potential', label: 'Potential (can do)', lesson: 27, for: 'verb' },
  { id: 'volitional', label: 'Volitional (let’s / intend)', lesson: 31, for: 'verb' },
  { id: 'imperative', label: 'Imperative', lesson: 33, for: 'verb' },
  { id: 'prohibitive', label: 'Prohibitive (don’t)', lesson: 33, for: 'verb' },
  { id: 'ba', label: 'ば conditional', lesson: 35, for: 'verb' },
  { id: 'passive', label: 'Passive', lesson: 37, for: 'verb' },
  { id: 'causative', label: 'Causative', lesson: 48, for: 'verb' },
]

export const formInfo = (id: VerbFormId) => VERB_FORMS.find((f) => f.id === id)!

export interface Conjugated {
  t: string
  r: string
  /** Cách viết khác cũng đúng (ではありません, くありません…). */
  alts: { t: string; r: string }[]
}

type Row = 'i' | 'a' | 'e' | 'o'
const ROWS: Record<string, Record<Row, string>> = {
  う: { i: 'い', a: 'わ', e: 'え', o: 'お' },
  く: { i: 'き', a: 'か', e: 'け', o: 'こ' },
  ぐ: { i: 'ぎ', a: 'が', e: 'げ', o: 'ご' },
  す: { i: 'し', a: 'さ', e: 'せ', o: 'そ' },
  つ: { i: 'ち', a: 'た', e: 'て', o: 'と' },
  ぬ: { i: 'に', a: 'な', e: 'ね', o: 'の' },
  ぶ: { i: 'び', a: 'ば', e: 'べ', o: 'ぼ' },
  む: { i: 'み', a: 'ま', e: 'め', o: 'も' },
  る: { i: 'り', a: 'ら', e: 'れ', o: 'ろ' },
}
const TE: Record<string, [string, string]> = { う: ['って', 'った'], つ: ['って', 'った'], る: ['って', 'った'], む: ['んで', 'んだ'], ぶ: ['んで', 'んだ'], ぬ: ['んで', 'んだ'], く: ['いて', 'いた'], ぐ: ['いで', 'いだ'], す: ['して', 'した'] }

/** Động từ không dùng một số thể (về nghĩa): ある, できる, わかる không có thể khả năng, bị động, sai khiến, mệnh lệnh, ý định. */
const NO_VOLITION = new Set(['ある', 'できる', 'わかる', '分かる', '要る', 'いる'])

const one = (t: string, r: string, alts: { t: string; r: string }[] = []): Conjugated => ({ t, r, alts })
const both = (w: VerbWord, cut: number, add: string, addR = add): Conjugated => one(w.dict.slice(0, w.dict.length - cut) + add, w.dictReading.slice(0, w.dictReading.length - cut) + addR)

function godan(w: VerbWord, form: VerbFormId): Conjugated | null {
  const u = w.dictReading.at(-1)!
  const row = ROWS[u]
  if (!row) return null
  const stem = (k: Row, add: string) => both(w, 1, row[k] + add)
  const iku = w.kind === 'v5-iku'
  const aru = w.kind === 'v5-aru'
  switch (form) {
    case 'masu': return stem('i', 'ます')
    case 'masen': return stem('i', 'ません')
    case 'mashita': return stem('i', 'ました')
    case 'masendeshita': return stem('i', 'ませんでした')
    case 'tai': return aru ? null : stem('i', 'たい')
    case 'te': return both(w, 1, iku ? 'って' : TE[u][0])
    case 'ta': return both(w, 1, iku ? 'った' : TE[u][1])
    case 'nai': return aru ? both(w, 2, 'ない') : stem('a', 'ない')
    case 'nakatta': return aru ? both(w, 2, 'なかった') : stem('a', 'なかった')
    case 'dict': return one(w.dict, w.dictReading)
    case 'potential': return stem('e', 'る')
    case 'volitional': return stem('o', 'う')
    case 'imperative': return both(w, 1, row.e)
    case 'prohibitive': return one(`${w.dict}な`, `${w.dictReading}な`)
    case 'ba': return stem('e', 'ば')
    case 'passive': return stem('a', 'れる')
    case 'causative': return stem('a', 'せる')
    default: return null
  }
}

function ichidan(w: VerbWord, form: VerbFormId): Conjugated | null {
  const s = (add: string) => both(w, 1, add)
  switch (form) {
    case 'masu': return s('ます')
    case 'masen': return s('ません')
    case 'mashita': return s('ました')
    case 'masendeshita': return s('ませんでした')
    case 'tai': return s('たい')
    case 'te': return s('て')
    case 'ta': return s('た')
    case 'nai': return s('ない')
    case 'nakatta': return s('なかった')
    case 'dict': return one(w.dict, w.dictReading)
    // ら抜き (食べれる) không tính là đúng ở trình độ này
    case 'potential': return s('られる')
    case 'volitional': return s('よう')
    case 'imperative': return s('ろ')
    case 'prohibitive': return one(`${w.dict}な`, `${w.dictReading}な`)
    case 'ba': return s('れば')
    case 'passive': return s('られる')
    case 'causative': return s('させる')
    default: return null
  }
}

function kuru(w: VerbWord, form: VerbFormId): Conjugated | null {
  // 来る viết Kanji thì chữ 来 giữ nguyên, chỉ đổi cách đọc; viết kana thì đổi cả hai
  const kanji = w.dict.endsWith('来る')
  const baseT = w.dict.slice(0, -2)
  const baseR = w.dictReading.slice(0, -2)
  const k = (sound: 'こ' | 'き' | 'く', add: string) => one(baseT + (kanji ? '来' : sound) + add, baseR + sound + add)
  switch (form) {
    case 'masu': return k('き', 'ます')
    case 'masen': return k('き', 'ません')
    case 'mashita': return k('き', 'ました')
    case 'masendeshita': return k('き', 'ませんでした')
    case 'tai': return k('き', 'たい')
    case 'te': return k('き', 'て')
    case 'ta': return k('き', 'た')
    case 'nai': return k('こ', 'ない')
    case 'nakatta': return k('こ', 'なかった')
    case 'dict': return one(w.dict, w.dictReading)
    case 'potential': return k('こ', 'られる')
    case 'volitional': return k('こ', 'よう')
    case 'imperative': return k('こ', 'い')
    case 'prohibitive': return k('く', 'るな')
    case 'ba': return k('く', 'れば')
    case 'passive': return k('こ', 'られる')
    case 'causative': return k('こ', 'させる')
    default: return null
  }
}

function suru(w: VerbWord, form: VerbFormId): Conjugated | null {
  const s = (add: string) => both(w, 2, add)
  switch (form) {
    case 'masu': return s('します')
    case 'masen': return s('しません')
    case 'mashita': return s('しました')
    case 'masendeshita': return s('しませんでした')
    case 'tai': return s('したい')
    case 'te': return s('して')
    case 'ta': return s('した')
    case 'nai': return s('しない')
    case 'nakatta': return s('しなかった')
    case 'dict': return one(w.dict, w.dictReading)
    case 'potential': return s('できる')
    case 'volitional': return s('しよう')
    case 'imperative': return s('しろ')
    case 'prohibitive': return s('するな')
    case 'ba': return s('すれば')
    case 'passive': return s('される')
    case 'causative': return s('させる')
    default: return null
  }
}

function adjective(w: VerbWord, form: VerbFormId): Conjugated | null {
  if (w.kind === 'adj-na') {
    const s = (add: string, ...alt: string[]) => one(w.dict + add, w.dictReading + add, alt.map((a) => ({ t: w.dict + a, r: w.dictReading + a })))
    switch (form) {
      case 'a-neg': return s('じゃありません', 'ではありません')
      case 'a-past': return s('でした')
      case 'a-pastneg': return s('じゃありませんでした', 'ではありませんでした')
      case 'a-te': return s('で')
      case 'a-plainneg': return s('じゃない', 'ではない')
      case 'a-plainpast': return s('だった')
      case 'a-plainpastneg': return s('じゃなかった', 'ではなかった')
      default: return null
    }
  }
  // いい → よ (よくない, よかった); tính từ い khác bỏ い
  const cut = w.kind === 'adj-ii' ? 2 : 1
  const base = w.kind === 'adj-ii' ? 'よ' : ''
  const s = (add: string, ...alt: string[]) => {
    const t = w.dict.slice(0, w.dict.length - cut) + base
    const r = w.dictReading.slice(0, w.dictReading.length - cut) + base
    return one(t + add, r + add, alt.map((a) => ({ t: t + a, r: r + a })))
  }
  switch (form) {
    case 'a-neg': return s('くないです', 'くありません')
    case 'a-past': return s('かったです')
    case 'a-pastneg': return s('くなかったです', 'くありませんでした')
    case 'a-te': return s('くて')
    case 'a-plainneg': return s('くない')
    case 'a-plainpast': return s('かった')
    case 'a-plainpastneg': return s('くなかった')
    default: return null
  }
}

/** Chia một từ ở một thể. null khi thể không áp dụng cho từ (vd. ある không có thể khả năng). */
export function conjugate(w: VerbWord, form: VerbFormId): Conjugated | null {
  const info = formInfo(form)
  if ((info.for === 'verb') !== isVerb(w.kind)) return null
  if (['potential', 'volitional', 'imperative', 'passive', 'causative'].includes(form) && NO_VOLITION.has(w.dict.replace(w.prefix ?? '', ''))) return null
  if (w.kind === 'v5-aru' && !['masu', 'masen', 'mashita', 'masendeshita', 'te', 'ta', 'nai', 'nakatta', 'dict', 'ba'].includes(form)) return null
  switch (w.kind as VerbKind) {
    case 'v5':
    case 'v5-iku':
    case 'v5-aru':
      return godan(w, form)
    case 'v1':
      return ichidan(w, form)
    case 'kuru':
      return kuru(w, form)
    case 'suru':
      return suru(w, form)
    default:
      return adjective(w, form)
  }
}

/** Mọi cách viết đúng của một thể (chữ viết và cách đọc). */
export function acceptedOf(c: Conjugated): string[] {
  return [c.t, c.r, ...c.alts.flatMap((a) => [a.t, a.r])]
}

/**
 * Đáp án nhiễu cho dạng chọn: lỗi chia hay gặp (nhầm nhóm, sai âm て/た, sai hàng あ), rồi các thể khác của cùng từ.
 * Không bao giờ trùng cách viết đúng.
 */
export function distractorsOf(w: VerbWord, form: VerbFormId, unlocked: readonly VerbFormId[]): string[] {
  const right = conjugate(w, form)
  if (!right) return []
  const ok = new Set(acceptedOf(right))
  const out: string[] = []
  const add = (x: string | null | undefined) => {
    if (x && !ok.has(x) && !out.includes(x)) out.push(x)
  }
  // Chia nhầm nhóm: nhóm I như nhóm II và ngược lại
  if (w.kind === 'v5' && w.dictReading.endsWith('る')) add(ichidan(w, form)?.t)
  if (w.kind === 'v1') add(godan({ ...w, kind: 'v5' }, form)?.t)
  if (w.kind === 'v5' || w.kind === 'v5-iku') {
    // Sai âm て/た
    if (form === 'te' || form === 'ta') {
      const i = form === 'te' ? 0 : 1
      for (const [, pair] of Object.entries(TE)) add(w.dict.slice(0, -1) + pair[i])
    }
    // ない từ う: あない thay vì わない
    if ((form === 'nai' || form === 'nakatta') && w.dictReading.endsWith('う')) add(w.dict.slice(0, -1) + (form === 'nai' ? 'あない' : 'あなかった'))
    if (w.kind === 'v5-iku' && (form === 'te' || form === 'ta')) add(w.dict.slice(0, -1) + (form === 'te' ? 'いて' : 'いた'))
  }
  if (w.kind === 'adj-na') {
    for (const wrong of ['くない', 'くないです', 'かった', 'かったです', 'くて', 'な']) if (form.startsWith('a-')) add(w.dict + wrong)
  }
  if (w.kind === 'adj-i' || w.kind === 'adj-ii') {
    for (const wrong of ['じゃない', 'じゃありません', 'でした', 'だった', 'で', 'いくない']) add(w.dict.slice(0, -1) + wrong.replace(/^い/, 'い'))
    add(w.dict + 'でした')
  }
  // Các thể khác của cùng từ (đã mở)
  for (const f of unlocked) if (f !== form) add(conjugate(w, f)?.t)
  return out
}
