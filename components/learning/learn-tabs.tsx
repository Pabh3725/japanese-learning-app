import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'vocabulary', href: '/learn', label: 'Vocabulary' },
  { id: 'kanji', href: '/learn/kanji', label: 'Kanji' },
] as const

/** Khu Learn chia hai mục: học từ vựng và học Kanji. */
export function LearnTabs({ active }: { active: (typeof TABS)[number]['id'] }) {
  return (
    <nav aria-label="Learn sections" className="mb-6 flex gap-2 rounded-2xl border border-border bg-card p-1.5">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? 'page' : undefined}
          className={cn(
            'flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-colors',
            active === tab.id ? 'bg-primary/12 text-primary' : 'text-subtle hover:bg-secondary hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
