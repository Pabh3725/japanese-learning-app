'use client'

import { useState } from 'react'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SpeakerButton, useAutoSpeak } from '@/components/learning/speaker-button'
import type { KanjiIntroWord } from '@/lib/dal/word-kanji'

function WordScreen({ word }: { word: KanjiIntroWord }) {
  useAutoSpeak(word.reading)
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-primary/30 bg-card px-6 py-10 text-center">
      <p lang="ja" className="max-w-full font-jp text-[64px] leading-tight font-medium md:text-[80px]">{word.expression}</p>
      <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wide text-yellow">{word.hanViet}</span>
      <div className="flex items-center gap-3">
        <p lang="ja" className="font-jp text-xl text-cyan">{word.reading}</p>
        <SpeakerButton kana={word.reading} />
      </div>
      <p className="text-pretty text-base font-medium">{word.meaning}</p>
    </div>
  )
}

function CharacterScreen({ word, part }: { word: KanjiIntroWord; part: KanjiIntroWord['parts'][number] }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-10 text-center">
      <p lang="ja" className="font-jp text-[96px] leading-none font-medium md:text-[120px]">{part.character}</p>
      <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wide text-yellow">{part.hanViet}</span>
      <p className="text-pretty text-lg font-medium">{part.meaning}</p>
      <div className="h-px w-16 bg-border" />
      <p className="text-sm text-muted-foreground">
        In <span lang="ja" className="font-jp text-base text-foreground">{word.expression}</span> · {word.hanViet} · {word.meaning}
      </p>
    </div>
  )
}

interface WordKanjiIntroExerciseProps {
  word: KanjiIntroWord
  saving: boolean
  error: string | null
  onComplete: () => void
}

/** Thẻ Giới thiệu Hán tự: cả từ trước, rồi mỗi chữ một màn. Không có On/Kun để khỏi quá tải. */
export function WordKanjiIntroExercise({ word, saving, error, onComplete }: WordKanjiIntroExerciseProps) {
  const [screen, setScreen] = useState(0)
  const part = screen > 0 ? word.parts[screen - 1] : null
  const isLast = screen === word.parts.length

  return (
    <ExercisePanel
      stage="Stage 3 · Kanji"
      question={part ? `Kanji ${screen} of ${word.parts.length}` : 'This is how the word is written'}
      footer={
        <ContinueFooter
          label={!isLast ? 'Next' : saving ? 'Saving…' : error ? 'Try again' : 'Got it'}
          onClick={isLast ? onComplete : () => setScreen((s) => s + 1)}
          disabled={saving}
          hint={error ?? (isLast ? 'Next: practice choosing and building this word.' : undefined)}
        />
      }
    >
      {part ? <CharacterScreen word={word} part={part} /> : <WordScreen word={word} />}
    </ExercisePanel>
  )
}
