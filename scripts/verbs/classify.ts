// Phân loại động từ / tính từ từ danh sách từ vựng + JMdict. Pure (nhận dữ liệu đã đọc).
import type { JmEntry } from '../policy/jmdict'
import type { VerbKind, VerbWord } from '../../lib/verbs/types'

export type { VerbKind }

interface Row {
  code: string
  expression: string
  reading: string
  meaning: string
  lesson: number
  level: number
}

export interface ManualEntry {
  kind?: VerbKind
  dict?: string
  dictReading?: string
  skip?: boolean
  note?: string
}

const KANJI = /[一-鿿㐀-䶿々〆]/
const I_ROW: Record<string, string> = { き: 'く', ぎ: 'ぐ', し: 'す', ち: 'つ', に: 'ぬ', び: 'ぶ', み: 'む', り: 'る', い: 'う' }
const E_ROW = new Set([...'えけげせぜてでねへべぺめれ'])
const I_ROW_SET = new Set([...'いきぎしじちぢにひびぴみり'])
const PARTICLES = ['を', 'が', 'に', 'で', 'と', 'へ']

/** Kính ngữ (bài 49–50) và động từ kính ngữ ở bài khác: khu Grammar đã dạy, không chia ở đây. */
const HONORIFIC = new Set(['召し上がります', 'おっしゃいます', 'なさいます', 'ご覧になります', '参ります', 'おります', '申します', 'いたします', '拝見します', '存じます', '伺います', 'お目にかかります', 'いただきます'])

/** Các nhóm động từ có trong danh sách từ loại (một cách đọc có thể ứng với nhiều mục JMdict). */
function kindsOfPos(pos: string[]): Set<VerbKind> {
  const out = new Set<VerbKind>()
  if (pos.includes('vk')) out.add('kuru')
  if (pos.some((p) => p === 'vs-i' || p === 'vs-s')) out.add('suru')
  if (pos.includes('v5k-s')) out.add('v5-iku')
  if (pos.includes('v5r-i')) out.add('v5-aru')
  if (pos.some((p) => /^v5[a-z]$/.test(p) || p === 'v5u-s')) out.add('v5')
  if (pos.includes('v1') || pos.includes('v1-s')) out.add('v1')
  return out
}

/** Tính từ な được dạy trong Minna (chọn tay; JMdict ghi adj-na cho cả nhiều danh từ, phó từ). */
const NA_ADJECTIVES = new Set(['ハンサム', 'きれい', '静か', '賑やか', '有名', '親切', '元気', '暇', '便利', 'すてき', '好き', '嫌い', '上手', '下手', 'いろいろ', '簡単', '大変', '大切', '大丈夫', '無理', 'むだ', '不便', '大好き', 'まじめ', '熱心', '嫌', '十分', 'だめ', '楽', '必要', '特別', '安全', '豪華', '不思議', '複雑', '邪魔', '危険', '平和', '丈夫', '変', '幸せ', '適当', '丁寧'])

