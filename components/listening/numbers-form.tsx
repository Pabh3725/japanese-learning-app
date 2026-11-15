'use client'

// Practice · Numbers listening (docs/listening-rules.md §V2.5): chọn nhóm, cách trả lời, số câu.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { startNumbersListeningAction } from '@/app/listening/actions'
import { actionButton } from '@/components/action-button'
import { CountSelect, EMPTY_ERROR, SAVE_ERROR } from '@/components/listening/lesson-listening'
import { GROUP_LABELS, type CounterGroup } from '@/lib/counters/data'
import { NUMBER_GROUPS, type NumbersMode } from '@/lib/listening/numbers'
import { LISTENING_V1 } from '@/lib/listening/questions'
import { cn } from '@/lib/utils'

const MODES: { id: NumbersMode; name: string; description: string }[] = [
  { id: 'choose', name: 'Choose what you hear', description: 'Pick from look-alike sounds: 4時 / 7時 / 14時 / 40分' },
  { id: 'type', name: 'Type the number', description: 'Type digits: じゅうよじさんじゅっぷん → 1430' },
]

export function NumbersForm() {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<ReadonlySet<CounterGroup>>(() => new Set(NUMBER_GROUPS))
  const [mode, setMode] = useState<NumbersMode>('choose')
  const [count, setCount] = useState<number>(10)
  const toggle = (g: CounterGroup) =>
    setGroups((cur) => {
      const next = new Set(cur)
      if (!next.delete(g)) next.add(g)
      return next
    })
  return (
    <section className="flex max-w-2xl flex-col gap-5 rounded-3xl border border-border bg-card p-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">What to listen to</legend>
        {NUMBER_GROUPS.map((g) => (
          <label key={g} className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
            <input type="checkbox" checked={groups.has(g)} onChange={() => toggle(g)} className="mt-1 size-4 accent-[var(--primary)]" />
            <span>
              <span className="block text-sm font-medium">{GROUP_LABELS[g].title}{g === 'numbers' && ' & prices'}</span>
              <span className="block text-xs text-muted-foreground">{GROUP_LABELS[g].description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">How to answer</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn('rounded-2xl border px-4 py-3 text-left', mode === m.id ? 'border-primary bg-primary/12' : 'border-border hover:border-[#3b4250]')}
            >
              <span className="block text-sm font-medium">{m.name}</span>
              <span lang="ja" className="block text-xs text-muted-foreground">{m.description}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CountSelect value={count} options={LISTENING_V1.sessionSizes} onChange={setCount} />
        <button
          type="button"
          disabled={busy || groups.size === 0}
          onClick={() =>
            start(async () => {
              setError(null)
              try {
                const res = await startNumbersListeningAction({ groups: [...groups], mode, count })
                if (res.status === 'saved') router.push(`/listening/session/${res.id}`)
                else setError(res.status === 'empty' ? EMPTY_ERROR : SAVE_ERROR)
              } catch {
                setError(SAVE_ERROR)
              }
            })
          }
          className={actionButton({ size: 'md' })}
        >
          <Play className="fill-current" aria-hidden="true" />
          Start
        </button>
      </div>
    </section>
  )
}
