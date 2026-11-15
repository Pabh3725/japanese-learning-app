'use client'

// Luyện nghe (docs/listening-rules.md): theo bài Minna 1–50 và phần nghe JLPT (luyện từng dạng, thi thử).
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Headphones, Play } from 'lucide-react'
import { startJlptSessionAction } from '@/app/jlpt/actions'
import { startLessonListeningAction, startMockListeningAction } from '@/app/listening/actions'
import { actionButton } from '@/components/action-button'
import type { JlptStats } from '@/lib/dal/jlpt'
import type { ListeningOverview } from '@/lib/dal/listening'
import { JLPT_LEVELS, LESSONS_OF, SESSION_SIZES, type JlptLevel, type JlptType } from '@/lib/jlpt/catalog'
import { LISTENING_V1, MOCK_SECTIONS, type LessonMode } from '@/lib/listening/questions'
import { cn } from '@/lib/utils'

const SAVE_ERROR = "Couldn't start. Check your connection and try again."
const EMPTY_ERROR = 'Not enough material for this choice.'

export const LESSON_MODES: { id: LessonMode; name: string; description: string }[] = [
  { id: 'mix', name: 'Mix', description: 'Sentences, questions and dictation together.' },
  { id: 'sentence_meaning', name: 'Sentence → meaning', description: 'Hear a sentence, choose what it means.' },
  { id: 'reply', name: 'Question → reply', description: 'Hear a question, choose the best reply.' },
  { id: 'dictation', name: 'Dictation', description: 'Hear a word or short sentence, type it.' },
]

const JLPT_LISTENING: { id: JlptType; nameJa: string; name: string }[] = [
  { id: 'listening_task', nameJa: '課題理解・ポイント理解', name: 'Conversations' },
  { id: 'verbal_expressions', nameJa: '発話表現', name: 'Verbal expressions' },
  { id: 'quick_response', nameJa: '即時応答', name: 'Quick response' },
]

const pct = (s: { total: number; correct: number } | undefined) => (s && s.total > 0 ? `${Math.round((s.correct / s.total) * 100)}%` : null)

function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string }) {
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

function CountSelect({ value, options, onChange }: { value: number; options: readonly number[]; onChange: (n: number) => void }) {
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

export function ListeningHome({ overview, jlpt }: { overview: ListeningOverview; jlpt: JlptStats }) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [band, setBand] = useState<JlptLevel>('N5')
  const [lesson, setLesson] = useState<number | null>(null)
  const [count, setCount] = useState<number>(10)
  const [level, setLevel] = useState<JlptLevel>('N5')
  const [jlptCount, setJlptCount] = useState<number>(10)

  const run = (action: () => Promise<{ status: string; id?: string }>, path: string) => {
    setError(null)
    start(async () => {
      try {
        const res = await action()
        if (res.status === 'saved' && res.id) router.push(`${path}/${res.id}`)
        else setError(res.status === 'empty' ? EMPTY_ERROR : SAVE_ERROR)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const [first, last] = LESSONS_OF[band]
  const lessons = overview.lessons.filter((l) => l.lesson >= first && l.lesson <= last)
  const mock = LISTENING_V1.mock[level]
  const mockTotal = mock.sections.reduce((a, b) => a + b, 0)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {error && <p role="alert" className="text-sm text-error">{error}</p>}

      <section aria-labelledby="by-lesson" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="by-lesson" className="font-semibold">
            <span lang="ja" className="mr-2 font-jp text-muted-foreground">課別</span>By lesson
          </h2>
          <Tabs value={band} options={JLPT_LEVELS} onChange={(v) => { setBand(v); setLesson(null) }} label="Lessons" />
        </div>
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {lessons.map((l) => (
            <li key={l.lesson}>
              <button
                type="button"
                aria-pressed={lesson === l.lesson}
                onClick={() => setLesson(l.lesson)}
                className={cn(
                  'flex h-16 w-full flex-col items-center justify-center rounded-2xl border text-sm transition-colors',
                  lesson === l.lesson ? 'border-primary bg-primary/12 text-primary' : 'border-border hover:border-[#3b4250]',
                )}
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
              {LESSON_MODES.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => startLessonListeningAction({ lesson, mode: m.id, count }), '/listening/session')}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-60"
                  >
                    <Play className="size-4 shrink-0 fill-current text-primary" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {m.name}
                        {m.id !== 'mix' && overview.byType[m.id] && <span className="ml-2 text-xs font-normal text-muted-foreground">{pct(overview.byType[m.id])}</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">{m.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">✓ lesson you have started learning · % correct in the last {LISTENING_V1.statsDays} days. Conversation fill-in-the-blank comes in a later update.</p>
      </section>

      <section aria-labelledby="jlpt-listening" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="jlpt-listening" className="font-semibold">
            <span lang="ja" className="mr-2 font-jp text-muted-foreground">聴解</span>JLPT listening
          </h2>
          <Tabs value={level} options={JLPT_LEVELS} onChange={setLevel} label="Level" />
        </div>

        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Mock listening test · {level}</p>
              <p className="text-sm text-muted-foreground">
                {mockTotal} questions · about {mock.minutes} minutes · each audio plays once, no going back
              </p>
              <p className="mt-1 text-xs text-subtle">{MOCK_SECTIONS.map((s, i) => `${s.nameJa} ${mock.sections[i]}`).join(' · ')}</p>
            </div>
            <button type="button" disabled={busy} onClick={() => run(() => startMockListeningAction({ level }), '/listening/session')} className={actionButton({ size: 'md' })}>
              <Headphones aria-hidden="true" />
              Start test
            </button>
          </div>
          {overview.mocks.filter((m) => m.level === level).length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
              {overview.mocks
                .filter((m) => m.level === level)
                .slice(0, 5)
                .map((m) => (
                  <li key={m.id}>
                    <Link href={`/listening/session/${m.id}`} className="flex flex-wrap justify-between gap-2 hover:text-primary">
                      <span>{new Date(m.date).toLocaleDateString()}</span>
                      <span className="text-subtle">
                        {m.correct}/{m.total} · {m.sections.map((s) => `${s.correct}/${s.total}`).join(' · ')}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">Practice by type</p>
          <CountSelect value={jlptCount} options={SESSION_SIZES} onChange={setJlptCount} />
        </div>
        <ul className="divide-y divide-border">
          {JLPT_LISTENING.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  <span lang="ja" className="mr-2 font-jp">{t.nameJa}</span>
                  {t.name}
                </p>
                <p className="text-xs text-subtle">{pct(jlpt[level][t.id]) ? `${pct(jlpt[level][t.id])} · ${jlpt[level][t.id]!.total} answered (30 days)` : 'Not practiced yet'}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => startJlptSessionAction({ level, types: [t.id], count: jlptCount, scope: 'all' }), '/jlpt/session')}
                className={actionButton({ size: 'sm' })}
              >
                Practice
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
