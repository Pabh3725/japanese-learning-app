'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import type { WordReveal } from '@/lib/exercise/stage-questions'
import type { StepPrompt } from '@/lib/types'
import { cn } from '@/lib/utils'

export type KanjiReadGrade = { correct: boolean; answer: string; reveal: WordReveal } | { error: string } | null

interface KanjiReadExerciseProps {
  stage: string
  question: string
  prompt: StepPrompt
  wrongNote?: string
  onGrade: (reading: string, hanViet: string) => Promise<KanjiReadGrade>
  onComplete: (correct: boolean) => void
}

/** Nhìn Kanji → gõ cách đọc và Hán Việt trong cùng một câu. Sai một ô là sai cả câu. */
export function KanjiReadExercise({ stage, question, prompt, wrongNote, onGrade, onComplete }: KanjiReadExerciseProps) {
  const [reading, setReading] = useState('')
  const [hanViet, setHanViet] = useState('')
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graded, setGraded] = useState<{ answer: string; reveal: WordReveal } | null>(null)
  const readingRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const nextCaret = useRef<number | null>(null)
  const locked = status !== 'idle' || checking
  const canCheck = reading.trim().length > 0 && hanViet.trim().length > 0 && !checking

  useLayoutEffect(() => {
    if (nextCaret.current === null || !readingRef.current) return
    readingRef.current.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [reading])

  const convert = (raw: string, caret: number | null) => {
    const result = convertAtCaret(raw, caret ?? raw.length, 'hiragana')
    nextCaret.current = result.caret
    setReading(result.value)
  }

  const check = async () => {
    if (!canCheck) return
    setChecking(true)
    setError(null)
    const result = await onGrade(reading, hanViet)
    setChecking(false)
    if (!result) return
    if ('error' in result) {
      setError(result.error)
      return
    }
    setGraded({ answer: result.answer, reveal: result.reveal })
    setStatus(result.correct ? 'correct' : 'incorrect')
  }

  const inputClass = cn(
    'h-14 w-full rounded-2xl border-2 bg-card px-5 text-center text-xl transition-colors outline-none focus:border-primary',
    status === 'idle' && 'border-border',
    status === 'correct' && 'border-success',
    status === 'incorrect' && 'animate-shake border-error',
  )

  return (
    <ExercisePanel
      stage={stage}
      question={question}
      controls={
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-subtle">
            Reading in Kana
            <input
              ref={readingRef}
              value={reading}
              lang="ja"
              onChange={(e) => (composing.current ? setReading(e.target.value) : convert(e.target.value, e.target.selectionStart))}
              onCompositionStart={() => {
                composing.current = true
              }}
              onCompositionEnd={(e) => {
                composing.current = false
                convert(e.currentTarget.value, e.currentTarget.selectionStart)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
              }}
              readOnly={locked}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Type in romaji"
              className={cn(inputClass, 'font-jp')}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-subtle">
            Sino-Vietnamese
            <input
              value={hanViet}
              onChange={(e) => setHanViet(e.target.value)}
              readOnly={locked}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="No accents needed"
              className={cn(inputClass, 'font-medium')}
            />
          </label>
          <button type="submit" className="sr-only" tabIndex={-1}>Check</button>
        </form>
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={canCheck}
          checkLabel={checking ? 'Checking…' : 'Check'}
          onCheck={check}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={graded?.answer ?? ''}
          explanation=""
          wrongNote={wrongNote}
          reveal={graded?.reveal}
          secondary={error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        />
      }
    >
      <PromptDisplay prompt={prompt} />
    </ExercisePanel>
  )
}
