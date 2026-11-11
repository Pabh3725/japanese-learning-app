'use client'

// Grammar: chọn mẫu đã mở, dạng bài và số câu để Luyện thêm (không đổi điểm hay lịch).
import { useState } from 'react'
import Link from 'next/link'
import { actionButton } from '@/components/action-button'
import { CheckTile } from '@/components/check-tile'
import { EXERCISE_LABELS } from '@/lib/grammar/labels'
import { GRAMMAR_EXERCISES, type GrammarExercise } from '@/lib/grammar/types'
import { cn } from '@/lib/utils'

const COUNTS = [10, 20, 30]

const toggled = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

export function GrammarPracticeForm({ points }: { points: { code: string; lesson: number; pattern: string; meaning: string }[] }) {
  const [chosen, setChosen] = useState<string[]>(points.map((p) => p.code))
  const [types, setTypes] = useState<GrammarExercise[]>([])
  const [count, setCount] = useState(10)
  const lessons = [...new Set(points.map((p) => p.lesson))]
  const href = `/grammar/session?mode=practice&points=${chosen.join(',')}&count=${count}${types.length ? `&ex=${types.join(',')}` : ''}`

  if (points.length === 0) return <p className="text-sm text-muted-foreground">Practice opens once you meet your first pattern in Learn.</p>

  return (
    <>
      <section aria-labelledby="points-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="points-title" className="font-semibold">Patterns</h2>
          <button type="button" className="text-sm text-primary" onClick={() => setChosen(chosen.length === points.length ? [] : points.map((p) => p.code))}>
            {chosen.length === points.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        {lessons.map((lesson) => (
          <div key={lesson} className="mb-4">
            <p className="mb-2 text-sm text-muted-foreground">Lesson {lesson}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {points.filter((p) => p.lesson === lesson).map((p) => (
                <CheckTile key={p.code} japanese checked={chosen.includes(p.code)} onToggle={() => setChosen((c) => toggled(c, p.code))} title={p.pattern} subtitle={p.meaning} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="types-title" className="mt-6">
        <h2 id="types-title" className="mb-1 font-semibold">Exercise types</h2>
        <p className="mb-3 text-sm text-muted-foreground">Leave all unticked to mix every type.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {GRAMMAR_EXERCISES.filter((e) => e !== 'clause_match').map((e) => (
            <CheckTile key={e} checked={types.includes(e)} onToggle={() => setTypes((t) => toggled(t, e))} title={EXERCISE_LABELS[e].title} subtitle={EXERCISE_LABELS[e].description} />
          ))}
        </div>
      </section>

      <section aria-labelledby="count-title" className="mt-8">
        <h2 id="count-title" className="mb-3 font-semibold">Number of questions</h2>
        <div role="radiogroup" aria-labelledby="count-title" className="grid max-w-sm grid-cols-3 gap-2">
          {COUNTS.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={count === value} onClick={() => setCount(value)}
              className={cn('h-12 rounded-2xl border-2 text-sm font-semibold tabular-nums transition-colors', count === value ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}>
              {value}
            </button>
          ))}
        </div>
      </section>

      {chosen.length > 0 ? (
        <Link href={href} className={cn(actionButton({ size: 'lg' }), 'mt-8 w-full md:w-auto md:px-10')}>Start practice</Link>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">Tick at least one pattern to start.</p>
      )}
    </>
  )
}
