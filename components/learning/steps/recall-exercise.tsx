'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import type { AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { convertAtCaret, normalizeHanViet } from '@/lib/exercise/answer-normalize'
import type { WordReveal } from '@/lib/exercise/stage-questions'
import { typingTip } from '@/lib/exercise/typing-tips'
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
  const [graded, setGraded] = useState<{ answer: string; explanation?: string; reveal?: WordReveal } | null>(null)
  const locked = status !== 'idle' || checking
  const converts = step.input === 'hiragana' || step.input === 'katakana'
  // Sai thì luôn nhắc cách gõ; đúng thì chỉ nhắc khi từ có chữ cần chú ý như ー, っ
  const tip = converts && graded?.reveal ? typingTip(graded.reveal.kana) : undefined
  const showTip = tip && (status === 'incorrect' || tip.rules.length > 0) ? tip : undefined

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
    setGraded({ answer: result.answer.join(''), explanation: result.explanation, reveal: result.reveal })
    setStatus(result.correct ? 'correct' : 'incorrect')
  }

  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const nextCaret = useRef<number | null>(null)

  // Đặt lại con trỏ sau khi React đã gán giá trị mới vào ô
  useLayoutEffect(() => {
    if (nextCaret.current === null || !inputRef.current) return
    inputRef.current.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [value])

  const convert = (raw: string, caret: number | null) => {
    if (step.input !== 'hiragana' && step.input !== 'katakana') {
      setValue(raw)
      return
    }
    const result = convertAtCaret(raw, caret ?? raw.length, step.input)
    nextCaret.current = result.caret
    setValue(result.value)
  }

  // Bàn phím điện thoại và bộ gõ giữ chữ đang soạn. Đổi chữ lúc này làm hỏng phần đang soạn,
  // chữ bị nhảy hoặc lặp, nên chỉ đổi khi soạn xong. Server vẫn chấm đúng nếu nộp khi còn là romaji.
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (composing.current) setValue(e.target.value)
    else convert(e.target.value, e.target.selectionStart)
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
            ref={inputRef}
            value={value}
            onChange={onChange}
            onCompositionStart={() => {
              composing.current = true
            }}
            onCompositionEnd={(e) => {
              composing.current = false
              convert(e.currentTarget.value, e.currentTarget.selectionStart)
            }}
            onKeyDown={(e) => {
              // Enter lúc đang dùng bộ gõ tiếng Nhật chỉ để xác nhận chữ, không phải nộp bài
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
            }}
            readOnly={locked}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
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
          reveal={graded?.reveal}
          typingTip={showTip}
          secondary={error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        />
      }
    >
      <PromptDisplay prompt={step.prompt} />
    </ExercisePanel>
  )
}
