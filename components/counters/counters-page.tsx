'use client'

// Counters: tab Reference (bảng tra có nút nghe) và Practice (chọn nhóm, dạng câu, số câu).
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Volume2 } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { CheckTile } from '@/components/check-tile'
import { NoVoiceNote, useJapaneseVoice } from '@/components/learning/speaker-button'
import { useEnterToStart } from '@/components/use-enter-to-start'
import { GROUP_LABELS, meaningOf, setsOf, type CounterGroup } from '@/lib/counters/data'
import { COUNTER_EXERCISE_LABELS, COUNTER_EXERCISES, EXERCISE_GROUPS, type CounterExercise } from '@/lib/counters/questions'
import { speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

const GROUPS: CounterGroup[] = ['numbers', 'counters', 'dates', 'time']
const COUNTS = [10, 20, 30]
const toggled = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1.5 rounded-2xl bg-secondary p-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn('h-10 flex-1 rounded-xl px-5 text-sm font-medium transition-colors sm:flex-none', value === o.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-subtle')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Nút nghe trong bảng: không gắn phím P (bảng có nhiều nút). */
function ListenButton({ kana, voice }: { kana: string; voice: boolean }) {
  if (!voice) return null
  return (
    <button type="button" onClick={() => speak(kana)} aria-label={`Play ${kana}`} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-primary/60 hover:text-primary">
      <Volume2 className="size-4" aria-hidden="true" />
    </button>
  )
}

function Reference() {
  const [group, setGroup] = useState<CounterGroup>('numbers')
  const voice = useJapaneseVoice() === 'available'
  return (
    <div>
      <Tabs value={group} onChange={setGroup} label="Group" options={GROUPS.map((g) => ({ id: g, label: GROUP_LABELS[g].title }))} />
      <div className="mt-3"><NoVoiceNote /></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2" role="tabpanel">
        {setsOf(group).map((set) => (
          <section key={set.id} className="rounded-2xl border border-border bg-card p-5" aria-labelledby={`set-${set.id}`}>
            <h2 id={`set-${set.id}`} lang="ja" className="font-jp text-xl font-semibold">{set.label}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{set.usage}</p>
            {/* Mỗi dòng: chữ · cách đọc (không ngắt dòng) · nghĩa · nút nghe */}
            <ul className="mt-4">
              {set.entries.map((e) => (
                <li key={e.written} className="flex items-center gap-3 border-b border-border/60 py-2 last:border-b-0">
                  <span lang="ja" className="w-20 shrink-0 font-jp text-lg">{e.written}</span>
                  <span lang="ja" className="shrink-0 font-jp text-base text-cyan sm:whitespace-nowrap">
                    {e.readings[0]}
                    {e.readings.length > 1 && <span className="block text-xs text-muted-foreground">also {e.readings.slice(1).join(', ')}</span>}
                  </span>
                  <span className="min-w-0 flex-1 text-right text-sm text-subtle">{meaningOf(set, e)}</span>
                  <ListenButton kana={e.readings[0]} voice={voice} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function Practice() {
  const router = useRouter()
  const [groups, setGroups] = useState<CounterGroup[]>([...GROUPS])
  const [types, setTypes] = useState<CounterExercise[]>([...COUNTER_EXERCISES])
  const [count, setCount] = useState(20)
  // Dạng chỉ dành cho một nhóm (viết số: Numbers; chọn từ đếm: Counters) chỉ tính khi nhóm đó được chọn
  const usable = types.filter((t) => EXERCISE_GROUPS[t].some((g) => groups.includes(g)))
  const ready = groups.length > 0 && usable.length > 0
  const href = `/counters/session?groups=${groups.join(',')}&types=${usable.join(',')}&count=${count}`
  const startRef = useRef<HTMLAnchorElement>(null)
  useEnterToStart(ready, () => router.push(href), startRef)

  return (
    <>
      <section aria-labelledby="groups-title">
        <h2 id="groups-title" className="mb-3 font-semibold">What to practice</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <CheckTile key={g} checked={groups.includes(g)} onToggle={() => setGroups((x) => toggled(x, g))} title={GROUP_LABELS[g].title} subtitle={GROUP_LABELS[g].description} />
          ))}
        </div>
      </section>
      <section aria-labelledby="types-title" className="mt-8">
        <h2 id="types-title" className="mb-3 font-semibold">Exercise types</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {COUNTER_EXERCISES.map((t) => (
            <CheckTile key={t} checked={types.includes(t)} onToggle={() => setTypes((x) => toggled(x, t))} title={COUNTER_EXERCISE_LABELS[t].title} subtitle={COUNTER_EXERCISE_LABELS[t].description} />
          ))}
        </div>
      </section>
      <section aria-labelledby="count-title" className="mt-8">
        <h2 id="count-title" className="mb-3 font-semibold">Number of questions</h2>
        <div role="radiogroup" aria-labelledby="count-title" className="grid max-w-xs grid-cols-3 gap-2">
          {COUNTS.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={count === value} onClick={() => setCount(value)}
              className={cn('h-12 rounded-2xl border-2 text-sm font-semibold tabular-nums transition-colors', count === value ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}>
              {value}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Practice only: your points and review schedule do not change.</p>
      </section>
      {ready ? (
        <>
          <Link ref={startRef} href={href} className={cn(actionButton({ size: 'lg' }), 'mt-8 w-full md:w-auto md:px-10')}>Start practice</Link>
          <p className="mt-2 hidden text-xs text-muted-foreground md:block">Press Enter to start</p>
        </>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">Tick at least one group and one exercise type to start.</p>
      )}
    </>
  )
}

export function CountersPage() {
  const [tab, setTab] = useState<'reference' | 'practice'>('reference')
  return (
    <div>
      <Tabs value={tab} onChange={setTab} label="Counters" options={[{ id: 'reference', label: 'Reference' }, { id: 'practice', label: 'Practice' }]} />
      <div className="mt-6">{tab === 'reference' ? <Reference /> : <Practice />}</div>
    </div>
  )
}
