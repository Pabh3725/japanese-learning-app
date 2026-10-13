export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export interface VocabItem {
  id: string
  word: string
  kana: string
  kanaPieces: string[]
  romaji: string
  meaning: string
  hanViet: string
  jlpt: JlptLevel
  strength: number
}

export interface KanjiItem {
  id: string
  char: string
  hanViet: string
  meaning: string
  onyomi: string
  kunyomi: string
  strokes: number
  components: string[]
  jlpt: JlptLevel
}

export type DisplayKind = 'kanji' | 'vocab' | 'kana' | 'meaning'

export interface StepPrompt {
  display: string
  kind: DisplayKind
  hint?: string
}

interface BaseStep {
  id: string
  stage: string
}

export interface FlashcardStep extends BaseStep {
  type: 'flashcard'
  vocab: VocabItem
}

export interface KanjiIntroStep extends BaseStep {
  type: 'kanji-intro'
  kanji: KanjiItem[]
  word?: VocabItem
}

export interface ChoiceStep extends BaseStep {
  type: 'choice'
  prompt: StepPrompt
  question: string
  options: string[]
  answer: string
  optionKind: DisplayKind
  explanation: string
}

export interface AssemblyStep extends BaseStep {
  type: 'assembly'
  prompt: StepPrompt
  question: string
  pool: string[]
  answer: string[]
  pieceKind: 'kana' | 'kanji'
  joiner?: string
  explanation: string
}

export interface RecallStep extends BaseStep {
  type: 'recall'
  prompt: StepPrompt
  question: string
  placeholder: string
  accepted: string[]
  displayAnswer: string
  explanation: string
}

export type LearningStep =
  | FlashcardStep
  | KanjiIntroStep
  | ChoiceStep
  | AssemblyStep
  | RecallStep

export interface ReviewCard {
  id: string
  front: string
  kind: 'kanji' | 'vocab'
  question: string
  answer: string
  detail: string
  reading?: string
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'
