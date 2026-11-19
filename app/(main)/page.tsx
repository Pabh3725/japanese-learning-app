import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { Greeting } from '@/components/dashboard/greeting'
import { StudyHeroCard } from '@/components/dashboard/study-hero-card'
import { requireUser } from '@/lib/dal/auth'
import { getGrammarOverview } from '@/lib/dal/grammar'
import { getHub } from '@/lib/dal/v12/deck'
import { cn } from '@/lib/utils'

const ZONE_TITLE = { kana: 'Kana vocabulary', kanji: 'Kanji', word_kanji: 'Kanji words' } as const

export default async function DashboardPage() {
  const [user, hub, grammar] = await Promise.all([requireUser(), getHub(), getGrammarOverview()])
  // Grammar: Learn (mẫu mới + mẫu đang học đến buổi) và Review (mẫu đến hạn ôn), như trang /grammar
  const grammarLearn = grammar.today.newLeft + grammar.today.learningDue
  const grammarReview = grammar.today.reviewDue
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
                {z.newItems} new · {z.stageQuestions} intro · {z.reviews} review
              </span>
            </Link>
          ))}
        </div>
        <section aria-labelledby="home-grammar" className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="home-grammar" className="flex items-center gap-2 text-sm font-medium text-subtle">
              <span lang="ja" className="font-jp text-xs text-muted-foreground">文法</span>
              Grammar
            </h2>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{grammarLearn + grammarReview > 0 ? plural(grammarLearn + grammarReview, 'pattern', 'patterns') : 'Done for today'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {grammar.today.newLeft} new · {grammar.today.learningDue} learning · {grammarReview} review
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/grammar/session?mode=learn" aria-disabled={grammarLearn === 0} className={cn(actionButton({ size: 'md' }), 'flex-1 sm:flex-none', grammarLearn === 0 && 'pointer-events-none opacity-50')}>
              Learn
            </Link>
            <Link href="/grammar/session?mode=review" aria-disabled={grammarReview === 0} className={cn(actionButton({ size: 'md', variant: 'secondary' }), 'flex-1 sm:flex-none', grammarReview === 0 && 'pointer-events-none opacity-50')}>
              Review
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
