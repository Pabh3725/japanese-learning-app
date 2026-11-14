'use client'

// V10 — Một mẫu thẻ cho cả Library (từ vựng, Kanji, ngữ pháp): chữ lớn, sao và dấu "đã biết" ở góc trên,
// cách đọc / Hán Việt / nghĩa, góc dưới phải là "N5 · U1" trên trạng thái.
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CLASS: Record<string, string> = {
  'Not started': 'text-muted-foreground',
  Learning: 'text-yellow',
  Reviewing: 'text-cyan',
  Learned: 'text-success',
  'Already known': 'text-success',
}

/** Nút "đã biết": bật là đã biết, bấm lại là hoàn tác. */
export function KnownTick({ on, onToggle, disabled, label }: { on: boolean; onToggle: () => void; disabled?: boolean; label: string }) {
  const title = on ? `Undo: ${label}` : label
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      aria-label={title}
      title={title}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-secondary disabled:opacity-50',
        on ? 'text-success' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Check className={cn('size-5', on && 'stroke-[3]')} aria-hidden="true" />
    </button>
  )
}

export function LibraryCard({
  title,
  href,
  titleClassName,
  reading,
  hanViet,
  meaning,
  unit,
  status,
  actions,
  selected,
  overlay,
}: {
  title: string
  href: string
  titleClassName?: string
  reading?: string | null
  hanViet?: string | null
  meaning: string
  /** "N5 · U1" */
  unit: string
  status: string
  /** Sao và dấu "đã biết". */
  actions: ReactNode
  selected?: boolean
  /** Lớp chọn khi đang chọn nhiều mục. */
  overlay?: ReactNode
}) {
  return (
    <li className={cn('relative flex flex-col gap-2 rounded-2xl border bg-card p-5', selected ? 'border-primary' : 'border-border')}>
      {overlay}
      <div className="flex items-start justify-between gap-2">
        <Link href={href} lang="ja" className={cn('font-jp text-3xl font-medium hover:text-primary', titleClassName)}>
          {title}
        </Link>
        <span className="flex items-center">{actions}</span>
      </div>
      {(reading || hanViet) && (
        <div>
          {reading && <p lang="ja" className="font-jp text-cyan">{reading}</p>}
          {hanViet && <p className="text-xs tracking-wider text-yellow uppercase">{hanViet}</p>}
        </div>
      )}
      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="font-medium">{meaning}</p>
        <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
          {unit && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground tabular-nums">{unit}</span>}
          <span className={cn('font-medium', STATUS_CLASS[status] ?? 'text-muted-foreground')}>{status}</span>
        </span>
      </div>
    </li>
  )
}
