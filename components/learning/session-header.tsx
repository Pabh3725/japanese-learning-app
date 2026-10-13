import Link from 'next/link'
import { X } from 'lucide-react'
import { ProgressBar } from '@/components/progress-bar'

interface SessionHeaderProps {
  backHref: string
  label: string
  sublabel?: string
  current: number
  total: number
}

export function SessionHeader({ backHref, label, sublabel, current, total }: SessionHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 pt-4 md:pt-8">
      <Link
        href={backHref}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-5" aria-hidden="true" />
        <span className="sr-only">Exit session</span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="truncate font-medium text-subtle">
            {label}
            {sublabel && <span className="text-muted-foreground"> · {sublabel}</span>}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {Math.min(current, total)}/{total}
          </span>
        </div>
        <ProgressBar value={current} max={total} size="sm" label="Session progress" />
      </div>
    </header>
  )
}