export function classify(rows: readonly Row[], entries: readonly JmEntry[], manual: Record<string, ManualEntry>, skip: ReadonlySet<string>) {
  const byKanji = new Map<string, JmEntry[]>()
  const byReading = new Map<string, JmEntry[]>()
  for (const e of entries) {
    for (const k of e.kanji) byKanji.set(k.text, [...(byKanji.get(k.text) ?? []), e])
    for (const r of e.readings) byReading.set(r.text, [...(byReading.get(r.text) ?? []), e])
  }
  /** Từ loại của (cách viết, cách đọc) trong JMdict. */
  const posOf = (t: string, r: string): string[] => {
    const list = KANJI.test(t) ? (byKanji.get(t) ?? []).filter((e) => e.readings.some((x) => x.text === r)) : (byReading.get(r) ?? []).filter((e) => e.kanji.length === 0 || e.readings.some((x) => x.text === r && (x.noKanji || true)))
    return list.flatMap((e) => e.senses.flatMap((s) => s.pos))
  }

  const words: VerbWord[] = []
  const notes = { lookalike: [] as string[], irregular: [] as string[], phrase: [] as string[], ambiguous: [] as string[], na: [] as string[], skipped: [] as string[] }
  const line = (r: Row, extra: string) => `- \`${r.code}\` ${r.expression}（${r.reading}）· ${r.meaning} · bài ${r.lesson} — ${extra}`

  for (const r of rows) {
    if (r.lesson < 1 || r.lesson > 50) continue
    const m = manual[r.code]
    if (skip.has(r.expression) || m?.skip) {
      if (r.reading.endsWith('ます')) notes.skipped.push(line(r, m?.note ?? 'câu chào / cụm cố định'))
      continue
    }

    if (r.expression.endsWith('ます') && r.reading.endsWith('ます')) {
      if (HONORIFIC.has(r.expression)) {
        notes.skipped.push(line(r, 'kính ngữ (đã dạy trong Grammar)'))
        continue
      }
      // Tách tiền tố của cụm từ: thử cả cụm trước, rồi phần sau trợ từ cuối
      const splits: { pt: string; pr: string; vt: string; vr: string }[] = [{ pt: '', pr: '', vt: r.expression, vr: r.reading }]
      for (const p of PARTICLES) {
        const it = r.expression.lastIndexOf(p)
        const ir = r.reading.lastIndexOf(p)
        if (it > 0 && ir > 0 && it < r.expression.length - 3) splits.push({ pt: r.expression.slice(0, it + 1), pr: r.reading.slice(0, ir + 1), vt: r.expression.slice(it + 1), vr: r.reading.slice(ir + 1) })
      }
      let chosen: (VerbWord & { alts: string[] }) | null = null
      for (const sp of splits) {
        const st = sp.vt.slice(0, -2)
        const sr = sp.vr.slice(0, -2)
        const found: { t: string; r: string; kind: VerbKind }[] = []
        const tryForm = (t: string, rr: string, want: 'v5' | 'v1') => {
          const ks = kindsOfPos(posOf(t, rr))
          const k = want === 'v1' ? (ks.has('v1') ? 'v1' : null) : ks.has('v5-iku') ? 'v5-iku' : ks.has('v5-aru') ? 'v5-aru' : ks.has('v5') ? 'v5' : null
          if (k) found.push({ t, r: rr, kind: k })
        }
        if (sp.vt === '来ます' || (sp.vt === 'きます' && sp.vr === 'きます' && sp.pt)) found.push({ t: '来る', r: 'くる', kind: 'kuru' })
        else if (st.endsWith('来') && sr.endsWith('き')) found.push({ t: `${st}る`, r: `${sr.slice(0, -1)}くる`, kind: 'kuru' })
        if (sr.endsWith('し')) {
          // します: する / Nします (danh từ + する) / động từ nhóm I đuôi す
          if (sr === 'し') found.push({ t: 'する', r: 'する', kind: 'suru' })
          else {
            tryForm(`${st.slice(0, -1)}す`, `${sr.slice(0, -1)}す`, 'v5')
            const noun = st.slice(0, -1)
            const nounR = sr.slice(0, -1)
            if (posOf(noun, nounR).some((p) => p.startsWith('vs')) || posOf(`${noun}する`, `${nounR}する`).some((p) => p.startsWith('vs'))) found.push({ t: `${noun}する`, r: `${nounR}する`, kind: 'suru' })
          }
        } else {
          const last = sr.at(-1)!
          if (I_ROW[last]) tryForm(`${st.slice(0, -1)}${I_ROW[last]}`, `${sr.slice(0, -1)}${I_ROW[last]}`, 'v5')
          if (I_ROW_SET.has(last) || E_ROW.has(last)) tryForm(`${st}る`, `${sr}る`, 'v1')
        }
        const uniq = found.filter((f, i) => found.findIndex((g) => g.t === f.t && g.kind === f.kind) === i)
        if (uniq.length === 0) continue
        const pick = m?.kind ? uniq.find((f) => f.kind === m.kind) ?? uniq[0] : uniq[0]
        chosen = {
          code: r.code, expression: r.expression, reading: r.reading, meaning: r.meaning, lesson: r.lesson, level: r.level,
          kind: m?.kind ?? pick.kind, dict: m?.dict ?? (sp.pt + pick.t), dictReading: m?.dictReading ?? (sp.pr + pick.r),
          prefix: sp.pt || undefined, prefixReading: sp.pr || undefined,
          alts: uniq.filter((f) => f !== pick).map((f) => `${f.t}（${f.kind}）`),
        }
        break
      }
      if (!chosen && m?.kind && m.dict && m.dictReading) {
        chosen = { code: r.code, expression: r.expression, reading: r.reading, meaning: r.meaning, lesson: r.lesson, level: r.level, kind: m.kind, dict: m.dict, dictReading: m.dictReading, alts: [] }
      }
      if (!chosen) {
        notes.skipped.push(line(r, 'không tìm thấy trong JMdict'))
        continue
      }
      const { alts, ...word } = chosen
      words.push(word)
      const desc = `${word.dict}（${word.dictReading}）· ${word.kind}`
      if (alts.length && !m?.kind) notes.ambiguous.push(line(r, `${desc}; cách khác: ${alts.join(', ')}`))
      if (word.prefix) notes.phrase.push(line(r, `${desc}; tiền tố ${word.prefix}`))
      if (['kuru', 'suru', 'v5-iku', 'v5-aru'].includes(word.kind) && !word.dict.endsWith('する')) notes.irregular.push(line(r, desc))
      const stemLast = word.dictReading.at(-2)
      if (word.kind === 'v5' && word.dictReading.endsWith('る') && stemLast && (I_ROW_SET.has(stemLast) || E_ROW.has(stemLast))) notes.lookalike.push(line(r, `${desc} — đuôi -${stemLast}る nhưng là nhóm I`))
      continue
    }

    // Tính từ
    const pos = posOf(r.expression, r.reading)
    if (r.reading.endsWith('いい') || r.expression.endsWith('いい')) {
      const prefix = r.expression.slice(0, -2)
      const prefixR = r.reading.slice(0, -2)
      if (pos.includes('adj-ix') || prefix === '' || PARTICLES.some((p) => prefix.endsWith(p))) {
        words.push({ code: r.code, expression: r.expression, reading: r.reading, meaning: r.meaning, lesson: r.lesson, level: r.level, kind: 'adj-ii', dict: r.expression, dictReading: r.reading, prefix: prefix || undefined, prefixReading: prefixR || undefined })
        notes.irregular.push(line(r, 'いい → よくない, よかった'))
        continue
      }
    }
    if (pos.includes('adj-i') && r.reading.endsWith('い')) {
      words.push({ code: r.code, expression: r.expression, reading: r.reading, meaning: r.meaning, lesson: r.lesson, level: r.level, kind: 'adj-i', dict: r.expression, dictReading: r.reading })
      continue
    }
    if (NA_ADJECTIVES.has(r.expression) && pos.includes('adj-na')) {
      words.push({ code: r.code, expression: r.expression, reading: r.reading, meaning: r.meaning, lesson: r.lesson, level: r.level, kind: 'adj-na', dict: r.expression, dictReading: r.reading })
      notes.na.push(line(r, ''))
    }
  }
  return { words, notes }
}
