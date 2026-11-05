'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import type { ChoiceStep } from '@/lib/types'

export function ChoiceExercise({
  step,
  onComplete,
  onAnswer,
  instant = false,
  wrongNote,
}: {
  step: ChoiceStep
  onComplete: (correct: boolean) => void
  /** Gọi đúng 1 lần khi bấm Check, với đáp án đã chọn — để server chấm và lưu (VOC-02). */
  onAnswer?: (chosen: string) => void
  /** Bấm đáp án là chấm ngay, không cần bấm Check. */
  instant?: boolean
  /** Câu nhắc khi trả lời sai. */
  wrongNote?: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<CheckStatus>('idle')

  const check = (chosen = selected) => {
    if (!chosen || status !== 'idle') return
    setStatus(chosen === step.answer ? 'correct' : 'incorrect')
    onAnswer?.(chosen)
  }

  const choose = (option: string) => {
    setSelected(option)
    if (instant) check(option)
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
    if (n >= 1 && n <= step.options.length) choose(step.options[n - 1])
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
              onSelect={() => choose(option)}
            />
          ))}
        </div>
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={selected !== null}
          onCheck={() => check()}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={step.answer}
          explanation={step.explanation}
          wrongNote={wrongNote}
        />
      }
    >
      <PromptDisplay prompt={step.prompt} />
    </ExercisePanel>
  )
}
