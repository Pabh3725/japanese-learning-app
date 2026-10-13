'use client'

import { useState } from 'react'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { JapaneseFlashcard } from '@/components/learning/japanese-flashcard'
import type { FlashcardStep } from '@/lib/types'

export function FlashcardExercise({ step, onComplete }: { step: FlashcardStep; onComplete: (correct: boolean) => void }) {
  const [flipped, setFlipped] = useState(false)
  const [seenBack, setSeenBack] = useState(false)

  const flip = () => {
    setFlipped((f) => !f)
    setSeenBack(true)
  }

  return (
    <ExercisePanel
      stage={step.stage}
      question="Meet a new word"
      footer={
        <ContinueFooter
          label={seenBack ? 'Got it' : 'Reveal'}
          onClick={seenBack ? () => onComplete(true) : flip}
          hint={seenBack ? 'Tap the card to flip it again.' : 'Try to guess the reading first.'}
        />
      }
    >
      <JapaneseFlashcard vocab={step.vocab} flipped={flipped} onFlip={flip} />
    </ExercisePanel>
  )
}
