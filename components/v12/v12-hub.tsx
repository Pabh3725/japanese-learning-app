// V12 §1–2: trang Learn với ba khu, nút "Học tất cả", cân bằng và cảnh báo vượt trần.
import Link from 'next/link'
import { AlertTriangle, Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { RadicalsKnownButton } from '@/components/v12/radicals-known-button'
import type { HubView, ZoneSummary } from '@/lib/dal/v12/deck'
import type { Zone } from '@/lib/v12/card-types'
import { cn } from '@/lib/utils'

const ZONE_INFO: Record<Zone, { title: string; jp: string; body: string; tone: string }> = {
  kana: { title: 'Kana vocabulary', jp: '語彙', body: 'Every word, learned in kana.', tone: 'text-cyan' },
  kanji: { title: 'Kanji', jp: '漢字', body: 'Radicals first, then characters from easy to hard.', tone: 'text-yellow' },
  word_kanji: { title: 'Kanji words', jp: '熟語', body: 'Words written in Kanji, once you know their kana and characters.', tone: 'text-pink' },
}

const fmtDate = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function ZoneCard({ z, radicals }: { z: ZoneSummary; radicals: HubView['radicals'] }) {
  const info = ZONE_INFO[z.zone]
  const todo = z.newItems + z.stageQuestions + z.reviews
  const done = z.deck && z.deck.position >= z.deck.total && z.deck.total > 0
  return (
    <section aria-labelledby={`zone-${z.zone}`} className="flex flex-col rounded-3xl border border-border bg-card p-5">
      <p lang="ja" className="font-jp text-xs text-muted-foreground">{info.jp}</p>
      <h2 id={`zone-${z.zone}`} className="mt-1 font-semibold">{info.title}</h2>
      <p className="mt-1 text-sm text-subtle">{info.body}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['New', z.newItems],
          ['Intro', z.stageQuestions],
          ['Review', z.reviews],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-2xl bg-secondary px-2 py-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn('text-lg font-semibold tabular-nums', info.tone)}>{n}</dd>
          </div>
        ))}
      </dl>
      {z.waiting > 0 && <p className="mt-2 text-xs text-muted-foreground tabular-nums">+{z.waiting} waiting for the next days (over the daily limit)</p>}
      {z.deck && <p className="mt-3 text-xs text-muted-foreground tabular-nums">Today: {Math.min(z.deck.position, z.deck.total)} / {z.deck.total} cards</p>}
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">{z.remaining} not started in this level</p>
      {z.paused && (
        <p className="mt-2 text-xs text-yellow">New items paused: catching up. Today&apos;s intro and review cards already reach this area&apos;s daily limit.</p>
      )}
      {z.zone === 'kanji' && radicals.total > 0 && <RadicalsKnownButton total={radicals.total} known={radicals.known} />}
      <div className="mt-auto pt-4">
        {done ? (
          <p className="text-sm text-success">Done for today</p>
        ) : (
          <Link href={`/learn/v12/${z.zone}`} aria-disabled={todo === 0 && !z.deck} className={cn(actionButton({ size: 'md', variant: 'secondary' }), 'w-full', todo === 0 && !z.deck && 'pointer-events-none opacity-50')}>
            <Play className="fill-current" aria-hidden="true" />
            {z.deck && z.deck.position > 0 ? 'Continue' : 'Start'}
          </Link>
        )}
      </div>
    </section>
  )
}

export function V12Hub({ hub }: { hub: HubView }) {
  const total = hub.zones.reduce((n, z) => n + z.newItems + z.stageQuestions + z.reviews, 0)
  return (
    <>
      <PageHeader eyebrow="語彙" title="Vocab" description="Three areas, each mixing new items, intro practice and review cards for today." />
      <div className="flex max-w-4xl flex-col gap-5">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/40 bg-primary/5 p-5">
          <div>
            <p className="font-semibold">Learn everything</p>
            <p className="text-sm text-subtle">
              {total} cards today across all three areas, shuffled together{hub.level ? ` · N${hub.level}` : ''}.
            </p>
            {hub.balance && (
              <p className="mt-1 text-xs text-muted-foreground">
                Balanced: about {hub.balance.minutes} min of new items a day · all three areas finish this level around {fmtDate(hub.balance.finishDate)} ({hub.balance.days} days)
              </p>
            )}
          </div>
          <Link href="/learn/v12/all" className={actionButton({ size: 'lg' })}>
            <Play className="fill-current" aria-hidden="true" />
            {hub.all && hub.all.position > 0 ? 'Continue' : 'Learn all'}
          </Link>
        </section>

        {hub.warnings.length > 0 && (
          <section role="alert" className="rounded-3xl border border-yellow/40 bg-yellow/5 p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold text-yellow">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Some days will go over your daily limit
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-subtle">
              {hub.warnings.slice(0, 4).map((d) => (
                <li key={d.date}>
                  {fmtDate(d.date)}:{' '}
                  {(Object.entries(d.over) as [Zone, number][]).map(([z, n]) => `${ZONE_INFO[z].title} +${n} over ${hub.caps[z]}`).join(' · ')}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/settings#pace" className={actionButton({ size: 'sm', variant: 'secondary' })}>Lower new items a day</Link>
              <Link href="/settings#advanced" className={actionButton({ size: 'sm', variant: 'secondary' })}>Raise the limit</Link>
            </div>
          </section>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {hub.zones.map((z) => (
            <ZoneCard key={z.zone} z={z} radicals={hub.radicals} />
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Review cards are part of each area&apos;s daily cards.{' '}
          <Link href="/review/archive" className="underline underline-offset-2 hover:text-foreground">Archived cards</Link>: cards you marked as learned.
        </p>
      </div>
    </>
  )
}
