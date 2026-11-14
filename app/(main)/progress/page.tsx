import { BookText, Layers, Languages } from 'lucide-react'
import { DashboardStatCard } from '@/components/dashboard/dashboard-stat-card'
import { PageHeader } from '@/components/page-header'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getProgressStats } from '@/lib/dal/progress'
import { getReviewOverview } from '@/lib/dal/review'
import { TARGET_RETENTION } from '@/lib/srs/retention'
import { cn } from '@/lib/utils'

export default async function ProgressPage() {
  const [progress, learn, review] = await Promise.all([getProgressStats(), getLearnOverview(), getReviewOverview()])
  const cards = Object.values(review.byType).reduce((sum, n) => sum + n, 0)
  const pct = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`)
  const { retention } = progress
  // V11: tỷ lệ nhớ thật theo từng khu, so với mục tiêu của FSRS
  const areas = [
    { label: 'Vocabulary', r: retention.byArea.vocabulary },
    { label: 'Kanji words', r: retention.byArea.kanji_words },
    { label: 'Kanji', r: retention.byArea.kanji },
  ].filter((a) => a.r.count > 0)
  const stats = [
    { label: 'Day streak', value: String(progress.streak), tone: 'text-yellow', note: null as string | null },
    {
      label: 'Retention (30 days)',
      value: pct(retention.overall.rate),
      tone: retention.overall.rate !== null && retention.overall.rate < TARGET_RETENTION - 0.05 ? 'text-yellow' : 'text-success',
      note: retention.overall.count > 0 ? `Target ${pct(TARGET_RETENTION)} · ${areas.map((a) => `${a.label} ${pct(a.r.rate)}`).join(' · ')}` : 'Shows after your first review of a learned card',
    },
  ]
  const maxAnswered = Math.max(...progress.week.map((d) => d.answered))
  const totalAnswered = progress.week.reduce((sum, d) => sum + d.answered, 0)

  return (
    <>
      <PageHeader eyebrow="進歩" title="Progress" description="Small daily steps add up. Here's how far you've come." />

      <dl className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className={cn('mt-1 text-3xl font-semibold tabular-nums', s.tone)}>{s.value}</dd>
            {s.note && <dd className="mt-1 text-xs text-muted-foreground">{s.note}</dd>}
          </div>
        ))}
      </dl>

      {/* Chuyển từ Home sang (2026-11-14): tiến độ theo cấp, từ đang học, Card đã tạo */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {learn.levels.map((level) => (
          <DashboardStatCard key={level.level} label={`${level.level} completed`} value={level.completed} total={level.total} icon={BookText} tone={level.level === 'N5' ? 'cyan' : 'primary'} jp={level.level === 'N5' ? '語' : '話'} />
        ))}
        <DashboardStatCard label="Words in progress" value={learn.inProgress} icon={Languages} tone="yellow" jp="習" />
        <DashboardStatCard label="Cards created" value={cards} icon={Layers} tone="pink" jp="札" />
      </div>

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
