'use client'

// JLPT (docs/jlpt-rules.md): chọn cấp, phạm vi, dạng bài theo từng mảng, số câu rồi bắt đầu phiên.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { startJlptSessionAction } from '@/app/jlpt/actions'
import { actionButton } from '@/components/action-button'
import { JLPT_AREAS, JLPT_LEVELS, JLPT_TYPES, SESSION_SIZES, type JlptArea, type JlptLevel, type JlptType } from '@/lib/jlpt/catalog'
import type { JlptStats } from '@/lib/dal/jlpt'
import { cn } from '@/lib/utils'

const EMPTY_ERROR = 'Not enough material for this choice yet. Try "Whole level", or learn more first.'
const SAVE_ERROR = "Couldn't start. Check your connection and try again."

export function JlptHome({ stats, initialLevel }: { stats: JlptStats; initialLevel: JlptLevel }) {
  const router = useRouter()
  const [level, setLevel] = useState<JlptLevel>(initialLevel)
  const [scope, setScope] = useState<'all' | 'learned'>('all')
  const [count, setCount] = useState<number>(20)
  const [selected, setSelected] = useState<ReadonlySet<JlptType>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [starting, start] = useTransition()

  const typesOf = (area: JlptArea) => JLPT_TYPES.filter((t) => t.area === area && t.levels.includes(level))
  const toggle = (id: JlptType) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const run = (types: JlptType[]) => {
    setError(null)
    start(async () => {
      try {
        const res = await startJlptSessionAction({ level, types, count, scope })
        if (res.status === 'saved') router.push(`/jlpt/session/${res.id}`)
        else setError(res.status === 'empty' ? EMPTY_ERROR : SAVE_ERROR)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const accuracy = (id: JlptType) => {
    const s = stats[level][id]
    return s && s.total > 0 ? `${Math.round((s.correct / s.total) * 100)}% · ${s.total} answered (30 days)` : 'Not practiced yet'
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card p-4">
        <div role="tablist" aria-label="Level" className="flex gap-1.5 rounded-2xl bg-secondary p-1.5">
          {JLPT_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={level === l}
              onClick={() => {
                setLevel(l)
                setSelected(new Set())
              }}
              className={cn('h-10 rounded-xl px-6 text-sm font-semibold transition-colors', level === l ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-subtle')}
            >
              {l}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Questions from" className="flex gap-2">
          {(['all', 'learned'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={cn('h-9 rounded-full border px-3.5 text-sm transition-colors', scope === s ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}
            >
              {s === 'all' ? 'Whole level' : 'Only what I learned'}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-subtle">
          Questions
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground">
            {SESSION_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </section>

      {error && <p role="alert" className="text-sm text-error">{error}</p>}

      {JLPT_AREAS.map((area) => {
        const types = typesOf(area.id)
        const ready = types.filter((t) => t.available).map((t) => t.id)
        return (
          <section key={area.id} aria-labelledby={`area-${area.id}`} className="rounded-3xl border border-border bg-card px-6 pt-5 pb-2">
            <div className="flex items-center justify-between gap-3">
              <h2 id={`area-${area.id}`} className="font-semibold">
                <span lang="ja" className="mr-2 font-jp text-muted-foreground">{area.nameJa}</span>
                {area.name}
              </h2>
              {ready.length > 0 && (
                <button type="button" disabled={starting} onClick={() => run(ready)} className={actionButton({ size: 'sm', variant: 'secondary' })}>
                  Practice this area
                </button>
              )}
            </div>
            <ul className="mt-2 divide-y divide-border">
              {types.map((t) => (
                <li key={t.id} className={cn('flex items-center gap-3 py-3', !t.available && 'opacity-60')}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${t.name}`}
                    disabled={!t.available}
                    checked={selected.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      <span lang="ja" className="mr-2 font-jp">{t.nameJa}</span>
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                    <p className="text-xs text-subtle">{t.available ? accuracy(t.id) : 'Coming soon'}</p>
                  </div>
                  {t.available && (
                    <button type="button" disabled={starting} onClick={() => run([t.id])} className={actionButton({ size: 'sm' })}>
                      Practice
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card p-3 shadow-lg">
          <span className="text-sm">{selected.size} {selected.size === 1 ? 'type' : 'types'} selected · {count} questions</span>
          <button type="button" disabled={starting} onClick={() => run([...selected])} className={actionButton({ size: 'md' })}>
            <Play className="fill-current" aria-hidden="true" />
            {starting ? 'Starting…' : 'Practice selected'}
          </button>
        </div>
      )}
    </div>
  )
}
