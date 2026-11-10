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
  const learnWork = learn.questionsToday + learn.newToday
  const kanjiWork = kanji.questionsToday + kanji.newToday
  const wordKanjiWork = wordKanji.questionsToday + wordKanji.waiting
  const reviewMinutes = Math.max(1, Math.ceil((review.dueNow * 15) / 60))

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={user.username ?? 'there'} />

      <div className="grid gap-4 md:grid-cols-2">
        <StudyHeroCard
          eyebrow="Vocabulary"
          title={learnWork > 0 ? `${learn.sessions} ${learn.sessions === 1 ? 'session' : 'sessions'} today` : 'All caught up'}
          subtitle={learnWork > 0 ? `${learn.questionsToday} questions due · ${learn.newToday} new words` : 'Your next questions are scheduled. Come back later.'}
          href={learnWork > 0 ? '/learn/session' : undefined}
          cta="Start learning"
        />
        <StudyHeroCard
          eyebrow="Review"
          title={review.dueNow > 0 ? `${review.dueNow} ${review.dueNow === 1 ? 'card' : 'cards'} waiting` : 'No cards due'}
          subtitle={review.dueNow > 0 ? `About ${reviewMinutes} ${reviewMinutes === 1 ? 'minute' : 'minutes'}` : `${review.dueTomorrow} due tomorrow`}
          href={review.dueNow > 0 ? '/review/session' : undefined}
          cta="Start review"
        />
        <StudyHeroCard
          eyebrow="Kanji words"
          title={wordKanji.questionsToday > 0 ? `${wordKanji.questionsToday} ${wordKanji.questionsToday === 1 ? 'question' : 'questions'}` : wordKanji.waiting > 0 ? `${wordKanji.waiting} new ${wordKanji.waiting === 1 ? 'word' : 'words'}` : 'All caught up'}
          subtitle={`${wordKanji.completed} of ${wordKanji.total} learned · ${wordKanji.waitingForLevel} waiting for the next level`}
          href={wordKanjiWork > 0 ? '/learn/session?skill=word_kanji' : '/learn/word-kanji'}
          cta={wordKanjiWork > 0 ? 'Start Kanji words' : 'Open Kanji words'}
        />
        <StudyHeroCard
          eyebrow="Kanji"
          title={kanji.questionsToday > 0 ? `${kanji.questionsToday} ${kanji.questionsToday === 1 ? 'question' : 'questions'}` : kanji.newToday > 0 ? `${kanji.newToday} new Kanji` : 'All caught up'}
          subtitle={`${kanji.questionsToday > 0 && kanji.newToday > 0 ? `${kanji.newToday} new · ` : ''}${kanji.longTerm} of ${kanji.total} learned · ${kanji.learning} still learning`}
          href={kanjiWork > 0 ? '/learn/kanji/session' : '/learn/kanji'}
          cta={kanjiWork > 0 ? 'Start Kanji' : 'Open Kanji'}
        />
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
