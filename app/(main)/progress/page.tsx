import Image from 'next/image'
import { Award, Lock } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { achievements, userProfile, weeklyActivity } from '@/lib/mock-data'
import { toneStyles } from '@/lib/tones'
import { cn } from '@/lib/utils'

const stats = [
  { label: 'Day streak', value: String(userProfile.streak), tone: 'text-yellow' },
  { label: 'Words learned', value: String(userProfile.vocabLearned), tone: 'text-cyan' },
  { label: 'Kanji learned', value: String(userProfile.kanjiLearned), tone: 'text-pink' },
  { label: 'Retention', value: `${Math.round(userProfile.retention * 100)}%`, tone: 'text-success' },
]

export default function ProgressPage() {
  const maxMinutes = Math.max(...weeklyActivity.map((d) => d.minutes))
  const totalMinutes = weeklyActivity.reduce((sum, d) => sum + d.minutes, 0)

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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="week-title" className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h2 id="week-title" className="font-semibold">This week</h2>
            <p className="text-sm text-muted-foreground tabular-nums">{totalMinutes} min total</p>
          </div>
          <ul className="mt-6 flex h-48 items-end gap-2 md:gap-4">
            {weeklyActivity.map((d) => (
              <li key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{d.minutes}</span>
                <div
                  className="w-full max-w-10 rounded-lg bg-primary/80"
                  style={{ height: `${(d.minutes / maxMinutes) * 100}%` }}
                  aria-label={`${d.day}: ${d.minutes} minutes`}
                  role="img"
                />
                <span className="text-xs text-subtle">{d.day}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ach-title" className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 id="ach-title" className="font-semibold">Achievements</h2>
            <Image src="/images/mascot-trophy.png" alt="" width={48} height={48} className="size-12" />
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {achievements.map((a) => {
              const t = toneStyles[a.color]
              return (
                <li key={a.id} className={cn('flex items-center gap-3 rounded-2xl p-3', a.unlocked ? 'bg-secondary' : 'opacity-60')}>
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', a.unlocked ? cn(t.soft, t.text) : 'bg-secondary text-muted-foreground')}>
                    {a.unlocked ? <Award className="size-5" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {a.title}
                      {!a.unlocked && <span className="sr-only"> (locked)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
