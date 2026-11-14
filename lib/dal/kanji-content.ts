// Nội dung Kanji dùng chung, không phụ thuộc tiến độ người học: danh sách chữ, bộ thủ, hình chữ (KanjiVG),
// cặp chữ gần giống và các câu hỗ trợ dựng từ đó (V9 R12). Tách từ lib/dal/kanji.ts. Server-only.
import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { revealOf, type KanjiReveal, type KanjiRow } from '@/lib/kanji/questions'
import { buildPartsQuestion, buildSimilarQuestion, pickMatchItems, type KanjiPart, type KanjiVisualView, type PartsQuestion, type SimilarQuestion } from '@/lib/kanji/visual'
import type { MatchRoundData } from '@/lib/exercise/match-round'
import { readAllPages } from '@/lib/dal/pages'

type Supabase = Awaited<ReturnType<typeof createClient>>

export const KANJI_COLUMNS = 'id, character, han_viet, meaning_vi, onyomi, kunyomi, jlpt_level'

// ---------------------------------------------------------------------------
// Danh sách chữ (cache 10 phút)
// ---------------------------------------------------------------------------

export async function readAllKanji(supabase: Supabase): Promise<KanjiRow[]> {
  // Kanji hiện dưới 1000 chữ; vẫn đọc từng trang để thêm chữ không bị cắt
  return (await readAllPages('kanji', (from, to) => supabase.from('kanji').select(KANJI_COLUMNS).order('study_order').order('id').range(from, to))) as KanjiRow[]
}

let kanjiCache: { at: number; value: KanjiRow[] } | null = null

export async function readAllKanjiCached(supabase: Supabase): Promise<KanjiRow[]> {
  if (kanjiCache && Date.now() - kanjiCache.at < 10 * 60_000) return kanjiCache.value
  const value = await readAllKanji(supabase)
  kanjiCache = { at: Date.now(), value }
  return value
}

// ---------------------------------------------------------------------------
// V9 R12: dữ liệu Kanji trực quan (KanjiVG) cho thẻ, câu hỗ trợ, trang chi tiết chữ
// ---------------------------------------------------------------------------

let radicalCache: { at: number; value: Map<number, { character: string; name: string | null }> } | null = null

export async function readRadicals(supabase: Supabase): Promise<Map<number, { character: string; name: string | null }>> {
  if (radicalCache && Date.now() - radicalCache.at < 10 * 60_000) return radicalCache.value
  const { data, error } = await supabase.from('radicals').select('number, character, name_vi, approved').range(0, 299)
  if (error) {
    console.error(`Không đọc được radicals: ${error.message}`)
    return new Map()
  }
  // Tên tiếng Việt chỉ hiện khi chủ dự án đã duyệt
  const value = new Map((data ?? []).map((r) => [r.number as number, { character: r.character as string, name: r.approved ? (r.name_vi as string) : null }]))
  radicalCache = { at: Date.now(), value }
  return value
}

/** Bộ thủ, thành phần, nét viết của các chữ. Chữ chưa seed dữ liệu trực quan thì không có trong kết quả. */
export async function readKanjiVisuals(supabase: Supabase, kanjiIds: readonly string[]): Promise<Map<string, KanjiVisualView>> {
  if (kanjiIds.length === 0) return new Map()
  const [{ data, error }, radicals] = await Promise.all([
    supabase.from('kanji_visuals').select('kanji_id, radical_number, parts, strokes').in('kanji_id', [...kanjiIds]),
    readRadicals(supabase),
  ])
  // Hình chữ chỉ là phần phụ: đọc lỗi (vd. chưa chạy migration) thì vẫn học tiếp, chỉ không có hình
  if (error) {
    console.error(`Không đọc được kanji_visuals: ${error.message}`)
    return new Map()
  }
  return new Map(
    (data ?? []).map((r) => {
      const rad = r.radical_number === null ? null : radicals.get(r.radical_number as number)
      return [r.kanji_id as string, { radical: rad ? { character: rad.character, number: r.radical_number as number, name: rad.name } : null, parts: r.parts as KanjiPart[], strokes: r.strokes as string[] }]
    }),
  )
}

/** Thẻ học lại khi sai liên tiếp dùng reveal của câu, nên gắn hình chữ vào đó. */
export async function withVisual<T extends { reveal: KanjiReveal }>(supabase: Supabase, question: T, kanjiId: string): Promise<T> {
  const visual = (await readKanjiVisuals(supabase, [kanjiId])).get(kanjiId)
  return visual ? { ...question, reveal: { ...question.reveal, visual } } : question
}

/** Nét viết theo chữ, cho câu "viết rồi tự chấm" của Review. Chữ không có dữ liệu thì bỏ qua. */
export async function readStrokesByCharacter(supabase: Supabase, characters: readonly string[]): Promise<Map<string, string[]>> {
  if (characters.length === 0) return new Map()
  const { data, error } = await supabase.from('kanji').select('character, kanji_visuals(strokes)').in('character', [...new Set(characters)])
  if (error) {
    console.error(`Không đọc được nét viết: ${error.message}`)
    return new Map()
  }
  return new Map(
    ((data ?? []) as unknown as { character: string; kanji_visuals: { strokes: string[] } | { strokes: string[] }[] | null }[]).flatMap((r) => {
      const v = Array.isArray(r.kanji_visuals) ? r.kanji_visuals[0] : r.kanji_visuals
      return v?.strokes?.length ? [[r.character, v.strokes] as const] : []
    }),
  )
}

