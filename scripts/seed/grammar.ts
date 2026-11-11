// Grammar G2: kiểm tra và seed nội dung ngữ pháp (data/grammar/lesson-NN.json). Luật kiểm tra: docs/grammar-rules.md §4.4.
// Chỉ ghi dòng khác với database. Câu có trong database mà không còn trong file thì bị ẩn (hidden), không xoá, vì nhật ký trỏ tới.
import {
  exercisesFor,
  GRAMMAR_EXERCISES,
  KANA_ONLY,
  KANJI_CHAR,
  sentenceText,
  type GrammarExercise,
  type GrammarLessonFile,
  type GrammarPiece,
  type GrammarPointData,
} from '../../lib/grammar/types'
import type { Row, SeedDb } from './run'

/** Số câu gốc mỗi mẫu, số câu tối thiểu mỗi mức, số dạng tối thiểu (§4.4, §6.4). */
export const SENTENCES_PER_POINT = 30
const MIN_PER_LEVEL = 6
const MIN_DISTINCT_EXERCISES = 8
const MIN_DISTRACTORS = 3

export interface GrammarIssue {
  file: string
  where: string
  message: string
}

export interface GrammarData {
  points: (GrammarPointData & { lesson: number })[]
  errors: GrammarIssue[]
  warnings: GrammarIssue[]
}

const POINT_CODE = /^g(\d{2})-(\d{2})$/
const SENTENCE_CODE = /^g\d{2}-\d{2}-s\d{2}$/

function checkPieces(pieces: unknown, where: string, add: (where: string, message: string) => void): pieces is GrammarPiece[] {
  if (!Array.isArray(pieces) || pieces.length === 0) {
    add(where, 'pieces phải là mảng không rỗng')
    return false
  }
  pieces.forEach((p: GrammarPiece, i) => {
    if (!p || typeof p.t !== 'string' || p.t.trim() === '') add(`${where} mảnh ${i}`, 'thiếu chữ (t)')
    else if (KANJI_CHAR.test(p.t)) {
      if (typeof p.r !== 'string' || !KANA_ONLY.test(p.r)) add(`${where} mảnh ${i}`, `"${p.t}" có Kanji nên cần cách đọc (r) bằng kana`)
    } else if (p.r !== undefined) add(`${where} mảnh ${i}`, `"${p.t}" không có Kanji, bỏ cách đọc (r)`)
  })
  return true
}

/**
 * Kiểm tra mọi file. `vocabKanjiByLesson(n)`: các chữ Kanji xuất hiện trong từ vựng bài ≤ n (để cảnh báo chữ ngoài lộ trình).
 */
