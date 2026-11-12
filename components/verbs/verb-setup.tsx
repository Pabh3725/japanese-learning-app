'use client'

// Thể động từ: chọn thể (chỉ thể đã mở), dạng câu và số câu. Chỉ luyện, không đổi điểm hay lịch.
import { useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { CheckTile } from '@/components/check-tile'
import type { VerbFormSummary } from '@/lib/dal/verbs'
import { VERB_EXERCISE_LABELS, VERB_EXERCISES, type VerbExercise } from '@/lib/verbs/questions'
import { cn } from '@/lib/utils'

const COUNTS = [10, 20, 30]
const toggled = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

export function VerbSetup({ forms }: { forms: VerbFormSummary[] }) {
  const open = forms.filter((f) => f.open)
  const [chosen, setChosen] = useState<string[]>(open.slice(-3).map((f) => f.id))
  const [types, setTypes] = useState<VerbExercise[]>([...VERB_EXERCISES])
  const [count, setCount] = useState(20)
  const href = `/grammar/verbs/session?forms=${chosen.join(',')}&types=${types.join(',')}&count=${count}`

  const group = (title: string, kind: 'verb' | 'adj') => (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {forms.filter((f) => f.for === kind).map((f) =>
          f.open ? (
            <CheckTile key={f.id} checked={chosen.includes(f.id)} onToggle={() => setChosen((c) => toggled(c, f.id))} title={f.label}
              subtitle={`Lesson ${f.lesson}${f.answered ? ` · ${Math.round((f.correct / f.answered) * 100)}% of ${f.answered} correct` : ''}`} />
          ) : (
            <div key={f.id} className="flex items-start gap-3 rounded-2xl border-2 border-border p-4 opacity-50">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span><span className="block font-medium">{f.label}</span><span className="block text-sm text-muted-foreground">Opens with lesson {f.lesson}</span></span>
            </div>
          ),
        )}
      </div>
    </div>
  )

  if (open.length === 0) {
    return <p className="text-sm text-muted-foreground">The first forms (ます / ません / ました) open with lesson 4. A lesson opens when half of its words have finished Stage 3.</p>
  }

  return (
    <>
      <section aria-labelledby="forms-title">
        <h2 id="forms-title" className="mb-3 font-semibold">Forms</h2>
        {group('Verbs', 'verb')}
        {group('Adjectives', 'adj')}
      </section>

      <section aria-labelledby="types-title" className="mt-2">
        <h2 id="types-title" className="mb-3 font-semibold">Exercise types</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {VERB_EXERCISES.map((e) => (
            <CheckTile key={e} checked={types.includes(e)} onToggle={() => setTypes((t) => toggled(t, e))} title={VERB_EXERCISE_LABELS[e].title} subtitle={VERB_EXERCISE_LABELS[e].description} />
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

      {chosen.length > 0 && types.length > 0 ? (
        <Link href={href} className={cn(actionButton({ size: 'lg' }), 'mt-8 w-full md:w-auto md:px-10')}>Start practice</Link>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">Tick at least one form and one exercise type to start.</p>
      )}
    </>
  )
}
