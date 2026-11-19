// Nội dung Kanji dùng chung, không phụ thuộc tiến độ người học: danh sách chữ, bộ thủ, hình chữ (KanjiVG),
// cặp chữ gần giống và các câu hỗ trợ dựng từ đó (V9 R12). Tách từ lib/dal/kanji.ts. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { type KanjiRow } from '@/lib/kanji/questions'
import { type KanjiPart, type KanjiVisualView } from '@/lib/kanji/visual'
import { readAllPages } from '@/lib/dal/pages'

type Supabase = Awaited<ReturnType<typeof createClient>>

export const KANJI_COLUMNS = 'id, character, han_viet, meaning_vi, onyomi, kunyomi, jlpt_level'

// ---------------------------------------------------------------------------
// Danh sách chữ (cache 10 phút)
// ---------------------------------------------------------------------------

export async function readAllKanji(supabase: Supabase): Promise<KanjiRow[]> {
  // Kanji hiện dưới 1000 chữ; vẫn đọc từng trang để thêm chữ không bị cắt
  // Thứ tự trả về là study_order; kèm số nét để xếp thứ tự mở chữ mới (V12)
  return (await readAllPages('kanji', (from, to) => supabase.from('kanji').select(`${KANJI_COLUMNS}, stroke_count`).order('study_order').order('id').range(from, to))) as KanjiRow[]
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

// ---------------------------------------------------------------------------
// V9 R12: câu hỗ trợ trong bài Learn (không điểm, không lịch)
// ---------------------------------------------------------------------------
