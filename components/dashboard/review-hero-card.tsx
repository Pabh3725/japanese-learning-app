import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { Sparkles } from '@/components/sparkles'
import { cn } from '@/lib/utils'

export function ReviewHeroCard({ due, newCount, minutes }: { due: number; newCount: number; minutes: number }) {
  return (
    <section
      aria-labelledby="review-hero-title"
      className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 shadow-[0_0_60px_-20px_rgba(139,124,255,0.45)] md:p-8"
    >
      <Sparkles />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Daily review</p>
          <h2 id="review-hero-title" className="mt-2 text-balance text-2xl font-semibold md:text-3xl">
            <span className="tabular-nums">{due}</span> cards are waiting for you
          </h2>
          <p className="mt-2 text-subtle">
            About {minutes} minutes · {newCount} new items included
          </p>
        </div>
        <Link href="/review/session" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-8')}>
          <Play className="fill-current" aria-hidden="true" />
          Start Review
        </Link>
      </div>
    </section>
  )
}
