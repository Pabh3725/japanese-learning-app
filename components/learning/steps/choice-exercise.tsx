'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import type { ChoiceStep } from '@/lib/types'

export function ChoiceExercise({ step, onComplete }: { step: ChoiceStep; onComplete: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<CheckStatus>('idle')

  const check = () => {
    if (!selected) return
    setStatus(selected === step.answer ? 'correct' : 'incorrect')
  }

  const stateFor = (option: string): AnswerState => {
    if (status === 'idle') return option === selected ? 'selected' : 'idle'
    if (option === step.answer) return 'correct'
    if (option === selected) return 'incorrect'
    return 'dimmed'
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (status !== 'idle' || e.target instanceof HTMLInputElement) return
    const n = Number(e.key)
    if (n >= 1 && n <= step.options.length) setSelected(step.options[n - 1])
    if (e.key === 'Enter' && selected) {
      e.preventDefault()
      check()
    }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <ExercisePanel
      stage={step.stage}
      question={step.question}
      controls={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Answer options">
          {step.options.map((option, i) => (
            <AnswerOption
              key={option}
              index={i}
              label={option}
              kind={step.optionKind}
              state={stateFor(option)}
              disabled={status !== 'idle'}
              onSelect={() => setSelected(option)}
            />
          ))}
        </div>
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={selected !== null}
          onCheck={check}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={step.answer}
          explanation={step.explanation}
        />
      }
    >
      <PromptDisplay prompt={step.prompt} />
    </ExercisePanel>
  )
}
