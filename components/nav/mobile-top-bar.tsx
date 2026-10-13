'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isActive, secondaryNav } from './nav-items'

export function MobileTopBar() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur lg:hidden">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 font-jp text-lg font-bold text-primary">
          日
        </span>
        <span className="font-semibold">Nihongo</span>
      </Link>
      <nav aria-label="Secondary">
        <ul className="flex items-center gap-1">
          {secondaryNav.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-xl transition-colors duration-150',
                    active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
