'use client'

import { Fragment, useEffect, useEffectEvent, useState } from 'react'
import { Lightbulb, RotateCcw } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import type { WordReveal } from '@/lib/exercise/stage-questions'
import { isShortcutEvent, pieceIndexForKey, pieceKeyLabel } from '@/lib/keyboard'
import type { AssemblyStep } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Kết quả chấm từ server. `null` = phiên đã tự chuyển câu, không cần hiện gì. */
export type AssemblyGrade = { correct: boolean; answer: string[]; explanation?: string; reveal?: WordReveal } | { error: string } | null

interface AssemblyExerciseProps {
  step: AssemblyStep
  onComplete: (correct: boolean) => void
  /** Có thì server chấm; không có thì chấm ngay bằng step.answer. */
  onGrade?: (pieces: string[], usedHint: boolean) => Promise<AssemblyGrade>
  /** Câu nhắc khi trả lời sai. */
  wrongNote?: string
}

export function AssemblyExercise({ step, onComplete, onGrade, wrongNote }: AssemblyExerciseProps) {
  const [placed, setPlaced] = useState<number[]>([])
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graded, setGraded] = useState<{ answer: string[]; explanation?: string; reveal?: WordReveal } | null>(null)
  const locked = status !== 'idle' || checking
  const isKanji = step.pieceKind === 'kanji'
  const isWord = step.pieceKind === 'word'
  const slots = step.slots ?? step.answer.length
  const answer = graded?.answer ?? step.answer
  // Câu không cho biết số ô: tới khi bấm gợi ý thì đặt được bao nhiêu mảnh cũng được
  const [hintShown, setHintShown] = useState(false)
  const hidden = step.blind === true && !hintShown
  const full = !hidden && placed.length === slots
  const canSubmit = hidden ? placed.length > 0 : full

  const showHint = () => {
    if (locked || !hidden) return
    setHintShown(true)
    setPlaced((p) => p.slice(0, slots))
  }

  const add = (poolIndex: number) => {
    if (locked || full || placed.includes(poolIndex)) return
    setPlaced((p) => [...p, poolIndex])
  }
  const remove = (slot: number) => {
    if (locked) return
    setPlaced((p) => p.filter((_, i) => i !== slot))
  }
  const check = async () => {
    const built = placed.map((i) => step.pool[i])
    if (!onGrade) {
      setStatus(built.every((piece, i) => piece === step.answer[i]) ? 'correct' : 'incorrect')
      return
    }
    if (checking) return
    setChecking(true)
    setError(null)
    const result = await onGrade(built, hintShown)
    setChecking(false)
    if (!result) return
    if ('error' in result) {
      setError(result.error)
      return
    }
    setGraded({ answer: result.answer, explanation: result.explanation, reveal: result.reveal })
    setStatus(result.correct ? 'correct' : 'incorrect')
  }

  // Phím số chọn mảnh theo thứ tự và đặt vào ô trống bên trái nhất. `placed` luôn lấp từ trái sang.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!isShortcutEvent(e) || status !== 'idle' || checking) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      setPlaced((p) => p.slice(0, -1))
    } else if (e.key === 'Escape') {
      setPlaced([])
    } else if (e.key === 'Enter') {
      if (!canSubmit) return
      e.preventDefault()
      void check()
    } else if (hidden && e.key.toLowerCase() === 'h') {
      showHint()
    } else {
      const index = pieceIndexForKey(e.key)
      if (index >= 0 && index < step.pool.length) add(index)
    }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const pieceText = isWord ? 'text-base md:text-lg' : isKanji ? 'text-[30px] md:text-[34px]' : 'text-[26px] md:text-[30px]'
  let nextSlot = 0

  return (
    <ExercisePanel
      stage={step.stage}
      question={step.question}
      controls={
        <div className="flex flex-col gap-6">
          <div
            className={cn('flex min-h-20 flex-wrap items-center justify-center gap-2', status === 'incorrect' && 'animate-shake')}
            aria-label="Your answer"
          >
            {hidden && placed.length === 0 && (
              <p className="text-sm text-muted-foreground">Pick the pieces in order. How many? That&apos;s for you to remember.</p>
            )}
            {(hidden ? placed.map(() => null) : (step.template ?? Array.from({ length: slots }, () => null))).map((part, i) => {
              if (part !== null) {
                return <span key={`fixed-${i}`} lang="ja" className={cn('font-jp text-muted-foreground', pieceText)}>{part}</span>
              }
              const slot = nextSlot++
              const poolIndex = placed[slot]
              const piece = poolIndex !== undefined ? step.pool[poolIndex] : null
              return (
                <Fragment key={slot}>
                  {slot > 0 && step.joiner?.trim() && (
                    <span className="text-xl text-muted-foreground" aria-hidden="true">{step.joiner}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(slot)}
                    disabled={!piece || locked}
                    aria-label={piece ? `Remove ${piece}` : `Empty slot ${slot + 1}`}
                    className={cn(
                      'flex items-center justify-center rounded-2xl border-2 transition-all duration-150',
                      isWord ? 'h-14 min-w-20 px-3 font-semibold' : 'size-16 font-jp md:size-[72px]',
                      pieceText,
                      !piece && 'border-dashed border-border bg-transparent',
                      piece && status === 'idle' && 'animate-pop border-primary/60 bg-primary/10 hover:border-primary',
                      piece && status === 'correct' && 'border-success bg-success/10',
                      piece && status === 'incorrect' && 'border-error bg-error/10',
                    )}
                  >
                    {piece && <span lang={isWord ? undefined : 'ja'}>{piece}</span>}
                  </button>
                </Fragment>
              )
            })}
          </div>

          <div className="h-px bg-border" />

          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Available pieces">
            {step.pool.map((piece, i) => {
              const used = placed.includes(i)
              return (
                <button
                  key={`${piece}-${i}`}
                  type="button"
                  onClick={() => add(i)}
                  disabled={used || locked || full}
                  aria-hidden={used}
                  tabIndex={used ? -1 : undefined}
                  className={cn(
                    'relative flex items-center justify-center rounded-2xl border border-border bg-card shadow-[0_3px_0_0_#2e3440] transition-all duration-150',
                    isWord ? 'h-12 min-w-14 px-3 font-medium' : 'size-14 font-jp md:size-16',
                    pieceText,
                    used ? 'invisible' : 'hover:-translate-y-0.5 hover:border-[#3b4250] active:translate-y-0.5 active:shadow-none disabled:opacity-50',
                  )}
                >
                  <span
                    className="absolute top-0.5 left-1.5 hidden font-sans text-[10px] font-medium text-muted-foreground md:block"
                    aria-hidden="true"
                  >
                    {pieceKeyLabel(i)}
                  </span>
                  <span lang={isWord ? undefined : 'ja'}>{piece}</span>
                </button>
              )
            })}
          </div>
          <p className="hidden text-center text-xs text-muted-foreground md:block">
            Press a number to place a piece · Backspace to undo · Esc to clear · Enter to check{hidden ? ' · H for a hint' : ''}
          </p>
        </div>
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={canSubmit && !checking}
          checkLabel={checking ? 'Checking…' : 'Check'}
          onCheck={check}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={answer.join(step.joiner ? ` ${step.joiner} ` : '')}
          explanation={graded ? graded.explanation : step.explanation}
          wrongNote={wrongNote}
          reveal={graded?.reveal}
          secondary={
            <>
              {error && <p role="alert" className="mb-2 text-sm text-error">{error}</p>}
              {hidden && (
                <button type="button" onClick={showHint} disabled={checking} className={actionButton({ variant: 'ghost', size: 'sm' })}>
                  <Lightbulb aria-hidden="true" />
                  How many pieces?
                </button>
              )}
              {hintShown && step.blind && <p className="mb-1 text-sm text-yellow">{slots} {slots === 1 ? 'piece' : 'pieces'} · no points if correct</p>}
              {placed.length > 0 && (
                <button type="button" onClick={() => setPlaced([])} disabled={checking} className={actionButton({ variant: 'ghost', size: 'sm' })}>
                  <RotateCcw aria-hidden="true" />
                  Clear
                </button>
              )}
            </>
          }
        />
      }
    >
      <PromptDisplay prompt={step.prompt} />
    </ExercisePanel>
  )
}
