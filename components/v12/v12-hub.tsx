// V12 §1–2: trang Learn với ba khu, nút "Học tất cả", cân bằng và cảnh báo vượt trần.
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import type { HubView, ZoneSummary } from '@/lib/dal/v12/deck'
import type { Zone } from '@/lib/v12/card-types'
import { cn } from '@/lib/utils'

const ZONE_INFO: Record<Zone, { title: string; jp: string; body: string; tone: string }> = {
  kana: { title: 'Kana vocabulary', jp: '語彙', body: 'Every word, learned in kana.', tone: 'text-cyan' },
  kanji: { title: 'Kanji', jp: '漢字', body: 'Characters from easy to hard, N5 then N4.', tone: 'text-yellow' },
  word_kanji: { title: 'Kanji words', jp: '熟語', body: 'Words written in Kanji, once you know their kana and characters.', tone: 'text-pink' },
}

const fmtDate = (d: string) => new Date(`${d}T00:00:00+07:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function ZoneCard({ z, setSize }: { z: ZoneSummary; setSize: number }) {
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
      {z.deck && (
        <p className="mt-3 text-xs text-muted-foreground tabular-nums">
          Today: {Math.min(z.deck.position, z.deck.total)} / {z.deck.total} cards · {Math.max(1, Math.ceil(z.deck.total / setSize))} sets of {setSize}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">{z.level ? `N${z.level} · ${z.remaining} not started` : 'All N5–N2 items started'}</p>
      {z.userPaused && (
        <p className="mt-2 text-xs text-yellow">
          New items paused in{' '}
          <Link href="/settings#pace" className="underline underline-offset-2">Settings</Link>. Intro and review cards continue.
        </p>
      )}
      {z.paused && (
        <p className="mt-2 text-xs text-yellow">New items paused: catching up. Today&apos;s intro and review cards already reach this area&apos;s daily limit.</p>
      )}
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
              {total} cards today across all three areas, shuffled together.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hub.newPerDay.kana} Kana words · {hub.newPerDay.kanji} Kanji · {hub.newPerDay.word_kanji} Kanji words a day · about {hub.pace.minutes} min a day ·{' '}
              {hub.pace.total === null
                ? 'an area is set to 0, so its level will not finish yet'
                : `current levels finish in about ${hub.pace.total} days`}{' '}
              · <Link href="/settings#pace" className="underline underline-offset-2 hover:text-foreground">Change</Link>
            </p>
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
            <ZoneCard key={z.zone} z={z} setSize={hub.setSize} />
          ))}
        </div>

        {/* Phần thêm, học tùy chọn: không tính vào cân bằng, trần hay "Learn all" (chủ dự án chốt 2026-11-24) */}
        <section aria-labelledby="vocab-more">
          <h2 id="vocab-more" className="mb-3 text-sm font-semibold text-subtle">More</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/learn/radicals" className="flex flex-col rounded-3xl border border-border bg-card p-5 transition-colors hover:border-[#3b4250]">
              <span className="flex items-center justify-between">
                <span lang="ja" className="font-jp text-xs text-muted-foreground">部首</span>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="mt-1 font-semibold">Radicals</span>
              <span className="mt-1 text-sm text-subtle">The building blocks of Kanji. Optional, at your own pace.</span>
              <span className="mt-3 text-xs text-muted-foreground tabular-nums">
                {hub.radicals.learned} / {hub.radicals.total} learned{hub.radicals.learning > 0 ? ` · ${hub.radicals.learning} learning` : ''}
              </span>
            </Link>
          </div>
        </section>

        <p className="text-sm text-muted-foreground">
          Review cards are part of each area&apos;s daily cards.{' '}
          <Link href="/review/archive" className="underline underline-offset-2 hover:text-foreground">Archived cards</Link>: cards you marked as learned.
        </p>
      </div>
    </>
  )
}
