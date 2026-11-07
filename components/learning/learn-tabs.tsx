import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'vocabulary', href: '/learn', label: 'Vocabulary' },
  { id: 'word_kanji', href: '/learn/word-kanji', label: 'Kanji words' },
  { id: 'kanji', href: '/learn/kanji', label: 'Kanji' },
] as const

/** Khu Learn có ba mục trong một tab, và nút học hỗn hợp trộn cả ba. */
export function LearnTabs({ active }: { active: (typeof TABS)[number]['id'] }) {
  return (
    <div className="mb-6 flex flex-col gap-3">
    <nav aria-label="Learn sections" className="flex gap-2 rounded-2xl border border-border bg-card p-1.5">
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
    <Link href="/learn/mixed" className="text-center text-sm font-medium text-primary underline-offset-2 hover:underline">
      Mixed: practice everything due together
    </Link>
    </div>
  )
}
