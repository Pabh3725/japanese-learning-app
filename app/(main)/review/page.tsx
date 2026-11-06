import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { getReviewOverview } from '@/lib/dal/review'
import type { CardType } from '@/lib/learning/types'
import { cn } from '@/lib/utils'

const CARD_LABELS: Record<CardType, string> = {
  'vocab.meaning_kana': 'Meaning ↔ Kana',
  'vocab.kana_hanviet': 'Kana ↔ Sino-Vietnamese',
  'vocab.meaning_kanji': 'Meaning → Kanji',
  'vocab.kanji_meaning_hanviet': 'Kanji → Meaning, Sino-Vietnamese',
  'vocab.meaning_hanviet': 'Meaning ↔ Sino-Vietnamese',
}

/** Ước lượng để người học biết phiên ôn dài khoảng bao lâu. */
const SECONDS_PER_CARD = 15

export default async function ReviewPage() {
  const overview = await getReviewOverview()
  const minutes = Math.max(1, Math.ceil((overview.dueNow * SECONDS_PER_CARD) / 60))
  const forecast = [
    { label: 'Tomorrow', count: overview.dueTomorrow },
    { label: 'Next 3 days', count: overview.dueIn3Days },
    { label: 'Next 7 days', count: overview.dueThisWeek },
  ]

  return (
    <>
      <PageHeader eyebrow="復習" title="Review" description="Spaced repetition keeps what you've learned fresh." />

      <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Due now</p>
            <p className="mt-1 text-5xl font-semibold tabular-nums">{overview.dueNow}</p>
            <p className="mt-2 text-sm text-subtle">
              {overview.dueNow > 0 ? `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : 'Nothing to review right now'}
              {overview.reviewedToday > 0 && ` · ${overview.reviewedToday} reviewed today`}
              {overview.deferred > 0 && ` · ${overview.deferred} moved to tomorrow`}
            </p>
          </div>
          {overview.dueNow > 0 && (
            <Link href="/review/session" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-8')}>
              <Play aria-hidden="true" />
              Start Review
            </Link>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-semibold">Upcoming</h2>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {forecast.map((f) => (
              <li key={f.label} className="flex items-center justify-between py-3 text-sm">
                <span className="text-subtle">{f.label}</span>
                <span className="font-medium tabular-nums">{f.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-semibold">Your cards</h2>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {(Object.keys(CARD_LABELS) as CardType[]).map((type) => (
              <li key={type} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-subtle">{CARD_LABELS[type]}</span>
                <span className="font-medium tabular-nums">{overview.byType[type]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
