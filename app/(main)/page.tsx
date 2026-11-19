import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Greeting } from '@/components/dashboard/greeting'
import { StudyHeroCard } from '@/components/dashboard/study-hero-card'
import { requireUser } from '@/lib/dal/auth'
import { getHub } from '@/lib/dal/v12/deck'

const ZONE_TITLE = { kana: 'Kana vocabulary', kanji: 'Kanji', word_kanji: 'Kanji words' } as const

export default async function DashboardPage() {
  const [user, hub] = await Promise.all([requireUser(), getHub()])
  // V12: Card đến hạn nằm trong bộ thẻ hằng ngày của từng khu, cùng mục mới và câu Stage
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const total = hub.zones.reduce((n, z) => n + z.newItems + z.stageQuestions + z.reviews, 0)
  const reviews = hub.zones.reduce((n, z) => n + z.reviews, 0)
  const fresh = hub.zones.reduce((n, z) => n + z.newItems, 0)
  const allDone = hub.all !== null && hub.all.total > 0 && hub.all.position >= hub.all.total

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={user.username ?? 'there'} />

      <div className="flex flex-col gap-4">
        <StudyHeroCard
          eyebrow={hub.level ? `Today · N${hub.level}` : 'Today'}
          title={total > 0 && !allDone ? `${plural(total, 'card', 'cards')} to study` : 'Done for today'}
          subtitle={
            total > 0 && !allDone
              ? `${plural(fresh, 'new item', 'new items')} · ${plural(reviews, 'review card', 'review cards')} · shuffled across all three areas.`
              : 'Everything for today is done. New cards come up tomorrow.'
          }
          href={total > 0 && !allDone ? '/learn/v12/all' : undefined}
          cta={hub.all && hub.all.position > 0 ? 'Continue' : 'Learn all'}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {hub.zones.map((z) => (
            <Link key={z.zone} href={`/learn/v12/${z.zone}`} className="rounded-3xl border border-border bg-card p-5 transition-colors hover:border-[#3b4250]">
              <span className="flex items-center justify-between text-sm font-medium text-subtle">
                {ZONE_TITLE[z.zone]}
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="mt-2 block text-2xl font-semibold tabular-nums">{plural(z.newItems + z.stageQuestions + z.reviews, 'card', 'cards')}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {z.newItems} new · {z.stageQuestions} stage · {z.reviews} review
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
