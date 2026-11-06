// VOC-03 — Bài ghép kana: tách từ thành mảnh, sinh mảnh nhiễu, chấm đáp án.
// Pure: không gọi database. `random` truyền vào để test lặp lại được.
import { confusableKana } from './similarity'

/** Số mảnh nhiễu mỗi câu: bằng số mảnh của từ, trong khoảng này. Đủ nhiều thì mới xen giữa được các mảnh đáp án. */
export const KANA_DISTRACTORS_MIN = 3
export const KANA_DISTRACTORS_MAX = 6

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

function combine(heads: string, smalls: string): string[] {
  return Array.from(heads).flatMap((head) => Array.from(smalls, (small) => head + small))
}

/**
 * Các mảnh đặc biệt, chia theo loại. Nếu chỉ chữ thường được làm mảnh nhiễu thì cứ thấy ー, っ, しゃ hay ぱ
 * là biết chắc thuộc đáp án. Chọn theo loại chứ không theo từng mảnh, vì âm ghép rất nhiều sẽ lấn hết ー và っ.
 */
const SPECIAL_HIRAGANA: readonly (readonly string[])[] = [
  ['っ'],
  Array.from('ぱぴぷぺぽ'),
  combine('きしちにひみりぎじびぴ', 'ゃゅょ'),
]
const SPECIAL_KATAKANA: readonly (readonly string[])[] = [
  ['ー'],
  ['ッ'],
  Array.from('パピプペポ'),
  [...combine('キシチニヒミリギジビピ', 'ャュョ'), 'ファ', 'フィ', 'フェ', 'フォ', 'ティ'],
]

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Mảnh dễ nhầm với các mảnh đáp án, chia đều cho từng mảnh để không dồn hết vào một chữ. */
function pickConfusables(pieces: readonly string[], count: number, random: () => number): string[] {
  const queues = shuffle([...new Set(pieces)], random).map((piece) =>
    shuffle(confusableKana(piece).filter((other) => !pieces.includes(other)), random),
  )
  const picked: string[] = []
  for (let i = 0; picked.length < count && queues.some((queue) => i < queue.length); i++) {
    for (const queue of queues) {
      const other = queue[i]
      if (other && picked.length < count && !picked.includes(other)) picked.push(other)
    }
  }
  return picked
}

/**
 * Mảnh nhiễu cùng bảng chữ với từ, không trùng mảnh nào của đáp án. Từ pha cả hai bảng chữ thì lấy từ cả hai.
 * Khoảng một nửa là mảnh dễ nhầm với đáp án, khoảng một phần ba là mảnh đặc biệt (mỗi mảnh một loại), còn lại là chữ thường.
 */
export function pickKanaDistractors(pieces: readonly string[], random: () => number, extra = 0): string[] {
  const count = Math.min(KANA_DISTRACTORS_MAX, Math.max(KANA_DISTRACTORS_MIN, pieces.length)) + extra
  const text = pieces.join('')
  const hasHiragana = /[ぁ-ゖ]/.test(text)
  const hasKatakana = /[ァ-ヺ]/.test(text)

  const confusables = pickConfusables(pieces, Math.floor(count / 2), random)
  const isFree = (piece: string) => !pieces.includes(piece) && !confusables.includes(piece)

  const specialGroups = [...(hasHiragana ? SPECIAL_HIRAGANA : []), ...(hasKatakana ? SPECIAL_KATAKANA : [])]
    .map((group) => group.filter(isFree))
    .filter((group) => group.length > 0)
  const specials = shuffle(specialGroups, random)
    .slice(0, Math.round(count / 3))
    .map((group) => shuffle(group, random)[0])

  const plain = [...(hasHiragana ? HIRAGANA : []), ...(hasKatakana ? KATAKANA : [])].filter(
    (piece) => isFree(piece) && !specials.includes(piece),
  )
  return [...confusables, ...specials, ...shuffle(plain, random).slice(0, count - confusables.length - specials.length)]
}

/**
 * Trộn mảnh đáp án vào giữa mảnh nhiễu. Xáo ngẫu nhiên thuần để 83% câu có mảnh đáp án liền nhau,
 * người học chỉ cần sắp lại một cụm. Ở đây mảnh đáp án được rải vào các khe giữa mảnh nhiễu,
 * nên chỉ liền nhau khi số mảnh nhiều hơn số khe, và không giữ đúng thứ tự của từ.
 */
export function mixKanaPieces(pieces: readonly string[], distractors: readonly string[], random: () => number): string[] {
  const answerOrder = (pool: readonly string[]) => pool.filter((piece) => pieces.includes(piece)).join('')
  const reading = pieces.join('')
  let pool = spreadIntoGaps(pieces, distractors, random)
  for (let tries = 0; tries < 10 && pieces.length > 1 && answerOrder(pool) === reading; tries++) {
    pool = spreadIntoGaps(pieces, distractors, random)
  }
  if (answerOrder(pool) !== reading) return pool

  // Hiếm khi vẫn đúng thứ tự sau 10 lần: đổi chỗ hai mảnh đáp án khác nhau. Từ chỉ một loại mảnh thì giữ nguyên.
  const positions = pool.flatMap((piece, i) => (pieces.includes(piece) ? [i] : []))
  const other = positions.find((i) => pool[i] !== pool[positions[0]])
  if (other === undefined) return pool
  const swapped = [...pool]
  ;[swapped[positions[0]], swapped[other]] = [swapped[other], swapped[positions[0]]]
  return swapped
}

function spreadIntoGaps(pieces: readonly string[], distractors: readonly string[], random: () => number): string[] {
  const answer = shuffle(pieces, random)
  const gapCount = distractors.length + 1
  const gaps = shuffle(Array.from({ length: gapCount }, (_, i) => i), random)
  const buckets: string[][] = Array.from({ length: gapCount }, () => [])
  answer.forEach((piece, i) => buckets[gaps[i % gapCount]].push(piece))
  const others = shuffle(distractors, random)
  return buckets.flatMap((bucket, i) => (i < others.length ? [...bucket, others[i]] : bucket))
}

export interface KanaAssemblyQuestion {
  /** Số ô đáp án. Không gửi đáp án xuống trình duyệt: server chấm. */
  slots: number
  /** Mảnh đáp án + mảnh nhiễu, đã xáo. */
  pool: string[]
}

export function buildKanaAssemblyQuestion(reading: string, random: () => number): KanaAssemblyQuestion {
  const pieces = splitKana(reading)
  return { slots: pieces.length, pool: mixKanaPieces(pieces, pickKanaDistractors(pieces, random), random) }
}

export function isKanaAssemblyCorrect(placed: readonly string[], reading: string): boolean {
  return placed.join('') === reading
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
