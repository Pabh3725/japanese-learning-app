'use client'

import { useState } from 'react'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import type { KanjiItem, KanjiIntroStep } from '@/lib/types'
import { cn } from '@/lib/utils'

function KanjiDetail({ kanji, revealed, compact }: { kanji: KanjiItem; revealed: boolean; compact: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p lang="ja" className={cn('font-jp leading-none font-medium', compact ? 'text-[96px] md:text-[112px]' : 'text-[120px] md:text-[140px]')}>
        {kanji.char}
      </p>
      <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wider text-yellow">{kanji.hanViet}</span>
      {revealed && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-[22px] font-semibold md:text-[24px]">{kanji.meaning}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">On</dt>
            <dd lang="ja" className="font-jp text-subtle">{kanji.onyomi}</dd>
            <dt className="text-muted-foreground">Kun</dt>
            <dd lang="ja" className="font-jp text-subtle">{kanji.kunyomi}</dd>
            <dt className="text-muted-foreground">Strokes</dt>
            <dd className="text-subtle tabular-nums">{kanji.strokes}</dd>
          </dl>
          <div className="flex items-center gap-1.5" aria-label={`Components: ${kanji.components.join(', ')}`}>
            {kanji.components.map((c, i) => (
              <span key={`${c}-${i}`} lang="ja" className="flex size-10 items-center justify-center rounded-xl bg-secondary font-jp text-xl">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function KanjiIntroExercise({ step, onComplete }: { step: KanjiIntroStep; onComplete: (correct: boolean) => void }) {
  const [revealed, setRevealed] = useState(false)
  const compact = step.kanji.length > 1

  return (
    <ExercisePanel
      stage={step.stage}
      question={step.word ? `The Kanji inside ${step.word.word}` : 'Meet a new Kanji'}
      footer={
        <ContinueFooter
          label={revealed ? 'Continue' : 'Show details'}
          onClick={revealed ? () => onComplete(true) : () => setRevealed(true)}
          hint={revealed ? undefined : 'Look at the shape before revealing more.'}
        />
      }
    >
      <div className="flex w-full flex-col items-center gap-8">
        <div className={cn('grid w-full gap-8', compact && 'grid-cols-2')}>
          {step.kanji.map((k) => (
            <KanjiDetail key={k.id} kanji={k} revealed={revealed} compact={compact} />
          ))}
        </div>
        {revealed && step.word && (
          <p className="text-center text-sm text-subtle animate-in fade-in duration-200">
            {step.kanji.map((k) => k.hanViet).join(' + ')} ={' '}
            <span lang="ja" className="font-jp text-base text-foreground">{step.word.word}</span>{' '}
            <span className="text-yellow">{step.word.hanViet}</span>
          </p>
        )}
      </div>
    </ExercisePanel>
  )
}
