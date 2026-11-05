// VOC-03 — Bài ghép kana: tách từ thành mảnh, sinh mảnh nhiễu, chấm đáp án.
// Pure: không gọi database. `random` truyền vào để test lặp lại được.

/** Số mảnh nhiễu thêm vào mỗi câu. */
export const KANA_DISTRACTORS = 3

/** Số từ mỗi lượt. Tạm thời: SES-01 / REV-02 sẽ thay phần chọn câu. */
export const KANA_ASSEMBLY_WORDS_PER_ROUND = 10

/** Kana nhỏ ghép với chữ đứng trước thành một âm: きょ, シャ, ティ, ファ. っ/ッ và ー là mảnh riêng. */
const COMBINING_SMALL_KANA = new Set('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ')

export function splitKana(reading: string): string[] {
  const pieces: string[] = []
  for (const char of reading) {
    if (COMBINING_SMALL_KANA.has(char) && pieces.length > 0) pieces[pieces.length - 1] += char
    else pieces.push(char)
  }
  return pieces
}

const HIRAGANA = Array.from('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだでどばびぶべぼ')
const KATAKANA = Array.from('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワンガギグゲゴザジズゼゾダデドバビブベボ')

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Mảnh nhiễu cùng bảng chữ với từ, không trùng mảnh nào của đáp án. Từ pha cả hai bảng chữ thì lấy từ cả hai. */
export function pickKanaDistractors(pieces: readonly string[], random: () => number, count = KANA_DISTRACTORS): string[] {
  const text = pieces.join('')
  const candidates = [
    ...(/[ぁ-ゖ]/.test(text) ? HIRAGANA : []),
    ...(/[ァ-ヺ]/.test(text) ? KATAKANA : []),
  ].filter((char) => !pieces.includes(char))
  return shuffle(candidates, random).slice(0, count)
}

export interface KanaAssemblyQuestion {
  /** Số ô đáp án. Không gửi đáp án xuống trình duyệt: server chấm. */
  slots: number
  /** Mảnh đáp án + mảnh nhiễu, đã xáo. */
  pool: string[]
}

export function buildKanaAssemblyQuestion(reading: string, random: () => number): KanaAssemblyQuestion {
  const pieces = splitKana(reading)
  return { slots: pieces.length, pool: shuffle([...pieces, ...pickKanaDistractors(pieces, random)], random) }
}

export function isKanaAssemblyCorrect(placed: readonly string[], reading: string): boolean {
  return placed.join('') === reading
}

/** Từ đang ở Stage 2 trong DB. */
export interface Stage2WordRow {
  id: string
  last_practiced_at: string | null
  vocabularies: { reading_kana: string; meaning_vi: string; sort_order: number }
}

/** Chọn từ lâu chưa luyện trước (chưa luyện lần nào đứng đầu), hòa thì theo lộ trình. Không đổi mảng gốc. */
export function pickStage2Words<T extends Stage2WordRow>(
  rows: readonly T[],
  limit: number = KANA_ASSEMBLY_WORDS_PER_ROUND,
): T[] {
  const lastSeen = (row: T) => (row.last_practiced_at ? Date.parse(row.last_practiced_at) : -Infinity)
  return [...rows]
    .sort((a, b) => {
      const byTime = lastSeen(a) - lastSeen(b)
      if (byTime !== 0 && !Number.isNaN(byTime)) return byTime
      return a.vocabularies.sort_order - b.vocabularies.sort_order
    })
    .slice(0, limit)
}

export interface KanaAssemblyRequest {
  learnerVocabularyId: string
  clientEventId: string
  pieces: string[]
  responseMs?: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_PIECES = 40
const MAX_PIECE_LENGTH = 4

/** Không tin trình duyệt: dữ liệu lạ / thiếu / sai kiểu → null. */
export function parseKanaAssemblyRequest(input: unknown): KanaAssemblyRequest | null {
  if (typeof input !== 'object' || input === null) return null
  const v = input as Record<string, unknown>
  const ok =
    typeof v.learnerVocabularyId === 'string' && UUID.test(v.learnerVocabularyId) &&
    typeof v.clientEventId === 'string' && UUID.test(v.clientEventId) &&
    Array.isArray(v.pieces) && v.pieces.length >= 1 && v.pieces.length <= MAX_PIECES &&
    v.pieces.every((p) => typeof p === 'string' && p.length >= 1 && p.length <= MAX_PIECE_LENGTH) &&
    (v.responseMs === undefined || (typeof v.responseMs === 'number' && Number.isFinite(v.responseMs) && v.responseMs >= 0))
  if (!ok) return null
  return {
    learnerVocabularyId: v.learnerVocabularyId as string,
    clientEventId: v.clientEventId as string,
    pieces: v.pieces as string[],
    responseMs: v.responseMs === undefined ? undefined : Math.round(v.responseMs as number),
  }
}
