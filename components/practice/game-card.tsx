import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { toneStyles, type ToneName } from '@/lib/tones'
import { cn } from '@/lib/utils'

interface GameCardProps {
  /** Chưa có thì trò chơi chưa mở. */
  href: string | null
  title: string
  jp: string
  description: string
  icon: LucideIcon
  tone: ToneName
  meta: string
  badge?: string
}

export function GameCard({ href, title, jp, description, icon: Icon, tone, meta, badge }: GameCardProps) {
  const t = toneStyles[tone]
  const className = cn(
    'group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-border bg-card p-6',
    href ? cn('transition-all duration-200 hover:-translate-y-0.5', t.ring) : 'opacity-70',
  )
  const content = (
    <>
      <div className={cn('pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-40 blur-3xl', t.soft)} aria-hidden="true" />
      <div className="flex items-start justify-between">
        <span className={cn('flex size-12 items-center justify-center rounded-2xl', t.soft, t.text)}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        {href ? badge && <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', t.soft, t.text)}>{badge}</span> : <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">Coming soon</span>}
      </div>
      <div>
        <p lang="ja" className="font-jp text-sm text-muted-foreground">{jp}</p>
        <h3 className="mt-1 text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-subtle">{description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{meta}</span>
        {href && (
          <span className={cn('flex items-center gap-1 font-medium', t.text)}>
            Play
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </>
  )
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>
}
