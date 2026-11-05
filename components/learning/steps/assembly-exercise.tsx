'use client'

import { Fragment, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import type { AssemblyStep } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Kết quả chấm từ server. `null` = phiên đã tự chuyển câu, không cần hiện gì. */
export type AssemblyGrade = { correct: boolean; answer: string[]; explanation?: string } | { error: string } | null

interface AssemblyExerciseProps {
  step: AssemblyStep
  onComplete: (correct: boolean) => void
  /** Có thì server chấm; không có thì chấm ngay bằng step.answer. */
  onGrade?: (pieces: string[]) => Promise<AssemblyGrade>
  /** Câu nhắc khi trả lời sai. */
  wrongNote?: string
}

export function AssemblyExercise({ step, onComplete, onGrade, wrongNote }: AssemblyExerciseProps) {
  const [placed, setPlaced] = useState<number[]>([])
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graded, setGraded] = useState<{ answer: string[]; explanation?: string } | null>(null)
  const locked = status !== 'idle' || checking
  const isKanji = step.pieceKind === 'kanji'
  const slots = step.slots ?? step.answer.length
  const answer = graded?.answer ?? step.answer
  const full = placed.length === slots

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
    const result = await onGrade(built)
    setChecking(false)
    if (!result) return
    if ('error' in result) {
      setError(result.error)
      return
    }
    setGraded({ answer: result.answer, explanation: result.explanation })
    setStatus(result.correct ? 'correct' : 'incorrect')
  }

  const pieceText = isKanji ? 'text-[30px] md:text-[34px]' : 'text-[26px] md:text-[30px]'

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
            {Array.from({ length: slots }, (_, slot) => {
              const poolIndex = placed[slot]
              const piece = poolIndex !== undefined ? step.pool[poolIndex] : null
              return (
                <Fragment key={slot}>
                  {slot > 0 && step.joiner && (
                    <span className="text-xl text-muted-foreground" aria-hidden="true">{step.joiner}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(slot)}
                    disabled={!piece || locked}
                    aria-label={piece ? `Remove ${piece}` : `Empty slot ${slot + 1}`}
                    className={cn(
                      'flex size-16 items-center justify-center rounded-2xl border-2 font-jp transition-all duration-150 md:size-[72px]',
                      pieceText,
                      !piece && 'border-dashed border-border bg-transparent',
                      piece && status === 'idle' && 'animate-pop border-primary/60 bg-primary/10 hover:border-primary',
                      piece && status === 'correct' && 'border-success bg-success/10',
                      piece && status === 'incorrect' && 'border-error bg-error/10',
                    )}
                  >
                    {piece && <span lang="ja">{piece}</span>}
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
                    'flex size-14 items-center justify-center rounded-2xl border border-border bg-card font-jp shadow-[0_3px_0_0_#2e3440] transition-all duration-150 md:size-16',
                    pieceText,
                    used ? 'invisible' : 'hover:-translate-y-0.5 hover:border-[#3b4250] active:translate-y-0.5 active:shadow-none disabled:opacity-50',
                  )}
                >
                  <span lang="ja">{piece}</span>
                </button>
              )
            })}
          </div>
        </div>
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={full && !checking}
          checkLabel={checking ? 'Checking…' : 'Check'}
          onCheck={check}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={answer.join(step.joiner ? ` ${step.joiner} ` : '')}
          explanation={graded ? graded.explanation : step.explanation}
          wrongNote={wrongNote}
          secondary={
            <>
              {error && <p role="alert" className="mb-2 text-sm text-error">{error}</p>}
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
