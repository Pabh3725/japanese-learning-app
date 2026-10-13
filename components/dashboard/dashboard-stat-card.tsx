import type { LucideIcon } from 'lucide-react'
import { ProgressBar } from '@/components/progress-bar'
import { cn } from '@/lib/utils'
import { toneStyles, type ToneName } from '@/lib/tones'

interface DashboardStatCardProps {
  label: string
  value: number
  total?: number
  suffix?: string
  icon: LucideIcon
  tone: ToneName
  jp?: string
}

export function DashboardStatCard({ label, value, total, suffix, icon: Icon, tone, jp }: DashboardStatCardProps) {
  const styles = toneStyles[tone]
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className={cn('flex size-10 items-center justify-center rounded-xl', styles.soft)}>
          <Icon className={cn('size-5', styles.text)} aria-hidden="true" />
        </span>
        {jp && <span className="font-jp text-2xl text-muted-foreground/60" aria-hidden="true">{jp}</span>}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {value}
          {total !== undefined && <span className="text-base font-normal text-muted-foreground"> / {total}</span>}
          {suffix && <span className="text-base font-normal text-muted-foreground">{suffix}</span>}
        </p>
      </div>
      {total !== undefined && <ProgressBar value={value} max={total} tone={tone} size="sm" label={label} />}
    </div>
  )
}
