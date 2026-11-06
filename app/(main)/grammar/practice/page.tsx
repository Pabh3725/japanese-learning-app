'use client'

import { useState } from 'react'
import Link from 'next/link'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { CheckTile } from '@/components/preview/check-tile'
import { PreviewBanner } from '@/components/preview/preview-banner'
import { EXERCISE_TYPES, GRAMMAR_POINTS, type GrammarExerciseType } from '@/lib/preview/grammar'
import { cn } from '@/lib/utils'

const COUNTS = [5, 10, 20]

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

export default function GrammarPracticePage() {
  const [points, setPoints] = useState<string[]>(GRAMMAR_POINTS.map((p) => p.id))
  const [types, setTypes] = useState<GrammarExerciseType[]>(EXERCISE_TYPES.map((t) => t.id))
  const [count, setCount] = useState(10)
  const ready = points.length > 0 && types.length > 0
  const href = `/grammar/session?points=${points.join(',')}&types=${types.join(',')}&count=${count}`

  return (
    <>
      <PageHeader eyebrow="文法" title="Choose what to practice" description="Tick the grammar and the exercise types you want." />
      <PreviewBanner>This is a design preview with sample content. Your answers are not saved yet.</PreviewBanner>

      <section aria-labelledby="points-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="points-title" className="font-semibold">Grammar</h2>
          <button type="button" className="text-sm text-primary" onClick={() => setPoints(points.length === GRAMMAR_POINTS.length ? [] : GRAMMAR_POINTS.map((p) => p.id))}>
            {points.length === GRAMMAR_POINTS.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {GRAMMAR_POINTS.map((point) => (
            <CheckTile key={point.id} japanese checked={points.includes(point.id)} onToggle={() => setPoints((p) => toggled(p, point.id))} title={point.pattern} subtitle={`Lesson ${point.lesson} · ${point.meaning}`} />
          ))}
        </div>
      </section>

      <section aria-labelledby="types-title" className="mt-8">
        <h2 id="types-title" className="mb-3 font-semibold">Exercise types</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {EXERCISE_TYPES.map((type) => (
            <CheckTile key={type.id} checked={types.includes(type.id)} onToggle={() => setTypes((t) => toggled(t, type.id))} title={type.label} subtitle={type.description} />
          ))}
        </div>
      </section>

      <section aria-labelledby="count-title" className="mt-8">
        <h2 id="count-title" className="mb-3 font-semibold">Number of questions</h2>
        <div role="radiogroup" aria-labelledby="count-title" className="grid max-w-sm grid-cols-3 gap-2">
          {COUNTS.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={count === value} onClick={() => setCount(value)} className={cn('h-12 rounded-2xl border-2 text-sm font-semibold tabular-nums transition-colors', count === value ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}>
              {value}
            </button>
          ))}
        </div>
      </section>

      {ready ? (
        <Link href={href} className={cn(actionButton({ size: 'lg' }), 'mt-8 w-full md:w-auto md:px-10')}>Start practice</Link>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">Tick at least one grammar point and one exercise type to start.</p>
      )}
    </>
  )
}
