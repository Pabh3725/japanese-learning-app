import Link from 'next/link'
import { Blocks, Keyboard, Shuffle, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toneStyles } from '@/lib/tones'

const items = [
  { href: '/practice/speed-matching', label: 'Speed Matching', meta: '60s', icon: Shuffle, tone: 'cyan' as const },
  { href: '/practice', label: 'Rapid Fire', meta: '20 Qs', icon: Timer, tone: 'pink' as const },
  { href: '/learn/session?mode=vocab', label: 'Word Builder', meta: 'Kana', icon: Blocks, tone: 'yellow' as const },
  { href: '/practice', label: 'Recall Sprint', meta: 'Typing', icon: Keyboard, tone: 'primary' as const },
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
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  'flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5',
                  styles.ring,
                )}
              >
                <span className={cn('flex size-10 items-center justify-center rounded-xl', styles.soft)}>
                  <Icon className={cn('size-5', styles.text)} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.meta}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
