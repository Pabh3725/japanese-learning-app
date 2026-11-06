'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isActive, primaryNav, secondaryNav } from './nav-items'

export function AppSidebar({ streak }: { streak: React.ReactNode }) {
  const pathname = usePathname()

  const renderItem = (item: (typeof primaryNav)[number]) => {
    const active = isActive(pathname, item.href)
    const Icon = item.icon
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150',
            active ? 'bg-primary/12 text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          <Icon className={cn('size-5', active && 'text-primary')} aria-hidden="true" />
          {item.label}
        </Link>
      </li>
    )
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card/60 px-4 py-6 lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 font-jp text-xl font-bold text-primary">
          日
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">Nihongo</span>
          <span className="text-xs text-muted-foreground">Japanese Learning</span>
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-6">
        <ul className="flex flex-col gap-1">{primaryNav.map(renderItem)}</ul>
        <div>
          <p className="mb-2 px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">More</p>
          <ul className="flex flex-col gap-1">{secondaryNav.map(renderItem)}</ul>
        </div>
      </nav>

      {streak}
    </aside>
  )
}
