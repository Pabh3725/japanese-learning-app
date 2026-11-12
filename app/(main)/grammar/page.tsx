import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpenCheck, ChevronRight, Dumbbell, Languages, Lock, RotateCcw, Sparkles } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { getGrammarOverview, type GrammarLessonSummary, type PointStatus } from '@/lib/dal/grammar'
import { MarkGrammarLearned } from '@/components/grammar/mark-learned'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Grammar · Nihongo' }

const STATUS: Record<PointStatus, { label: string; className: string }> = {
  locked: { label: 'Locked', className: 'text-muted-foreground' },
  new: { label: 'New', className: 'text-cyan' },
  learning: { label: 'Learning', className: 'text-yellow' },
  review: { label: 'Learned', className: 'text-success' },
}

function lockNote(l: GrammarLessonSummary): string {
  const parts = []
  if (l.unlock.vocabMissing > 0) parts.push(`${l.unlock.vocabMissing} more ${l.unlock.vocabMissing === 1 ? 'word' : 'words'} of lesson ${l.lesson} through Stage 3`)
  if (l.unlock.previousMissing > 0) parts.push(`${l.unlock.previousMissing} more ${l.unlock.previousMissing === 1 ? 'pattern' : 'patterns'} of lesson ${l.lesson - 1} learned`)
  return `Opens after ${parts.join(' and ')}.`
}

function LessonCard({ l }: { l: GrammarLessonSummary }) {
  return (
    <section aria-labelledby={`lesson-${l.lesson}`} className={cn('rounded-3xl border border-border bg-card p-5 md:p-6', !l.unlock.open && 'opacity-80')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`lesson-${l.lesson}`} className="flex items-center gap-2 font-semibold">
          {!l.unlock.open && <Lock className="size-4 text-muted-foreground" aria-hidden="true" />}
          Lesson {l.lesson}
        </h3>
        <span className="text-sm text-muted-foreground tabular-nums">{l.done} of {l.points.length} learned</span>
      </div>
      {!l.unlock.open && <p className="mt-1 text-sm text-muted-foreground">{lockNote(l)}</p>}
      <ul className="mt-3 flex flex-col divide-y divide-border">
        {l.points.map((p) => (
          <li key={p.code}>
            <Link href={`/grammar/${p.code}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
              <span className="min-w-0">
                <span lang="ja" className="block font-jp text-lg">{p.pattern}</span>
                <span className="block text-sm text-muted-foreground">{p.meaning}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={cn('text-xs font-medium', STATUS[p.status].className)}>{STATUS[p.status].label}</span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {l.points.some((p) => p.status !== 'review') && (
        <MarkGrammarLearned codes={l.points.filter((p) => p.status !== 'review').map((p) => p.code)} label={`Mark lesson ${l.lesson} as learned`} className="mt-2" />
      )}
    </section>
  )
}

export default async function GrammarPage() {
  const g = await getGrammarOverview()
  const learnCount = g.today.newLeft + g.today.learningDue
  const n5 = g.lessons.filter((l) => l.level === 'N5')
  const n4 = g.lessons.filter((l) => l.level === 'N4')

  return (
    <>
      <PageHeader eyebrow="文法" title="Grammar" description="Patterns from Minna no Nihongo lessons 1–50, practiced with the words you already know." />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-5">
          <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-5 text-primary" aria-hidden="true" /> Learn today</p>
          <p className="text-sm text-muted-foreground">
            {learnCount === 0 ? 'Nothing to learn right now.' : `${g.today.newLeft} new ${g.today.newLeft === 1 ? 'pattern' : 'patterns'} · ${g.today.learningDue} ${g.today.learningDue === 1 ? 'pattern' : 'patterns'} to practice`}
          </p>
          <Link href="/grammar/session?mode=learn" aria-disabled={learnCount === 0} className={cn(actionButton({ size: 'lg' }), 'w-full', learnCount === 0 && 'pointer-events-none opacity-50')}>Start</Link>
        </div>
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 font-semibold"><RotateCcw className="size-5 text-cyan" aria-hidden="true" /> Review</p>
          <p className="text-sm text-muted-foreground">
            {g.today.reviewDue === 0 ? 'No patterns due.' : `${g.today.reviewDue} ${g.today.reviewDue === 1 ? 'pattern' : 'patterns'} due`} · up to {g.settings.reviewCap} a day
          </p>
          <Link href="/grammar/session?mode=review" aria-disabled={g.today.reviewDue === 0} className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'w-full', g.today.reviewDue === 0 && 'pointer-events-none opacity-50')}>Review</Link>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Link href="/grammar/practice" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-[#3b4250]">
          <Dumbbell className="size-5 text-yellow" aria-hidden="true" />
          <span><span className="block font-medium">Practice</span><span className="block text-xs text-muted-foreground">Choose patterns and exercise types</span></span>
        </Link>
        <Link href="/grammar/test" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-[#3b4250]">
          <BookOpenCheck className="size-5 text-success" aria-hidden="true" />
          <span><span className="block font-medium">Test</span><span className="block text-xs text-muted-foreground">{g.testable.length ? `${g.testable.length} ${g.testable.length === 1 ? 'lesson' : 'lessons'} ready` : 'Learn every pattern of a lesson first'}</span></span>
        </Link>
        <Link href="/grammar/verbs" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-[#3b4250]">
          <Languages className="size-5 text-cyan" aria-hidden="true" />
          <span><span className="block font-medium">Verb forms</span><span className="block text-xs text-muted-foreground">Conjugation practice</span></span>
        </Link>
      </div>

      {g.lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">Grammar content is not available yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {[{ title: 'N5 · Lessons 1–25', list: n5 }, { title: 'N4 · Lessons 26–50', list: n4 }].filter((g2) => g2.list.length).map((group) => (
            <div key={group.title} className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">{group.title}</h2>
              {group.list.map((l) => <LessonCard key={l.lesson} l={l} />)}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
