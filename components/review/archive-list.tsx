'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreCardAction } from '@/app/review/actions'
import { actionButton } from '@/components/action-button'
import { ARCHIVE_TYPE_LABELS, type ArchiveCardType, type ArchivedCard } from '@/lib/review/archive'
import { formatVnDateTime } from '@/lib/learning/time'
import { withRetry } from '@/lib/retry'
import { cn } from '@/lib/utils'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."
const FILTERS: { id: 'all' | ArchiveCardType; label: string }[] = [
  { id: 'all', label: 'All' },
  ...(Object.keys(ARCHIVE_TYPE_LABELS) as ArchiveCardType[]).map((id) => ({ id, label: ARCHIVE_TYPE_LABELS[id] })),
]

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()

function ArchivedRow({ card }: { card: ArchivedCard }) {
  const router = useRouter()
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const restore = (mode: 'keep' | 'reset') => {
    setAsking(false)
    setError(null)
    const eventId = crypto.randomUUID()
    startSaving(async () => {
      try {
        const { status } = await withRetry(() => restoreCardAction(card.kind, card.id, mode, eventId))
        if (status !== 'saved' && status !== 'duplicate') throw new Error(status)
        router.refresh()
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span lang="ja" className="font-jp text-xl">{card.title}</span>
          <span lang={card.kind === 'vocab' ? 'ja' : undefined} className={cn('text-sm', card.kind === 'vocab' ? 'font-jp text-cyan' : 'font-semibold text-yellow')}>{card.subtitle}</span>
          <span className="text-sm text-subtle">{card.meaning}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {ARCHIVE_TYPE_LABELS[card.type]} · archived {formatVnDateTime(new Date(card.archivedAt))} · kept: next review {formatVnDateTime(new Date(card.dueAt))}, stability {Math.round(card.stability)} days, {card.reps} reviews, {card.lapses} lapses
        </p>
        {error && <p role="alert" className="mt-1 text-xs text-error">{error}</p>}
      </div>
      {asking ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <p className="text-sm text-subtle">Start this card over? Its schedule resets; your history stays.</p>
          <button type="button" onClick={() => restore('reset')} className={actionButton({ variant: 'secondary', size: 'sm' })}>Start over</button>
          <button type="button" onClick={() => setAsking(false)} className={actionButton({ variant: 'ghost', size: 'sm' })}>Cancel</button>
        </div>
      ) : (
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={saving} onClick={() => restore('keep')} className={actionButton({ variant: 'secondary', size: 'sm' })}>Restore</button>
          <button type="button" disabled={saving} onClick={() => setAsking(true)} className={actionButton({ variant: 'ghost', size: 'sm' })}>Start over…</button>
        </div>
      )}
    </li>
  )
}

/** Kho lưu trữ (R13): tìm theo từ, cách đọc, nghĩa, Hán Việt; lọc theo loại Card. */
export function ArchiveList({ cards }: { cards: ArchivedCard[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | ArchiveCardType>('all')
  const shown = useMemo(() => {
    const q = fold(query.trim())
    return cards.filter((c) => (filter === 'all' || c.type === filter) && (q === '' || fold(`${c.title} ${c.subtitle} ${c.meaning}`).includes(q)))
  }, [cards, query, filter])

  if (cards.length === 0) {
    return <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">No archived cards. Tap “I&apos;ve learned this card” during a review to stop reviewing a card you know well.</p>
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search word, reading, meaning…"
          aria-label="Search archived cards"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by card type">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn('rounded-full border px-3 py-1 text-xs', filter === f.id ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{shown.length} of {cards.length} cards</p>
      <ul className="mt-1 flex flex-col divide-y divide-border">
        {shown.map((c) => (
          <ArchivedRow key={`${c.kind}-${c.id}`} card={c} />
        ))}
      </ul>
    </section>
  )
}