export function validateGrammar(files: { name: string; text: string }[], vocabKanjiByLesson: (lesson: number) => ReadonlySet<string>): GrammarData {
  const errors: GrammarIssue[] = []
  const warnings: GrammarIssue[] = []
  const points: GrammarData['points'] = []
  const seenPoint = new Map<string, string>()
  const seenSentence = new Map<string, string>()

  for (const file of files) {
    const err = (where: string, message: string) => errors.push({ file: file.name, where, message })
    const warn = (where: string, message: string) => warnings.push({ file: file.name, where, message })
    let data: GrammarLessonFile
    try {
      data = JSON.parse(file.text) as GrammarLessonFile
    } catch (e) {
      err('file', `JSON lỗi: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
    if (!Number.isInteger(data.lesson) || data.lesson < 1 || data.lesson > 50) {
      err('lesson', 'lesson phải là 1–50')
      continue
    }
    if (!Array.isArray(data.points)) {
      err('points', 'points phải là mảng')
      continue
    }
    const known = vocabKanjiByLesson(data.lesson)
    for (const point of data.points) {
      const pw = point.code ?? '?'
      const m = POINT_CODE.exec(point.code ?? '')
      if (!m) {
        err(pw, 'code mẫu phải dạng gNN-NN')
        continue
      }
      if (Number(m[1]) !== data.lesson) err(pw, `code mẫu thuộc bài ${Number(m[1])} nhưng file là bài ${data.lesson}`)
      if (Number(m[2]) !== point.order) err(pw, 'order phải khớp số cuối của code')
      if (seenPoint.has(point.code)) err(pw, `trùng với ${seenPoint.get(point.code)}`)
      seenPoint.set(point.code, file.name)
      for (const field of ['pattern', 'meaning', 'explanation'] as const) {
        if (typeof point[field] !== 'string' || point[field].trim() === '') err(pw, `thiếu ${field}`)
      }
      if (typeof point.approved !== 'boolean') err(pw, 'approved phải là true/false')
      if (!Array.isArray(point.sentences)) {
        err(pw, 'sentences phải là mảng')
        continue
      }

      const visible = point.sentences.filter((s) => !s.hidden)
      if (visible.length < SENTENCES_PER_POINT) (point.approved ? err : warn)(pw, `có ${visible.length} câu, cần ${SENTENCES_PER_POINT}`)
      const samples = point.sentences.filter((s) => s.sample && !s.hidden).length
      if (point.approved && samples < 5) err(pw, `đã duyệt nhưng chỉ có ${samples} câu tiêu biểu (cần 5)`)
      for (const level of [1, 2, 3] as const) {
        const n = visible.filter((s) => s.level === level).length
        if (n < MIN_PER_LEVEL) warn(pw, `mức ${level} chỉ có ${n} câu (nên ≥ ${MIN_PER_LEVEL})`)
      }
      const texts = new Map<string, string>()
      const meanings = new Map<string, string>()
      const types = new Set<GrammarExercise>()

      for (const s of point.sentences) {
        const sw = s.code ?? `${pw} câu ?`
        if (!SENTENCE_CODE.test(s.code ?? '') || !s.code.startsWith(`${point.code}-`)) err(sw, `code câu phải dạng ${point.code}-sNN`)
        if (seenSentence.has(s.code)) err(sw, `trùng với ${seenSentence.get(s.code)}`)
        seenSentence.set(s.code, file.name)
        if (s.level !== 1 && s.level !== 2 && s.level !== 3) err(sw, 'level phải là 1, 2 hoặc 3')
        if (typeof s.meaning !== 'string' || s.meaning.trim() === '') err(sw, 'thiếu nghĩa tiếng Việt')
        if (!checkPieces(s.pieces, sw, err)) continue
        const text = sentenceText(s.pieces)
        // Cùng một câu mà khác nghĩa thì dạng chọn nghĩa có hai đáp án đúng
        if (texts.has(text) && !s.hidden) err(sw, `trùng câu với ${texts.get(text)}`)
        texts.set(text, s.code)
        for (const ch of text) if (KANJI_CHAR.test(ch) && !known.has(ch)) warn(sw, `chữ ${ch} chưa có trong từ vựng tới bài ${data.lesson}`)

        for (const [i, slot] of (s.slots ?? []).entries()) {
          const where = `${sw} slot ${i}`
          const piece = s.pieces[slot.piece]
          if (!piece) {
            err(where, `piece ${slot.piece} không có trong câu`)
            continue
          }
          if (!['particle', 'word', 'form'].includes(slot.kind)) err(where, 'kind phải là particle, word hoặc form')
          const answer = piece.t
          const accepted = new Set([answer, ...(slot.accepted ?? [])])
          if (!Array.isArray(slot.distractors) || slot.distractors.length < MIN_DISTRACTORS) err(where, `cần ít nhất ${MIN_DISTRACTORS} đáp án nhiễu`)
          for (const d of slot.distractors ?? []) if (accepted.has(d)) err(where, `đáp án nhiễu "${d}" cũng là đáp án đúng`)
          if (new Set(slot.distractors ?? []).size !== (slot.distractors ?? []).length) err(where, 'đáp án nhiễu bị trùng')
          if (slot.kind === 'form' && (!slot.form || !slot.dict)) err(where, 'slot form cần form (thể) và dict (dạng từ điển)')
        }
        if (s.split !== undefined && (!Number.isInteger(s.split) || s.split < 1 || s.split >= s.pieces.length)) err(sw, 'split phải nằm giữa câu')
        if (s.prompt) {
          checkPieces(s.prompt.pieces, `${sw} prompt`, err)
          if (typeof s.prompt.meaning !== 'string' || s.prompt.meaning.trim() === '') err(sw, 'prompt thiếu nghĩa')
          const reply = sentenceText(s.pieces)
          if (!Array.isArray(s.prompt.distractors) || s.prompt.distractors.length < MIN_DISTRACTORS) err(sw, `prompt cần ít nhất ${MIN_DISTRACTORS} câu đáp sai`)
          else if (s.prompt.distractors.includes(reply)) err(sw, 'câu đáp sai trùng câu đáp đúng')
        }
        if (typeof s.meaning === 'string') {
          const key = s.meaning.trim().toLowerCase()
          if (!s.hidden && meanings.has(key)) err(sw, `nghĩa trùng với ${meanings.get(key)} (dạng chọn nghĩa sẽ có hai đáp án đúng)`)
          meanings.set(key, s.code)
        }
        for (const use of s.uses ?? []) {
          const um = POINT_CODE.exec(use)
          const ok = um && (Number(um[1]) < data.lesson || (Number(um[1]) === data.lesson && Number(um[2]) < point.order))
          if (!ok) err(sw, `uses "${use}" phải là mẫu của bài trước hoặc mẫu trước trong cùng bài`)
          else if (!seenPoint.has(use) && Number(um![1]) === data.lesson) err(sw, `uses "${use}" chưa có trong file`)
        }
        if (s.level === 3 && (s.uses ?? []).length === 0 && data.lesson > 1) warn(sw, 'câu mức 3 nên kết hợp mẫu cũ (uses)')
        if (!s.hidden) for (const e of exercisesFor(s)) types.add(e)
      }
      if (types.size < MIN_DISTINCT_EXERCISES) warn(pw, `chỉ làm được ${types.size} dạng: ${GRAMMAR_EXERCISES.filter((e) => types.has(e)).join(', ')}`)
      points.push({ ...point, lesson: data.lesson })
    }
  }
  // uses trỏ tới mẫu của bài khác: mẫu đó phải có trong dữ liệu
  for (const p of points) {
    for (const s of p.sentences) {
      for (const use of s.uses ?? []) if (!seenPoint.has(use)) warnings.push({ file: `lesson-${String(p.lesson).padStart(2, '0')}.json`, where: s.code, message: `uses "${use}" chưa có trong dữ liệu` })
    }
  }
  return { points, errors, warnings }
}

/** JSON với khoá sắp xếp, để so jsonb trong database với dữ liệu trong file. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((k) => (value as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

function changed(rows: Row[], dbRows: Row[], key: (r: Row) => string): Row[] {
  const current = new Map(dbRows.map((r) => [key(r), stable(r)]))
  return rows.filter((r) => current.get(key(r)) !== stable(r))
}

export async function seedGrammar(db: SeedDb, data: GrammarData, dryRun: boolean, log: (s: string) => void): Promise<void> {
  const POINT_COLS = ['code', 'lesson', 'sort_order', 'pattern', 'meaning_vi', 'explanation', 'notes', 'approved']
  const SENTENCE_COLS = ['code', 'point_id', 'level', 'japanese', 'pieces', 'meaning_vi', 'uses', 'slots', 'split', 'prompt', 'sample', 'hidden']
  const dbPoints = await db.fetchAll('grammar_points', ['id', ...POINT_COLS])
  const pointRows: Row[] = data.points.map((p) => ({
    code: p.code,
    lesson: p.lesson,
    sort_order: p.order,
    pattern: p.pattern,
    meaning_vi: p.meaning,
    explanation: p.explanation,
    notes: p.notes ?? null,
    approved: p.approved,
  }))
  const pointsToWrite = changed(pointRows, dbPoints.map(({ id: _id, ...r }) => r), (r) => String(r.code))
  log(`  grammar_points: ${pointsToWrite.length} ghi · ${pointRows.length - pointsToWrite.length} không đổi`)
  if (!dryRun && pointsToWrite.length) await db.upsert('grammar_points', pointsToWrite, 'code')

  // Mẫu mới chỉ có id sau khi ghi; dry-run thì đếm câu của mẫu mới như "sẽ ghi"
  const ids = new Map((dryRun ? dbPoints : await db.fetchAll('grammar_points', ['id', 'code'])).map((r) => [String(r.code), String(r.id)]))
  const dbSentences = await db.fetchAll('grammar_sentences', ['id', ...SENTENCE_COLS])
  const sentenceRows: Row[] = data.points.flatMap((p) =>
    p.sentences.map((s) => ({
      code: s.code,
      point_id: ids.get(p.code) ?? `(mới) ${p.code}`,
      level: s.level,
      japanese: sentenceText(s.pieces),
      pieces: s.pieces,
      meaning_vi: s.meaning,
      uses: s.uses ?? [],
      slots: s.slots ?? [],
      split: s.split ?? null,
      prompt: s.prompt ?? null,
      sample: s.sample ?? false,
      hidden: s.hidden ?? false,
    })),
  )
  const inFile = new Set(sentenceRows.map((r) => String(r.code)))
  // Câu đã bỏ khỏi file: ẩn, không xoá
  const removed = dbSentences.filter((r) => !inFile.has(String(r.code)) && r.hidden !== true).map(({ id: _id, ...r }) => ({ ...r, hidden: true }))
  const sentencesToWrite = [...changed(sentenceRows, dbSentences.map(({ id: _id, ...r }) => r), (r) => String(r.code)), ...removed]
  log(`  grammar_sentences: ${sentencesToWrite.length - removed.length} ghi · ${removed.length} ẩn (không còn trong file) · ${sentenceRows.length - sentencesToWrite.length + removed.length} không đổi`)
  if (!dryRun && sentencesToWrite.length) await db.upsert('grammar_sentences', sentencesToWrite, 'code')
}
