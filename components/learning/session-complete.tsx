import Image from 'next/image'
import Link from 'next/link'
import { actionButton } from '@/components/action-button'
import { Sparkles } from '@/components/sparkles'
import { cn } from '@/lib/utils'

interface Stat {
  label: string
  value: string
  tone: string
}

interface SessionCompleteProps {
  title: string
  subtitle: string
  stats: Stat[]
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
  onRestart?: () => void
}

export function SessionComplete({ title, subtitle, stats, primary, secondary, onRestart }: SessionCompleteProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="relative">
        <Sparkles className="-inset-8" />
        <div className="relative size-40 overflow-hidden rounded-[2rem] bg-card">
          <Image src="/images/mascot-trophy.png" alt="" fill sizes="160px" className="object-cover" priority />
        </div>
      </div>
      <div>
        <p className="font-jp text-sm text-primary">よくできました</p>
        <h1 className="mt-2 text-balance text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-subtle">{subtitle}</p>
      </div>
      <dl className="grid w-full grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className={cn('mt-1 text-xl font-semibold tabular-nums', s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex w-full flex-col gap-3">
        <Link href={primary.href} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
          {primary.label}
        </Link>
        <Link href={secondary.href} className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'w-full')}>
          {secondary.label}
        </Link>
        {onRestart && (
          <button type="button" onClick={onRestart} className={actionButton({ variant: 'ghost' })}>
            Do it again
          </button>
        )}
      </div>
    </div>
  )
}
