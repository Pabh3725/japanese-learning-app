// Đọc JMdict (EDRDG, CC BY-SA 4.0) đủ để biết một từ có "thường viết bằng Kana" không.
// Pure: nhận chuỗi XML, không đọc file. File gốc không nằm trong repo (xem scripts/policy/propose.ts).

export interface JmKanji {
  text: string
  /** Mã ke_inf, ví dụ 'rK', 'oK', 'sK', 'ateji', 'iK'. */
  info: string[]
}

export interface JmReading {
  text: string
  /** re_restr: cách đọc chỉ dùng cho các cách viết này; rỗng = mọi cách viết. */
  restrict: string[]
  noKanji: boolean
}

export interface JmSense {
  /** Mã misc, ví dụ 'uk'. */
  misc: string[]
  pos: string[]
  /** stagk: nghĩa chỉ dùng cho các cách viết này; rỗng = mọi cách viết. */
  kanjiRestrict: string[]
}

export interface JmEntry {
  seq: number
  kanji: JmKanji[]
  readings: JmReading[]
  senses: JmSense[]
}

const all = (block: string, tag: string): string[] => {
  const out: string[] = []
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g')
  for (let m = re.exec(block); m; m = re.exec(block)) out.push(m[1])
  return out
}

/** Thực thể như &uk; → 'uk'. */
const entity = (s: string) => s.trim().replace(/^&/, '').replace(/;$/, '')

export function parseJmdict(xml: string): JmEntry[] {
  const entries: JmEntry[] = []
  for (const block of all(xml, 'entry')) {
    entries.push({
      seq: Number(all(block, 'ent_seq')[0] ?? 0),
      kanji: all(block, 'k_ele').map((k) => ({ text: all(k, 'keb')[0] ?? '', info: all(k, 'ke_inf').map(entity) })),
      readings: all(block, 'r_ele').map((r) => ({
        text: all(r, 'reb')[0] ?? '',
        restrict: all(r, 're_restr'),
        noKanji: r.includes('<re_nokanji'),
      })),
      senses: all(block, 'sense').map((s) => ({ misc: all(s, 'misc').map(entity), pos: all(s, 'pos').map(entity), kanjiRestrict: all(s, 'stagk') })),
    })
  }
  return entries
}

export type JmIndex = Map<string, JmEntry[]>

/** Tra theo cách viết Kanji. */
export function indexByKanji(entries: readonly JmEntry[]): JmIndex {
  const index: JmIndex = new Map()
  for (const entry of entries) {
    for (const k of entry.kanji) index.set(k.text, [...(index.get(k.text) ?? []), entry])
  }
  return index
}

export interface JmMatch {
  seq: number
  /** Cách viết đã tìm thấy (có thể là thể từ điển của động từ thể ます). */
  form: string
  reading: string
  /** Nghĩa đầu tiên dùng được cho cách viết này có nhãn uk. */
  usuallyKana: boolean
  /** Cách viết này bị JMdict đánh dấu hiếm, cũ hoặc ateji. */
  rareForm: string[]
  /** Ghi chú cách tra: 'exact', 'masu→dictionary', 'する', 'bỏ お/ご'. */
  via: string
}

const RARE_FORM_TAGS = new Set(['rK', 'oK', 'sK', 'iK', 'io'])

function match(index: JmIndex, form: string, reading: string, via: string): JmMatch | null {
  for (const entry of index.get(form) ?? []) {
    const readingOk = entry.readings.some((r) => r.text === reading && !r.noKanji && (r.restrict.length === 0 || r.restrict.includes(form)))
    if (!readingOk) continue
    const kanji = entry.kanji.find((k) => k.text === form)!
    const sense = entry.senses.find((s) => s.kanjiRestrict.length === 0 || s.kanjiRestrict.includes(form))
    return {
      seq: entry.seq,
      form,
      reading,
      usuallyKana: sense?.misc.includes('uk') ?? false,
      rareForm: kanji.info.filter((tag) => RARE_FORM_TAGS.has(tag)),
      via,
    }
  }
  return null
}

const I_TO_U: Record<string, string> = { き: 'く', ぎ: 'ぐ', し: 'す', ち: 'つ', に: 'ぬ', び: 'ぶ', み: 'む', り: 'る', い: 'う' }

/** Các cách viết thử tra, theo thứ tự ưu tiên. Giáo trình ghi động từ ở thể ます nên phải đổi về thể từ điển. */
export function lookupCandidates(expression: string, reading: string): { form: string; reading: string; via: string }[] {
  const out = [{ form: expression, reading, via: 'exact' }]
  if (expression.endsWith('ます') && reading.endsWith('ます')) {
    const e = expression.slice(0, -2)
    const r = reading.slice(0, -2)
    if (expression === '来ます' && reading === 'きます') out.push({ form: '来る', reading: 'くる', via: 'masu→dictionary' })
    if (e.endsWith('し') && r.endsWith('し') && e.length > 1) {
      out.push({ form: e.slice(0, -1), reading: r.slice(0, -1), via: 'する' })
      out.push({ form: `${e.slice(0, -1)}する`, reading: `${r.slice(0, -1)}する`, via: 'する' })
    }
    const last = e.at(-1)!
    if (I_TO_U[last] && r.at(-1) === last) {
      out.push({ form: e.slice(0, -1) + I_TO_U[last], reading: r.slice(0, -1) + I_TO_U[last], via: 'masu→dictionary' })
    }
    out.push({ form: `${e}る`, reading: `${r}る`, via: 'masu→dictionary' })
  }
  for (const c of [...out]) {
    if ((c.form.startsWith('お') || c.form.startsWith('ご')) && c.reading.startsWith(c.form[0]) && c.form.length > 1) {
      out.push({ form: c.form.slice(1), reading: c.reading.slice(1), via: `${c.via}, bỏ お/ご` })
    }
  }
  return out
}

export function lookupWord(index: JmIndex, expression: string, reading: string): JmMatch | null {
  for (const c of lookupCandidates(expression, reading)) {
    const found = match(index, c.form, c.reading, c.via)
    if (found) return found
  }
  return null
}
