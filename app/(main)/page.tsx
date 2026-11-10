import Link from 'next/link'
import { ArrowRight, BookText, Layers, Languages } from 'lucide-react'
import { DashboardStatCard } from '@/components/dashboard/dashboard-stat-card'
import { Greeting } from '@/components/dashboard/greeting'
import { QuickTraining } from '@/components/dashboard/quick-training'
import { StudyHeroCard } from '@/components/dashboard/study-hero-card'
import { requireUser } from '@/lib/dal/auth'
import { getKanjiOverview } from '@/lib/dal/kanji'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getWordKanjiOverview } from '@/lib/dal/word-kanji'
import { getReviewOverview } from '@/lib/dal/review'

const EXPLORE = [
  { href: '/grammar', title: 'Grammar', body: 'Patterns by lesson, with exercises you choose.', sample: '文', badge: 'Preview' },
  { href: '/verbs', title: 'Verb forms', body: 'Practice て, た, ない, たい and more.', sample: '動', badge: 'Preview' },
  { href: '/practice', title: 'Practice', body: 'Short games with the words you have met.', sample: '遊', badge: 'Games' },
  { href: '/library', title: 'Word list', body: 'Browse every word by lesson and see your progress.', sample: '語', badge: 'Library' },
]

export default async function DashboardPage() {
  const [user, learn, review, kanji, wordKanji] = await Promise.all([requireUser(), getLearnOverview(), getReviewOverview(), getKanjiOverview(), getWordKanjiOverview()])
  const cards = Object.values(review.byType).reduce((sum, n) => sum + n, 0)
  // V9: Learn trộn cả ba nhóm bằng một nút, giống trang Learn
  const questions = learn.questionsToday + wordKanji.questionsToday + kanji.questionsToday
  const fresh = learn.newToday + wordKanji.waiting + kanji.newToday
  const reviewMinutes = Math.max(1, Math.ceil((review.dueNow * 15) / 60))
  // Chỉ một mục Review có Card thì vào thẳng phiên của mục đó
  const reviewHref = review.areas.kana.dueNow > 0 && review.areas.kanji.dueNow === 0 ? '/review/session?type=kana' : review.areas.kanji.dueNow > 0 && review.areas.kana.dueNow === 0 ? '/review/session?type=kanji' : '/review'
  const sections = [
    { title: 'Vocabulary', href: '/learn', due: learn.questionsToday, note: `${learn.newToday} new words · ${learn.inProgress} in progress` },
    { title: 'Kanji words', href: '/learn/word-kanji', due: wordKanji.questionsToday, note: `${wordKanji.waiting} ready · ${wordKanji.completed} of ${wordKanji.total} learned` },
    { title: 'Kanji', href: '/learn/kanji', due: kanji.questionsToday, note: `${kanji.newToday} new · ${kanji.longTerm} of ${kanji.total} learned` },
  ]

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={user.username ?? 'there'} />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StudyHeroCard
            eyebrow="Learn"
            title={questions + fresh > 0 ? `${questions} ${questions === 1 ? 'question' : 'questions'} · ${fresh} new` : 'All caught up'}
            subtitle={questions + fresh > 0 ? 'Vocabulary, Kanji words and Kanji, mixed into one session.' : 'Your next questions are scheduled. Come back later.'}
            href={questions + fresh > 0 ? '/learn/mixed' : undefined}
            cta="Learn"
          />
          <StudyHeroCard
            eyebrow="Review"
            title={review.dueNow > 0 ? `${review.dueNow} ${review.dueNow === 1 ? 'card' : 'cards'} waiting` : 'No cards due'}
            subtitle={review.dueNow > 0 ? `Vocabulary ${review.areas.kana.dueNow} · Kanji words ${review.areas.kanji.dueNow} · about ${reviewMinutes} ${reviewMinutes === 1 ? 'minute' : 'minutes'}` : `${review.dueTomorrow} due tomorrow`}
            href={review.dueNow > 0 ? reviewHref : undefined}
            cta="Start review"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((sec) => (
            <Link key={sec.title} href={sec.href} className="rounded-3xl border border-border bg-card p-5 transition-colors hover:border-[#3b4250]">
              <span className="flex items-center justify-between text-sm font-medium text-subtle">
                {sec.title}
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="mt-2 block text-2xl font-semibold tabular-nums">{sec.due} due</span>
              <span className="mt-1 block text-sm text-muted-foreground">{sec.note}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {learn.levels.map((level) => (
          <DashboardStatCard key={level.level} label={`${level.level} completed`} value={level.completed} total={level.total} icon={BookText} tone={level.level === 'N5' ? 'cyan' : 'primary'} jp={level.level === 'N5' ? '語' : '話'} />
        ))}
        <DashboardStatCard label="Words in progress" value={learn.inProgress} icon={Languages} tone="yellow" jp="習" />
        <DashboardStatCard label="Review cards" value={cards} icon={Layers} tone="pink" jp="札" />
      </div>

      <section aria-labelledby="explore-title" className="flex flex-col gap-4">
        <h2 id="explore-title" className="text-lg font-semibold">Explore</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {EXPLORE.map((item) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary font-jp text-xl" aria-hidden="true">{item.sample}</span>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">{item.badge}</span>
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-semibold">
                    {item.title}
                    {item.href && <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />}
                  </h3>
                  <p className="mt-1 text-pretty text-sm text-muted-foreground">{item.body}</p>
                </div>
              </>
            )
            const className = 'flex flex-col gap-4 rounded-3xl border border-border bg-card p-5'
            return item.href ? (
              <Link key={item.title} href={item.href} className={`${className} transition-colors hover:border-[#3b4250]`}>{content}</Link>
            ) : (
              <div key={item.title} className={`${className} opacity-70`}>{content}</div>
            )
          })}
        </div>
      </section>

      <QuickTraining />
    </div>
  )
}
