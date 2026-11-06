import { PageHeader } from '@/components/page-header'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getProgressStats } from '@/lib/dal/progress'
import { getReviewOverview } from '@/lib/dal/review'
import { cn } from '@/lib/utils'

export default async function ProgressPage() {
  const [progress, learn, review] = await Promise.all([getProgressStats(), getLearnOverview(), getReviewOverview()])
  const cards = Object.values(review.byType).reduce((sum, n) => sum + n, 0)
  const stats = [
    { label: 'Day streak', value: String(progress.streak), tone: 'text-yellow' },
    { label: 'Words completed', value: String(learn.completed), tone: 'text-cyan' },
    { label: 'Review cards', value: String(cards), tone: 'text-pink' },
    { label: 'Retention (30 days)', value: progress.retention === null ? '—' : `${Math.round(progress.retention * 100)}%`, tone: 'text-success' },
  ]
  const maxAnswered = Math.max(...progress.week.map((d) => d.answered))
  const totalAnswered = progress.week.reduce((sum, d) => sum + d.answered, 0)

  return (
    <>
      <PageHeader eyebrow="進歩" title="Progress" description="Small daily steps add up. Here's how far you've come." />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className={cn('mt-1 text-3xl font-semibold tabular-nums', s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="week-title" className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <h2 id="week-title" className="font-semibold">Last 7 days</h2>
          <p className="text-sm text-muted-foreground tabular-nums">{totalAnswered} {totalAnswered === 1 ? 'question' : 'questions'}</p>
        </div>
        {totalAnswered === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Your activity will appear here once you answer your first question.</p>
        ) : (
          <ul className="mt-6 flex h-48 items-end gap-2 md:gap-4">
            {progress.week.map((d) => (
              <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{d.answered}</span>
                <div
                  className="w-full max-w-10 rounded-lg bg-primary/80"
                  style={{ height: `${(d.answered / maxAnswered) * 100}%` }}
                  aria-label={`${d.label}: ${d.answered} questions`}
                  role="img"
                />
                <span className="text-xs text-subtle">{d.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
