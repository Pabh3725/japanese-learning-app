// Grammar · Listening theo từng mẫu (docs/listening-rules.md §V2.2b): 30 câu nghe mỗi mẫu, 3 chặng × 10 câu,
// cơ bản → khó dần. Câu lấy từ câu ngữ pháp đã soạn và đã duyệt (đã kiểm tra từ vựng theo bài). Pure.
import { shuffle } from '../jlpt/reading'
import {
  buildHeardSentence,
  buildReply,
  buildSentenceDictation,
  buildSentenceMeaning,
  charCount,
  dictable,
  type LessonSentence,
  type ListeningQuestion,
} from './questions'

type Rng = () => number

export const POINT_LISTENING = {
  stages: 3,
  perStage: 10,
  /** Mở chặng sau khi đúng ít nhất 8/10 ở chặng trước (theo tỷ lệ nếu chặng ít câu hơn). */
  passRatio: 0.8,
  /** Chép chính tả ở chặng 3: câu tối đa chừng này chữ. */
  dictationMaxChars: 20,
} as const

export type Stage = 1 | 2 | 3
export const isStage = (v: unknown): v is Stage => v === 1 || v === 2 || v === 3

/**
 * 30 câu của một mẫu, chia 3 chặng (ổn định giữa các lần học). Chặng 1: độ khó 1, ưu tiên câu chỉ có mẫu này.
 * Chặng 2, 3: độ khó 2, 3, ưu tiên câu kết hợp mẫu đã học. Độ khó nào thiếu câu thì lấy từ độ khó gần nhất còn dư.
 */
export function pointStages(sentences: readonly LessonSentence[]): [LessonSentence[], LessonSentence[], LessonSentence[]] {
  const byCode = (a: LessonSentence, b: LessonSentence) => a.code.localeCompare(b.code)
  const combined = (s: LessonSentence) => (s.uses ?? []).length > 0
  const ofLevel = (level: number, preferCombined: boolean) =>
    sentences.filter((s) => s.level === level).sort((a, b) => Number(combined(a) !== preferCombined) - Number(combined(b) !== preferCombined) || byCode(a, b))
  const pools = [ofLevel(1, false), ofLevel(2, true), ofLevel(3, true)]
  const stages: LessonSentence[][] = pools.map((p) => p.slice(0, POINT_LISTENING.perStage))
  const used = new Set(stages.flat().map((s) => s.code))
  // Bù chặng thiếu: chặng 1 lấy từ độ khó 2, 3; chặng 2 từ 1 rồi 3; chặng 3 từ 2 rồi 1
  const fillOrder = [[1, 2], [0, 2], [1, 0]]
  stages.forEach((stage, i) => {
    for (const from of fillOrder[i]) {
      for (const s of pools[from]) {
        if (stage.length >= POINT_LISTENING.perStage) break
        if (!used.has(s.code)) {
          stage.push(s)
          used.add(s.code)
        }
      }
    }
  })
  return stages as [LessonSentence[], LessonSentence[], LessonSentence[]]
}

/**
 * Dạng hỏi theo chặng: 1 chọn câu đã nghe; 2 xen kẽ chọn câu đã nghe / chọn nghĩa; 3 hỏi–đáp nếu câu có câu hỏi,
 * còn lại xen kẽ chọn nghĩa / chép chính tả. Câu không dựng được dạng đó thì thử dạng khác.
 */
export function buildPointStage(stage: Stage, sentences: readonly LessonSentence[], pool: readonly LessonSentence[], rng: Rng): ListeningQuestion[] {
  const heard = (s: LessonSentence) => buildHeardSentence(s, rng)
  const meaning = (s: LessonSentence) => buildSentenceMeaning(s, pool, rng)
  const reply = (s: LessonSentence) => (s.prompt ? buildReply(s, rng) : null)
  const dictation = (s: LessonSentence) => (dictable(s) && charCount(s.pieces) <= POINT_LISTENING.dictationMaxChars ? buildSentenceDictation(s) : null)
  const out: ListeningQuestion[] = []
  shuffle(sentences, rng).forEach((s, i) => {
    const order =
      stage === 1 ? [heard, meaning] : stage === 2 ? (i % 2 === 0 ? [heard, meaning] : [meaning, heard]) : [reply, ...(i % 2 === 0 ? [meaning, dictation] : [dictation, meaning]), heard]
    for (const build of order) {
      const q = build(s)
      if (q) {
        out.push(q)
        break
      }
    }
  })
  return out
}

export const stagePassed = (correct: number, total: number) => total > 0 && correct / total >= POINT_LISTENING.passRatio
