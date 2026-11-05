'use client'

import { ExercisePanel } from '@/components/learning/exercise-panel'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import type { IntroWord } from '@/lib/intro/words'
import { cn } from '@/lib/utils'

function kanaSizeClass(reading: string) {
  const len = Array.from(reading).length
  if (len <= 4) return 'text-[64px] md:text-[84px]'
  if (len <= 8) return 'text-[44px] md:text-[60px]'
  return 'text-[30px] md:text-[40px]'
}

interface KanaIntroExerciseProps {
  word: IntroWord
  saving: boolean
  error: string | null
  onComplete: () => void
  /** Chỗ cho nút loa (AUD-01). */
  speaker?: React.ReactNode
}

/** Stage 1: chỉ kana, romaji, nghĩa. Kanji và Hán Việt để đến Stage 3. */
export function KanaIntroExercise({ word, saving, error, onComplete, speaker }: KanaIntroExerciseProps) {
  return (
    <ExercisePanel
      stage="Stage 1 · Introduction"
      question="Meet a new word"
      footer={
        <ContinueFooter
          label={saving ? 'Saving…' : error ? 'Try again' : 'Got it'}
          onClick={onComplete}
          disabled={saving}
          hint={error ?? "No quiz yet. You'll practice this word next."}
        />
      }
    >
      <div className="flex min-h-[380px] w-full max-w-md flex-col items-center justify-center gap-5 rounded-3xl border border-border bg-card px-6 py-8 text-center md:min-h-[440px]">
        <span className="rounded-full bg-cyan/12 px-3 py-1 text-xs font-medium text-cyan">New word · {word.jlpt}</span>
        {word.emoji && (
          <span className="text-5xl leading-none" aria-hidden="true">
            {word.emoji}
          </span>
        )}
        <p lang="ja" className={cn('max-w-full font-jp leading-tight font-medium text-balance', kanaSizeClass(word.reading))}>
          {word.reading}
        </p>
        {word.romaji && <span className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">{word.romaji}</span>}
        {speaker}
        <div className="h-px w-16 bg-border" />
        <p className="max-w-full text-pretty text-[22px] font-semibold wrap-break-word md:text-[26px]">{word.meaning}</p>
      </div>
    </ExercisePanel>
  )
}
