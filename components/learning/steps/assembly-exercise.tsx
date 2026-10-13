'use client'

import { Fragment, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import type { AssemblyStep } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AssemblyExercise({ step, onComplete }: { step: AssemblyStep; onComplete: (correct: boolean) => void }) {
  const [placed, setPlaced] = useState<number[]>([])
  const [status, setStatus] = useState<CheckStatus>('idle')
  const locked = status !== 'idle'
  const isKanji = step.pieceKind === 'kanji'
  const full = placed.length === step.answer.length

  const add = (poolIndex: number) => {
    if (locked || full || placed.includes(poolIndex)) return
    setPlaced((p) => [...p, poolIndex])
  }
  const remove = (slot: number) => {
    if (locked) return
    setPlaced((p) => p.filter((_, i) => i !== slot))
  }
  const check = () => {
    const built = placed.map((i) => step.pool[i])
    setStatus(built.every((piece, i) => piece === step.answer[i]) ? 'correct' : 'incorrect')
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
            {step.answer.map((_, slot) => {
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
          canCheck={full}
          onCheck={check}
          onContinue={() => onComplete(status === 'correct')}
          correctAnswer={step.answer.join(step.joiner ? ` ${step.joiner} ` : '')}
          explanation={step.explanation}
          secondary={
            placed.length > 0 ? (
              <button type="button" onClick={() => setPlaced([])} className={actionButton({ variant: 'ghost', size: 'sm' })}>
                <RotateCcw aria-hidden="true" />
                Clear
              </button>
            ) : null
          }
        />
      }
    >
      <PromptDisplay prompt={step.prompt} />
    </ExercisePanel>
  )
}
