'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Ô tick dùng cho màn chọn ngữ pháp, dạng bài và thể động từ. */
export function CheckTile({ checked, onToggle, title, subtitle, japanese }: {
  checked: boolean
  onToggle: () => void
  title: string
  subtitle?: string
  japanese?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors',
        checked ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-[#3b4250]',
      )}
    >
      <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
        {checked && <Check className="size-3.5" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span lang={japanese ? 'ja' : undefined} className={cn('block font-medium', japanese && 'font-jp text-base')}>{title}</span>
        {subtitle && <span className="mt-0.5 block text-sm text-muted-foreground">{subtitle}</span>}
      </span>
    </button>
  )
}
