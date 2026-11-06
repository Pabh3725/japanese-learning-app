'use client'

import { useState } from 'react'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SpeakerButton } from '@/components/learning/speaker-button'
import type { HanVietIntroWord } from '@/lib/dal/stage3'
import { speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

interface KanjiRevealExerciseProps {
  word: HanVietIntroWord
  saving: boolean
  error: string | null
  onComplete: () => void
}

/** Stage 3: lật thẻ để biết Hán Việt của từ. Kanji để tới thẻ Giới thiệu Hán tự. */
export function KanjiRevealExercise({ word, saving, error, onComplete }: KanjiRevealExerciseProps) {
  const [flipped, setFlipped] = useState(false)

  // Đọc ngay trong lúc bấm, vì một số trình duyệt chặn âm thanh không do người dùng bấm
  const reveal = () => {
    if (flipped) return
    setFlipped(true)
    speak(word.reading)
  }

  return (
    <ExercisePanel
      stage="Stage 3 · Sino-Vietnamese"
      question={flipped ? 'This is its Sino-Vietnamese reading' : 'You know this word. Tap to see its Sino-Vietnamese reading'}
      footer={
        <ContinueFooter
          label={!flipped ? 'Reveal' : saving ? 'Saving…' : error ? 'Try again' : 'Got it'}
          onClick={flipped ? onComplete : reveal}
          disabled={saving}
          hint={error ?? (flipped ? 'Next: choose this reading in Stage 4.' : undefined)}
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
            onClick={reveal}
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
            <span className="rounded-full bg-yellow/12 px-4 py-2 text-2xl font-semibold tracking-wide text-yellow">{word.hanViet}</span>
            <div className="flex items-center gap-3">
              <p lang="ja" className="font-jp text-xl text-cyan">{word.reading}</p>
              <SpeakerButton kana={word.reading} />
            </div>
            <p className="text-pretty text-base font-medium">{word.meaning}</p>
          </div>
        </div>
      </div>
    </ExercisePanel>
  )
}
