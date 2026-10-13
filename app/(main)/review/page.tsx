import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { ProgressBar } from '@/components/progress-bar'
import { reviewQueue, userProfile } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const forecast = [
  { label: 'Today', count: userProfile.dueToday },
  { label: 'Tomorrow', count: 31 },
  { label: 'In 3 days', count: 18 },
  { label: 'This week', count: 96 },
]

export default function ReviewPage() {
  return (
    <>
      <PageHeader eyebrow="復習" title="Review" description="Spaced repetition keeps what you've learned fresh. A few minutes a day is enough." />

      <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Due now</p>
            <p className="mt-1 text-5xl font-semibold tabular-nums">{userProfile.dueToday}</p>
            <p className="mt-2 text-sm text-subtle">About 8 minutes · Retention {Math.round(userProfile.retention * 100)}%</p>
          </div>
          <Link href="/review/session" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-8')}>
            <Play aria-hidden="true" />
            Start Review
          </Link>
        </div>
        <ProgressBar className="mt-6" value={userProfile.retention * 100} tone="success" label="Retention rate" />
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-semibold">Upcoming</h2>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {forecast.map((f) => (
              <li key={f.label} className="flex items-center justify-between py-3 text-sm">
                <span className="text-subtle">{f.label}</span>
                <span className="font-medium tabular-nums">{f.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-semibold">In this session</h2>
          <ul className="mt-4 grid grid-cols-4 gap-2">
            {reviewQueue.map((c) => (
              <li key={c.id} lang="ja" className="flex aspect-square items-center justify-center rounded-2xl bg-secondary font-jp text-2xl">
                {c.front}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
