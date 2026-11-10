import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { getReviewOverview, type ReviewArea, type ReviewAreaOverview } from '@/lib/dal/review'
import { cn } from '@/lib/utils'

/** Ước lượng để người học biết phiên ôn dài khoảng bao lâu. */
const SECONDS_PER_CARD = 15

// V9 §9.4: hai mục riêng, không có nút trộn. Kanji riêng lẻ ôn trong khu Kanji.
const AREAS: { area: ReviewArea; title: string; jp: string; description: string }[] = [
  { area: 'kana', title: 'Vocabulary', jp: '語彙', description: 'Meaning → type the kana. Starred-word cards come after.' },
  { area: 'kanji', title: 'Kanji words', jp: '漢字語', description: 'Read the Kanji and its Sino-Vietnamese, or write it from the meaning.' },
]

function AreaCard({ area, title, jp, description, overview }: (typeof AREAS)[number] & { overview: ReviewAreaOverview }) {
  const minutes = Math.max(1, Math.ceil((overview.dueNow * SECONDS_PER_CARD) / 60))
  const forecast = [
    { label: 'Tomorrow', count: overview.dueTomorrow },
    { label: 'Next 3 days', count: overview.dueIn3Days },
    { label: 'Next 7 days', count: overview.dueThisWeek },
  ]
  return (
    <section aria-labelledby={`review-${area}`} className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <p lang="ja" className="font-jp text-xs text-muted-foreground">{jp}</p>
      <h2 id={`review-${area}`} className="mt-1 text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-subtle">{description}</p>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Due now</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{overview.dueNow}</p>
          <p className="mt-2 text-sm text-subtle">
            {overview.dueNow > 0 ? `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : 'Nothing to review right now'}
            {overview.reviewedToday > 0 && ` · ${overview.reviewedToday} of ${overview.cap} reviewed today`}
            {overview.deferred > 0 && ` · ${overview.deferred} moved to tomorrow`}
          </p>
        </div>
        {overview.dueNow > 0 && (
          <Link href={`/review/session?type=${area}`} className={cn(actionButton({ size: 'lg' }), 'w-full sm:w-auto sm:px-8')}>
            <Play aria-hidden="true" />
            Start
          </Link>
        )}
      </div>
      <ul className="mt-5 flex flex-col divide-y divide-border border-t border-border">
        {forecast.map((f) => (
          <li key={f.label} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-subtle">{f.label}</span>
            <span className="font-medium tabular-nums">{f.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function ReviewPage() {
  const overview = await getReviewOverview()

  return (
    <>
      <PageHeader eyebrow="復習" title="Review" description="Spaced repetition keeps what you've learned fresh. Kanji cards are reviewed in the Kanji area." />

      <div className="grid gap-6 md:grid-cols-2">
        {AREAS.map((a) => (
          <AreaCard key={a.area} {...a} overview={overview.areas[a.area]} />
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/learn/kanji" className="underline underline-offset-2">Go to Kanji</Link> to review your Kanji cards.
      </p>
    </>
  )
}
