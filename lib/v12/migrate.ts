// V12 §7: chuyển tiến độ V11 sang V12 — viết dạng hàm thuần để test trước khi viết SQL (gói 4). Pure.
import type { ReviewCardType } from './card-types'
import type { Progress } from './order'

/** Tiến độ một từ ở V11. */
export interface OldWord {
  /** Các Stage đã mở (learner_stage_schedules): 1–3 nhánh Kana, 4–6 nhánh Kanji; `completed` = đã xong. */
  stages: readonly { stage: 1 | 2 | 3 | 4 | 5 | 6; completed: boolean }[]
  /** Đã xem thẻ giới thiệu dạng Kanji (Stage 4). */
  kanjiIntroSeen: boolean
  /** Card đang có (không tính Card sao). */
  cards: readonly ('vocab.kana' | 'vocab.kanji')[]
}

/** Tiến độ một chữ ở V11. */
export interface OldKanji {
  phase: 'learning' | 'review'
  /** Card đang có (không tính Card sao), với hạn ôn. */
  cards: readonly { type: 'kanji.meaning' | 'kanji.hanviet'; due: Date }[]
}

export interface NewProgress {
  progress: Progress
  /** Đã xem thẻ giới thiệu (Stage 1 dở dang thì không hiện lại thẻ). */
  introSeen: boolean
}

export interface CardPlan {
  card: ReviewCardType
  /** 'keep': chép nguyên lịch FSRS của Card cũ; 'new': Card mới đến hạn ngày học kế tiếp. */
  from: { kind: 'keep'; oldType: string } | { kind: 'new' }
}

export interface MigratedWord {
  kana: NewProgress
  /** null: không có thẻ Từ vựng Kanji (chưa đụng tới nhánh Kanji). */
  wordKanji: NewProgress | null
  cards: CardPlan[]
}

const active = (w: OldWord, s: number) => w.stages.some((x) => x.stage === s && !x.completed)
const done = (w: OldWord, s: number) => w.stages.some((x) => x.stage === s && x.completed)

/** §7: một từ. Điểm Stage cũ không mang sang (Stage mới bắt đầu từ 0 điểm). */
export function migrateWord(w: OldWord): MigratedWord {
  const cards: CardPlan[] = []
  let kana: NewProgress
  if (w.cards.includes('vocab.kana') || done(w, 3)) {
    kana = { progress: 'review', introSeen: true }
    // Card ① giữ lịch cũ; Card ② (Kana → nghĩa) là Card mới
    cards.push(w.cards.includes('vocab.kana') ? { card: 'kana_type', from: { kind: 'keep', oldType: 'vocab.kana' } } : { card: 'kana_type', from: { kind: 'new' } })
    cards.push({ card: 'kana_choose', from: { kind: 'new' } })
  } else if (active(w, 3)) kana = { progress: 3, introSeen: true }
  else if (active(w, 2) || done(w, 2)) kana = { progress: 2, introSeen: true }
  else kana = { progress: 1, introSeen: w.stages.some((x) => x.stage === 1) }

  let wordKanji: NewProgress | null = null
  if (w.cards.includes('vocab.kanji') || done(w, 6)) {
    wordKanji = { progress: 'review', introSeen: true }
    cards.push(w.cards.includes('vocab.kanji') ? { card: 'word_kanji', from: { kind: 'keep', oldType: 'vocab.kanji' } } : { card: 'word_kanji', from: { kind: 'new' } })
  } else if (active(w, 6)) wordKanji = { progress: 3, introSeen: true }
  else if (active(w, 5) || done(w, 5)) wordKanji = { progress: 2, introSeen: true }
  else if (w.kanjiIntroSeen || w.stages.some((x) => x.stage === 4)) wordKanji = { progress: 1, introSeen: true }
  return { kana, wordKanji, cards }
}

export interface MigratedKanji {
  progress: NewProgress
  /** Card gộp: chép lịch của Card cũ đến hạn sớm hơn (§7). */
  card: CardPlan | null
}

/** §7: một chữ. Đang Học → Stage 2 (0 điểm); đã có Card → gộp 2 Card thành 1, lấy Card đến hạn sớm hơn. */
export function migrateKanji(k: OldKanji): MigratedKanji {
  if (k.phase === 'learning') return { progress: { progress: 2, introSeen: true }, card: null }
  const earliest = [...k.cards].sort((a, b) => a.due.getTime() - b.due.getTime())[0]
  return { progress: { progress: 'review', introSeen: true }, card: { card: 'kanji', from: earliest ? { kind: 'keep', oldType: earliest.type } : { kind: 'new' } } }
}
