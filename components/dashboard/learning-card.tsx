import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toneStyles, type ToneName } from '@/lib/tones'

interface LearningCardProps {
  href: string
  title: string
  description: string
  sample: string
  count: number
  countLabel: string
  tone: ToneName
}

export function LearningCard({ href, title, description, sample, count, countLabel, tone }: LearningCardProps) {
  const styles = toneStyles[tone]
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col justify-between gap-6 rounded-3xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1a1d25] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        styles.ring,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span
          className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl font-jp text-2xl font-medium', styles.soft, styles.text)}
          aria-hidden="true"
        >
          {sample}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm">
          <span className={cn('text-lg font-semibold tabular-nums', styles.text)}>{count}</span>{' '}
          <span className="text-muted-foreground">{countLabel}</span>
        </p>
        <ArrowRight
          className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
