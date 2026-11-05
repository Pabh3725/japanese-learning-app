'use client'

import { useState } from 'react'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SpeakerButton } from '@/components/learning/speaker-button'
import type { Stage3Word } from '@/lib/dal/stage3'
import { cn } from '@/lib/utils'

function expressionSize(text: string) {
  const len = Array.from(text).length
  if (len <= 3) return 'text-[72px] md:text-[88px]'
  if (len <= 6) return 'text-[48px] md:text-[60px]'
  return 'text-[32px] md:text-[40px]'
}

interface KanjiRevealExerciseProps {
  word: Stage3Word
  saving: boolean
  error: string | null
  onComplete: () => void
}

/** Stage 3: lật thẻ がっこう → 学校, Hán Việt toàn từ và từng chữ. Không có On/Kun để khỏi quá tải. */
export function KanjiRevealExercise({ word, saving, error, onComplete }: KanjiRevealExerciseProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <ExercisePanel
      stage="Stage 3 · Kanji & Sino-Vietnamese"
      question={flipped ? 'This is how it is written' : 'You know this word. Tap to see its Kanji'}
      footer={
        <ContinueFooter
          label={!flipped ? 'Reveal' : saving ? 'Saving…' : error ? 'Try again' : 'Got it'}
          onClick={flipped ? onComplete : () => setFlipped(true)}
          disabled={saving}
          hint={error ?? (flipped ? 'Next: practice writing it from pieces.' : undefined)}
        />
      }
    >
      <div className="w-full max-w-md perspective-[1400px]">
        <div
          className={cn(
            'relative min-h-[420px] w-full transition-transform duration-500 ease-out transform-3d md:min-h-[460px]',
            flipped && 'rotate-y-180',
          )}
        >
          <button
            type="button"
            onClick={() => setFlipped(true)}
            tabIndex={flipped ? -1 : 0}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-3xl border border-border bg-card px-6 text-center backface-hidden"
          >
            {word.emoji && <span className="text-5xl leading-none" aria-hidden="true">{word.emoji}</span>}
            <p lang="ja" className="max-w-full font-jp text-[44px] leading-tight font-medium text-balance md:text-[56px]">{word.reading}</p>
            <p className="text-pretty text-lg font-medium text-subtle">{word.meaning}</p>
          </button>

          <div
            aria-hidden={!flipped}
            className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-4 rounded-3xl border border-primary/30 bg-card px-6 py-6 text-center backface-hidden"
          >
            <p lang="ja" className={cn('max-w-full font-jp leading-tight font-medium', expressionSize(word.expression))}>{word.expression}</p>
            <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wide text-yellow">{word.hanViet}</span>
            <div className="flex items-center gap-3">
              <p lang="ja" className="font-jp text-xl text-cyan">{word.reading}</p>
              <SpeakerButton kana={word.reading} />
            </div>
            <p className="text-pretty text-base font-medium">{word.meaning}</p>
            {word.parts.length > 0 && (
              <>
                <div className="h-px w-16 bg-border" />
                <ul className="flex flex-col gap-1.5 text-sm" aria-label="Kanji in this word">
                  {word.parts.map((part) => (
                    <li key={part.character} className="flex items-baseline justify-center gap-2">
                      <span lang="ja" className="font-jp text-xl">{part.character}</span>
                      <span className="font-semibold text-yellow">{part.hanViet}</span>
                      <span className="text-muted-foreground">{part.meaning}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </ExercisePanel>
  )
}