// ---------------------------------------------------------------------------
// V9 R12: câu hỗ trợ trong bài Learn (không điểm, không lịch)
// ---------------------------------------------------------------------------

let partsCache: { at: number; value: { kanjiId: string; character: string; parts: KanjiPart[] }[] } | null = null

/** Thành phần của mọi chữ, để lấy mảnh nhiễu cho câu ghép thành phần. */
async function readAllPartsCached(supabase: Supabase): Promise<{ kanjiId: string; character: string; parts: KanjiPart[] }[]> {
  if (partsCache && Date.now() - partsCache.at < 10 * 60_000) return partsCache.value
  let data: unknown[]
  try {
    data = await readAllPages('kanji_visuals', (from, to) => supabase.from('kanji_visuals').select('kanji_id, parts, kanji!inner(character)').order('kanji_id').range(from, to))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    return []
  }
  const value = (data as unknown as { kanji_id: string; parts: KanjiPart[]; kanji: { character: string } }[]).map((r) => ({ kanjiId: r.kanji_id, character: r.kanji.character, parts: r.parts }))
  partsCache = { at: Date.now(), value }
  return value
}

/** Dạng C: ghép thành phần. null khi chữ không có đúng hai thành phần trái–phải hoặc trên–dưới. */
export async function buildKanjiPartsFor(supabase: Supabase, kanjiId: string): Promise<PartsQuestion | null> {
  const [allKanji, allParts] = await Promise.all([readAllKanjiCached(supabase), readAllPartsCached(supabase)])
  const kanji = allKanji.find((k) => k.id === kanjiId)
  const own = allParts.find((p) => p.kanjiId === kanjiId)
  if (!kanji || !own) return null
  return buildPartsQuestion({ character: kanji.character, hanViet: kanji.han_viet, meaning: kanji.meaning_vi, parts: own.parts }, allParts)
}

/** Dạng E: phân biệt chữ gần giống, chỉ với cặp đã duyệt. */
export async function buildKanjiSimilarFor(supabase: Supabase, kanjiId: string): Promise<SimilarQuestion | null> {
  const kanji = (await readAllKanjiCached(supabase)).find((k) => k.id === kanjiId)
  if (!kanji) return null
  return buildSimilarQuestion({ character: kanji.character, hanViet: kanji.han_viet, meaning: kanji.meaning_vi }, await readSimilarFor(supabase, kanjiId))
}

/** Chữ gần giống đã duyệt của một chữ. Đọc lỗi thì coi như không có (chữ vẫn học được, không bị kẹt điều kiện hoàn tất). */
export async function readSimilarFor(supabase: Supabase, kanjiId: string): Promise<{ other: string; explanation: string }[]> {
  const { data, error } = await supabase.from('kanji_similar_pairs').select('kanji_a, kanji_b, explanation').eq('approved', true).or(`kanji_a.eq.${kanjiId},kanji_b.eq.${kanjiId}`).range(0, 19)
  if (error) {
    console.error(`Không đọc được kanji_similar_pairs: ${error.message}`)
    return []
  }
  const byId = new Map((await readAllKanjiCached(supabase)).map((k) => [k.id, k]))
  return (data ?? []).flatMap((p) => {
    const other = byId.get(p.kanji_a === kanjiId ? p.kanji_b : p.kanji_a)
    return other ? [{ other: other.character, explanation: p.explanation as string }] : []
  })
}

/** Nghĩa dài quá thì ô ghép không hiển thị nổi trên điện thoại. */
const MATCH_TEXT_MAX = 40

/** Dạng F: ghép chữ với nghĩa hoặc Hán Việt, từ các chữ đã gặp trong bài. Cần ít nhất 4 chữ. */
export async function buildKanjiMatchRound(supabase: Supabase, kanjiIds: readonly string[]): Promise<MatchRoundData | null> {
  const ids = new Set(kanjiIds)
  const items = (await readAllKanjiCached(supabase))
    .filter((k) => ids.has(k.id))
    .map((k) => {
      const reveal = revealOf(k)
      return { id: k.id, character: k.character, hanViet: k.han_viet, meaning: k.meaning_vi, reading: reveal.onyomi[0] ?? reveal.kunyomi[0] ?? '' }
    })
  const by = Math.random() < 0.5 ? 'meaning' : 'hanViet'
  const picked = pickMatchItems(items.filter((k) => (by === 'meaning' ? k.meaning : k.hanViet).length <= MATCH_TEXT_MAX), by)
  if (!picked) return null
  const order = picked.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return {
    kind: 'match',
    clientEventId: randomUUID(),
    pairType: by === 'meaning' ? 'kanji_meaning' : 'kanji_hanviet',
    pairs: picked.map((k) => ({ learnerVocabularyId: k.id, clientEventId: randomUUID(), left: k.character, right: by === 'meaning' ? k.meaning : k.hanViet, reading: k.reading.replace(/[.-]/g, '') })),
    rightOrder: order,
  }
}
