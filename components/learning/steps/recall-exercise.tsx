'use client'

import { useState } from 'react'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import type { AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { normalizeHanViet, romajiToKanaInput } from '@/lib/exercise/answer-normalize'
import type { RecallStep } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RecallExerciseProps {
  step: RecallStep
  onComplete: (correct: boolean) => void
  /** Có thì server chấm; không có thì chấm ngay bằng step.accepted. */
  onGrade?: (typed: string) => Promise<AssemblyGrade>
  /** Câu nhắc khi trả lời sai. */
  wrongNote?: string
}

export function RecallExercise({ step, onComplete, onGrade, wrongNote }: RecallExerciseProps) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graded, setGraded] = useState<{ answer: string; explanation?: string } | null>(null)
  const locked = status !== 'idle' || checking
  const converts = step.input === 'hiragana' || step.input === 'katakana'

  const check = async () => {
    if (!value.trim() || checking) return
    if (!onGrade) {
      const typed = normalizeHanViet(value)
      setStatus(step.accepted.some((a) => normalizeHanViet(a) === typed) ? 'correct' : 'incorrect')
      return
    }
    setChecking(true)
    setError(null)
    const result = await onGrade(value)
    setChecking(false)
    if (!result) return
    if ('error' in result) {
      setError(result.error)
      return
    }
    setGraded({ answer: result.answer.join(''), explanation: result.explanation })
    setStatus(result.correct ? 'correct' : 'incorrect')
  }

  const onChange = (next: string) => {
    if (step.input === 'hiragana' || step.input === 'katakana') setValue(romajiToKanaInput(next, step.input))
    else setValue(next)
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
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // Enter lúc đang dùng bộ gõ tiếng Nhật chỉ để xác nhận chữ, không phải nộp bài
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
            }}
            readOnly={locked}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang={step.input === 'text' ? undefined : 'ja'}
            placeholder={step.placeholder}
            className={cn(
              'h-16 w-full rounded-2xl border-2 bg-card px-5 text-center text-[24px] transition-colors outline-none placeholder:font-sans placeholder:text-base placeholder:text-muted-foreground focus:border-primary',
              converts ? 'font-jp' : step.input === 'text' ? 'font-medium' : 'font-jp',
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
          canCheck={value.trim().length > 0 && !checking}
          checkLabel={checking ? 'Checking…' : 'Check'}
          onCheck={check}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={graded?.answer ?? step.displayAnswer}
          explanation={graded ? graded.explanation : step.explanation}
          wrongNote={wrongNote}
          secondary={error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        />
      }
    >
      <PromptDisplay prompt={step.prompt} />
    </ExercisePanel>
  )
}
