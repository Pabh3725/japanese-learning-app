import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { RadicalsKnownButton } from '@/components/v12/radicals-known-button'
import { RadicalsPace } from '@/components/v12/radicals-pace'
import { getRadicals } from '@/lib/dal/v12/deck'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Radicals · Nihongo' }

const STATUS = {
  new: { label: 'New', tone: 'text-muted-foreground' },
  learning: { label: 'Learning', tone: 'text-cyan' },
  learned: { label: 'Learned', tone: 'text-success' },
  known: { label: 'Known', tone: 'text-success' },
} as const

// Bộ thủ học riêng ở phần More của Vocab (chủ dự án chốt 2026-11-24): tùy chọn, không tính vào cân bằng hay trần,
// chữ Kanji không phải chờ bộ thủ. Học như một khu: thẻ giới thiệu → Intro 1 → Intro 2, không có Card ôn.
export default async function RadicalsPage() {
  const r = await getRadicals()
  const todo = r.today.newItems + r.today.stageQuestions
  const done = r.today.deck !== null && r.today.deck.total > 0 && r.today.deck.position >= r.today.deck.total
  return (
    <>
      <Link href="/learn" className="mb-4 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Vocab
      </Link>
      <PageHeader eyebrow="部首" title="Radicals" description="The building blocks of Kanji. Optional: learn them at your own pace — Kanji does not wait for them." />

      <div className="flex max-w-4xl flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-3xl border border-primary/40 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold tabular-nums">
                {r.summary.learned} / {r.summary.total} learned{r.summary.learning > 0 ? ` · ${r.summary.learning} learning` : ''}
              </p>
              <p className="text-sm text-subtle tabular-nums">
                {done ? 'Done for today.' : todo > 0 ? `Today: ${r.today.newItems} new · ${r.today.stageQuestions} intro questions` : 'Nothing to learn today.'}
                {r.today.deck && !done ? ` · ${Math.min(r.today.deck.position, r.today.deck.total)} / ${r.today.deck.total} cards` : ''}
              </p>
            </div>
            {!done && (todo > 0 || r.today.deck) && (
              <Link href="/learn/v12/radical" className={actionButton({ size: 'lg' })}>
                <Play className="fill-current" aria-hidden="true" />
                {r.today.deck && r.today.deck.position > 0 ? 'Continue' : 'Learn radicals'}
              </Link>
            )}
          </div>
          <RadicalsPace initial={r.newPerDay} />
          <RadicalsKnownButton total={r.summary.total} known={r.summary.known} />
        </section>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {r.list.map((x) => (
            <li key={x.number} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <span lang="ja" className="font-jp text-3xl">{x.char}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-yellow">{x.name}</span>
                <span className="block truncate text-xs text-subtle">{x.meaning}</span>
                <span className={cn('block text-xs', STATUS[x.status].tone)}>
                  {STATUS[x.status].label}
                  {x.stage ? ` · Intro ${x.stage}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
