import Link from 'next/link'
import { Blocks, Keyboard, Shuffle, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toneStyles } from '@/lib/tones'

const items = [
  { href: '/practice/speed-matching', label: 'Speed Matching', meta: '60s', icon: Shuffle, tone: 'cyan' as const },
  { href: null, label: 'Rapid Fire', meta: 'Coming soon', icon: Timer, tone: 'pink' as const },
  { href: null, label: 'Word Builder', meta: 'Coming soon', icon: Blocks, tone: 'yellow' as const },
  { href: null, label: 'Recall Sprint', meta: 'Coming soon', icon: Keyboard, tone: 'primary' as const },
]

export function QuickTraining() {
  return (
    <section aria-labelledby="quick-training-title">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="quick-training-title" className="text-lg font-semibold">
          Quick training
        </h2>
        <Link href="/practice" className="text-sm text-muted-foreground hover:text-foreground">
          See all
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => {
          const styles = toneStyles[item.tone]
          const Icon = item.icon
          const content = (
            <>
              <span className={cn('flex size-10 items-center justify-center rounded-xl', styles.soft)}>
                <Icon className={cn('size-5', styles.text)} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.meta}</span>
              </span>
            </>
          )
          const className = 'flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4'
          return (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href} className={cn(className, 'transition-all duration-200 hover:-translate-y-0.5', styles.ring)}>{content}</Link>
              ) : (
                <div className={cn(className, 'opacity-70')}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
