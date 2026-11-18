// V12: kho nội dung của ba khu (đọc chung cho mọi người học, lưu tạm 10 phút). Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { readAllPages } from '@/lib/dal/pages'
import { radicalOrder } from '@/lib/v12/order'
import type { KanaWordItem, KanjiItem, RadicalItem, WordKanjiItem } from '@/lib/v12/questions'

type Supabase = Awaited<ReturnType<typeof createClient>>
const TTL = 10 * 60_000

export interface ContentWord extends KanaWordItem {
  level: number | null
  sortOrder: number
  /** Từ "chỉ Kana" theo chính sách Kanji: không có thẻ Từ vựng Kanji. */
  kanaOnly: boolean
  /** Chữ Kanji của từ (theo vocabulary_kanji). */
  kanji: string[]
  expression: string
}

export interface ContentKanji extends KanjiItem {
  level: number | null
  freq: number | null
  strokes: number | null
  /** Bộ thủ có trong chữ (số bộ). */
  radicals: number[]
  /** Chữ Kanji là thành phần của chữ này. */
  components: string[]
}

export interface ContentRadical extends RadicalItem {
  number: number
  n5n4Kanji: number
  examples: string
}

export interface V12Content {
  words: ContentWord[]
  /** Bộ trong phạm vi học, theo thứ tự học (§5.1). */
  radicals: ContentRadical[]
  kanji: ContentKanji[]
  /** Từ có dạng Kanji học được (không "chỉ Kana", có Hán Việt). */
  wordKanji: (WordKanjiItem & { level: number | null; kanji: string[] })[]
}

let cache: { at: number; value: V12Content } | null = null

type Part = { c?: string; original?: string; parts?: Part[] }

export async function readV12Content(supabase: Supabase): Promise<V12Content> {
  if (cache && Date.now() - cache.at < TTL) return cache.value
  const [vocab, links, kanjiRows, radicalRows, visuals, pairs] = await Promise.all([
    readAllPages('vocabularies', (from, to) =>
      supabase.from('vocabularies').select('id, code, expression, reading_kana, meaning_vi, han_viet, is_kana_only, jlpt_level, sort_order, kanji_policy').order('sort_order').range(from, to),
    ),
    readAllPages('vocabulary_kanji', (from, to) => supabase.from('vocabulary_kanji').select('vocabulary_id, position, kanji(character)').order('vocabulary_id').order('position').range(from, to)),
    readAllPages('kanji', (from, to) => supabase.from('kanji').select('id, character, han_viet, meaning_vi, jlpt_level, stroke_count, freq_rank').order('id').range(from, to)),
    readAllPages('radicals', (from, to) => supabase.from('radicals').select('number, character, name_vi, variants, meaning_vi, n5n4_kanji, meaning_approved').order('number').range(from, to)),
    readAllPages('kanji_visuals', (from, to) => supabase.from('kanji_visuals').select('kanji_id, radical_number, parts').order('kanji_id').range(from, to)),
    readAllPages('kanji_similar_pairs', (from, to) =>
      supabase.from('kanji_similar_pairs').select('a:kanji!kanji_similar_pairs_kanji_a_fkey(character), b:kanji!kanji_similar_pairs_kanji_b_fkey(character)').eq('approved', true).order('kanji_a').order('kanji_b').range(from, to),
    ),
  ])

  const kanjiOf = new Map<string, string[]>()
  for (const l of links as unknown as { vocabulary_id: string; kanji: { character: string } | null }[]) {
    if (l.kanji) kanjiOf.set(l.vocabulary_id, [...(kanjiOf.get(l.vocabulary_id) ?? []), l.kanji.character])
  }
  const words: ContentWord[] = vocab.map((v) => ({
    id: v.id as string,
    kana: v.reading_kana as string,
    expression: v.expression as string,
    meaning: v.meaning_vi as string,
    hanViet: (v.han_viet as string | null) ?? null,
    level: (v.jlpt_level as number | null) ?? null,
    sortOrder: v.sort_order as number,
    kanaOnly: (v.is_kana_only as boolean) || v.kanji_policy === 'KANA_ONLY',
    kanji: kanjiOf.get(v.id as string) ?? [],
  }))

  // Bộ thủ: số bộ theo hình (kể cả biến thể), để tìm bộ trong thành phần của chữ
  const allRadicals = radicalRows as { number: number; character: string; name_vi: string; variants: string; meaning_vi: string | null; n5n4_kanji: number; meaning_approved: boolean }[]
  const numberOf = new Map<string, number>()
  for (const r of allRadicals) numberOf.set(r.character, r.number)
  for (const r of allRadicals) for (const v of r.variants) if (!numberOf.has(v)) numberOf.set(v, r.number)
  const scope = new Set(radicalOrder(allRadicals.filter((r) => r.meaning_approved && r.meaning_vi).map((r) => ({ number: r.number, n5n4Kanji: r.n5n4_kanji }))))
  const radicals: ContentRadical[] = radicalOrder(allRadicals.filter((r) => scope.has(r.number)).map((r) => ({ number: r.number, n5n4Kanji: r.n5n4_kanji }))).map((n) => {
    const r = allRadicals.find((x) => x.number === n)!
    return { id: String(n), number: n, char: r.variants ? `${r.character} · ${[...r.variants].join(' ')}` : r.character, name: r.name_vi.replace(/^Bộ /, ''), meaning: r.meaning_vi!, n5n4Kanji: r.n5n4_kanji, examples: '' }
  })

  const kanjiChars = new Set((kanjiRows as { character: string }[]).map((k) => k.character))
  const visualOf = new Map((visuals as { kanji_id: string; radical_number: number | null; parts: Part[] }[]).map((v) => [v.kanji_id, v]))
  const similar = new Map<string, string[]>()
  for (const p of pairs as unknown as { a: { character: string }; b: { character: string } }[]) {
    similar.set(p.a.character, [...(similar.get(p.a.character) ?? []), p.b.character])
    similar.set(p.b.character, [...(similar.get(p.b.character) ?? []), p.a.character])
  }
  const kanji: ContentKanji[] = (kanjiRows as { id: string; character: string; han_viet: string; meaning_vi: string; jlpt_level: number | null; stroke_count: number | null; freq_rank: number | null }[]).map((k) => {
    const v = visualOf.get(k.id)
    const rads = new Set<number>()
    const comps = new Set<string>()
    if (v?.radical_number) rads.add(v.radical_number)
    const walk = (parts: Part[] = []) => {
      for (const p of parts) {
        for (const ch of [p.c, p.original]) {
          if (!ch) continue
          if (numberOf.has(ch)) rads.add(numberOf.get(ch)!)
          if (ch !== k.character && kanjiChars.has(ch)) comps.add(ch)
        }
        walk(p.parts)
      }
    }
    walk(v?.parts)
    return {
      id: k.id,
      char: k.character,
      hanViet: k.han_viet,
      meaning: k.meaning_vi,
      similar: similar.get(k.character) ?? [],
      level: k.jlpt_level,
      freq: k.freq_rank,
      strokes: k.stroke_count,
      radicals: [...rads],
      components: [...comps],
    }
  })

  const wordKanji = words
    .filter((w) => !w.kanaOnly && w.hanViet && w.kanji.length > 0 && w.expression !== w.kana)
    .map((w) => ({ id: w.id, expression: w.expression, kana: w.kana, hanViet: w.hanViet!, meaning: w.meaning, level: w.level, kanji: w.kanji }))

  const value = { words, radicals, kanji, wordKanji }
  cache = { at: Date.now(), value }
  return value
}
