'use client'

// Lưới bài Minna 1–50 và các chế độ luyện nghe của bài: dùng ở Grammar · Listening và Practice · Dictation.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Play } from 'lucide-react'
import { startLessonListeningAction } from '@/app/listening/actions'
import type { ListeningOverview } from '@/lib/dal/listening'
import { JLPT_LEVELS, LESSONS_OF, type JlptLevel } from '@/lib/jlpt/catalog'
import { LISTENING_V1, type LessonMode, type LessonType } from '@/lib/listening/questions'
import { cn } from '@/lib/utils'

export const SAVE_ERROR = "Couldn't start. Check your connection and try again."
export const EMPTY_ERROR = 'Not enough material for this choice.'
export const pct = (s: { total: number; correct: number } | undefined) => (s && s.total > 0 ? `${Math.round((s.correct / s.total) * 100)}%` : null)

export interface ModeOption {
  id: LessonMode
  name: string
  description: string
  /** Chưa có (vd. dictation theo đoạn, đợt B). */
  soon?: boolean
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex w-fit gap-1.5 rounded-2xl bg-secondary p-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={value === o}
          onClick={() => onChange(o)}
          className={cn('h-9 rounded-xl px-5 text-sm font-semibold transition-colors', value === o ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-subtle')}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function CountSelect({ value, options, onChange }: { value: number; options: readonly number[]; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-subtle">
      Questions
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground">
        {options.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </label>
  )
}

export function LessonListening({ overview, modes }: { overview: ListeningOverview; modes: readonly ModeOption[] }) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [band, setBand] = useState<JlptLevel>('N5')
  const [lesson, setLesson] = useState<number | null>(null)
  const [count, setCount] = useState<number>(10)

  const run = (mode: LessonMode) => {
    if (lesson === null) return
    setError(null)
    start(async () => {
      try {
        const res = await startLessonListeningAction({ lesson, mode, count })
        if (res.status === 'saved') router.push(`/listening/session/${res.id}`)
        else setError(res.status === 'empty' ? EMPTY_ERROR : SAVE_ERROR)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const [first, last] = LESSONS_OF[band]
  const lessons = overview.lessons.filter((l) => l.lesson >= first && l.lesson <= last)

  return (
    <section aria-label="Lessons" className="flex max-w-3xl flex-col gap-4 rounded-3xl border border-border bg-card p-6">
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">Choose a lesson</p>
        <Tabs value={band} options={JLPT_LEVELS} onChange={(v) => { setBand(v); setLesson(null) }} label="Lessons" />
      </div>
      <ul className="grid grid-cols-5 gap-2 sm:grid-cols-9">
        {lessons.map((l) => (
          <li key={l.lesson}>
            <button
              type="button"
              aria-pressed={lesson === l.lesson}
              onClick={() => setLesson(l.lesson)}
              className={cn('flex h-16 w-full flex-col items-center justify-center rounded-2xl border text-sm transition-colors', lesson === l.lesson ? 'border-primary bg-primary/12 text-primary' : 'border-border hover:border-[#3b4250]')}
            >
              <span className="flex items-center gap-1 font-semibold">
                {l.lesson}
                {l.learned && <Check className="size-3.5 text-success" aria-label="learned" />}
              </span>
              <span className="text-[11px] text-muted-foreground">{pct(l) ?? '—'}</span>
            </button>
          </li>
        ))}
      </ul>
      {lesson !== null && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">Lesson {lesson}</p>
            <CountSelect value={count} options={LISTENING_V1.sessionSizes} onChange={setCount} />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {modes.map((m) => (
              <li key={m.id + m.name}>
                <button
                  type="button"
                  disabled={busy || m.soon}
                  onClick={() => run(m.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent"
                >
                  <Play className="size-4 shrink-0 fill-current text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {m.name}
                      {m.soon ? <span className="ml-2 text-xs font-normal text-muted-foreground">Coming soon</span> : m.id !== 'mix' && pct(overview.byType[m.id as LessonType]) && <span className="ml-2 text-xs font-normal text-muted-foreground">{pct(overview.byType[m.id as LessonType])}</span>}
                    </span>
                    <span className="block text-xs text-muted-foreground">{m.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">✓ lesson you have started learning · % correct in the last {LISTENING_V1.statsDays} days. It doesn&apos;t change your Learn, Review or Grammar schedule.</p>
    </section>
  )
}
