'use client'

import { useState } from 'react'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import { isRecallCorrect } from '@/lib/learning-engine'
import type { RecallStep } from '@/lib/types'
import { cn } from '@/lib/utils'

export function RecallExercise({ step, onComplete }: { step: RecallStep; onComplete: (correct: boolean) => void }) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<CheckStatus>('idle')

  const check = () => {
    if (!value.trim()) return
    setStatus(isRecallCorrect(value, step.accepted) ? 'correct' : 'incorrect')
  }

  return (
    <ExercisePanel
      stage={step.stage}
      question={step.question}
      controls={
        <form
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
        >
          <label htmlFor={`recall-${step.id}`} className="sr-only">
            Your answer
          </label>
          <input
            id={`recall-${step.id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
            }}
            readOnly={status !== 'idle'}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="ja"
            placeholder={step.placeholder}
            className={cn(
              'h-16 w-full rounded-2xl border-2 bg-card px-5 text-center font-jp text-[24px] transition-colors outline-none placeholder:font-sans placeholder:text-base placeholder:text-muted-foreground focus:border-primary',
              status === 'idle' && 'border-border',
              status === 'correct' && 'border-success',
              status === 'incorrect' && 'animate-shake border-error',
            )}
          />
        </form>
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={value.trim().length > 0}
          onCheck={check}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={step.displayAnswer}
          explanation={step.explanation}
        />
      }
    >
      <PromptDisplay prompt={step.prompt} />
    </ExercisePanel>
  )
}
