import type { Metadata } from 'next'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { LearnTabs } from '@/components/learning/learn-tabs'
import { LevelUpPrompt } from '@/components/learning/level-up-prompt'
import { PageHeader } from '@/components/page-header'
import { ProgressBar } from '@/components/progress-bar'
import { getKanjiOverview } from '@/lib/dal/kanji'
import { formatVnDateTime } from '@/lib/learning/time'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Kanji · Nihongo' }

const steps = [
  { step: '1', title: 'Meet', body: 'See the character, its Sino-Vietnamese reading, meaning, and On and Kun readings.' },
  { step: '2', title: 'Learn', body: '12 questions over 4 sittings, from easy choices to typing readings from memory.' },
  { step: '3', title: 'Remember', body: 'Long-term review. Questions come back further apart the better you remember.' },
]

export default async function KanjiPage() {
  const overview = await getKanjiOverview()
  const hasWork = overview.questionsToday + overview.newToday > 0
  const pausedByLimit = overview.newToday === 0 && overview.openedToday < overview.newPerDay && overview.opened < overview.total
  const heading =
    overview.questionsToday > 0
      ? `${overview.questionsToday} ${overview.questionsToday === 1 ? 'question' : 'questions'}`
      : overview.newToday > 0
        ? `${overview.newToday} new Kanji`
        : 'All caught up'

  return (
    <>
      <PageHeader eyebrow="学習" title="Learn" description="Learn each character on its own, separate from your vocabulary path." />
      <LearnTabs active="kanji" />
      {overview.nextLevel !== null && <LevelUpPrompt skill="kanji" level={overview.level} next={overview.nextLevel} itemName="Kanji" />}

      <section aria-labelledby="kanji-today" className="rounded-3xl border border-primary/30 bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <h2 id="kanji-today" className="mt-1 text-3xl font-semibold tabular-nums">
              {heading}
            </h2>
            <p className="mt-2 text-sm text-subtle">
              {overview.dueReview} to review · {overview.dueLearning} learning · {overview.newToday} new Kanji
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              New Kanji today: {overview.openedToday} of {overview.newPerDay} opened · {overview.answeredToday} of {overview.cap} questions answered
            </p>
            {pausedByLimit && <p className="mt-2 text-sm text-yellow">New Kanji are paused: today&apos;s questions need the room left under your limit.</p>}
            {!hasWork && overview.nextDueAt && <p className="mt-2 text-sm text-subtle">Next question at {formatVnDateTime(new Date(overview.nextDueAt))}.</p>}
          </div>
          {hasWork && (
            <Link href="/learn/kanji/session" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-10')}>
              <Play className="fill-current" aria-hidden="true" />
              Start Kanji
            </Link>
          )}
        </div>
      </section>

      {overview.advice && (
        <section aria-labelledby="kanji-advice" className="mt-6 rounded-3xl border border-yellow/40 bg-yellow/10 p-6">
          <h2 id="kanji-advice" className="font-semibold">Too many Kanji questions today</h2>
          <p className="mt-2 text-sm text-subtle">
            {overview.advice.over} questions are over today&apos;s limit and will move to later days.{' '}
            {overview.advice.suggestNewPerDay !== null
              ? `Try ${overview.advice.suggestNewPerDay} new Kanji per day, or raise the limit to ${overview.advice.suggestCap} questions.`
              : `Try raising the limit to ${overview.advice.suggestCap} questions.`}
          </p>
          <Link href="/settings" className={cn(actionButton({ variant: 'secondary', size: 'sm' }), 'mt-4')}>Open Settings</Link>
        </section>
      )}

      <section aria-labelledby="kanji-progress" className="mt-8 rounded-3xl border border-border bg-card p-6">
        <div className="mb-2 flex justify-between text-sm">
          <h2 id="kanji-progress" className="font-semibold">Your progress</h2>
          <span className="tabular-nums text-muted-foreground">{overview.longTerm} / {overview.total} learned</span>
        </div>
        <ProgressBar value={overview.longTerm} max={overview.total} tone="yellow" label="Kanji learned" />
        <p className="mt-2 text-sm text-muted-foreground">
          {overview.learning} still learning{overview.known > 0 && ` · ${overview.known} marked as known`}
        </p>
      </section>

      <section aria-labelledby="kanji-how" className="mt-8">
        <h2 id="kanji-how" className="mb-4 font-semibold">How a Kanji is learned</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.step} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">{s.step}</span>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Kanji readings use data from{' '}
        <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noreferrer" className="underline underline-offset-2">KANJIDIC2</a>{' '}
        by the Electronic Dictionary Research and Development Group, under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2">CC BY-SA 4.0</a>.
      </p>
    </>
  )
}
