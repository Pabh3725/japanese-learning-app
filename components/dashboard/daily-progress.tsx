import { Check } from 'lucide-react'
import { ProgressBar } from '@/components/progress-bar'
import { cn } from '@/lib/utils'

const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function DailyProgress({ completed, goal, streakDaysThisWeek }: { completed: number; goal: number; streakDaysThisWeek: number }) {
  const percent = Math.round((completed / goal) * 100)
  return (
    <section aria-labelledby="daily-progress-title" className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="daily-progress-title" className="font-semibold">
          Today&apos;s goal
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {completed}/{goal} cards
        </span>
      </div>
      <ProgressBar value={completed} max={goal} tone="success" size="lg" className="mt-4" label="Daily goal progress" />
      <p className="mt-3 text-sm text-subtle">{percent}% done — {goal - completed} more to hit your goal.</p>

      <ul className="mt-5 flex justify-between" aria-label="This week">
        {days.map((d, i) => {
          const done = i < streakDaysThisWeek
          const today = i === streakDaysThisWeek
          return (
            <li key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-xs',
                  done && 'bg-yellow/15 text-yellow',
                  today && 'border border-dashed border-yellow/60 text-yellow',
                  !done && !today && 'bg-secondary text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" aria-label="Done" /> : null}
              </span>
              <span className="text-xs text-muted-foreground">{d}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
