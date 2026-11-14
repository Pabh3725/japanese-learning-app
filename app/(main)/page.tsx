import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Greeting } from '@/components/dashboard/greeting'
import { StudyHeroCard } from '@/components/dashboard/study-hero-card'
import { requireUser } from '@/lib/dal/auth'
import { getKanjiOverview } from '@/lib/dal/kanji'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getWordKanjiOverview } from '@/lib/dal/word-kanji'
import { getReviewOverview } from '@/lib/dal/review'

export default async function DashboardPage() {
  const [user, learn, review, kanji, wordKanji] = await Promise.all([requireUser(), getLearnOverview(), getReviewOverview(), getKanjiOverview(), getWordKanjiOverview()])
  // V9: Learn trộn cả ba nhóm bằng một nút, giống trang Learn
  const questions = learn.questionsToday + wordKanji.questionsToday + kanji.questionsToday
  const fresh = learn.newToday + wordKanji.waiting + kanji.newToday
  const reviewMinutes = Math.max(1, Math.ceil((review.dueNow * 15) / 60))
  // Chỉ một mục Review có Card thì vào thẳng phiên của mục đó
  const reviewHref = review.areas.kana.dueNow > 0 && review.areas.kanji.dueNow === 0 ? '/review/session?type=kana' : review.areas.kanji.dueNow > 0 && review.areas.kana.dueNow === 0 ? '/review/session?type=kanji' : '/review'
  // V10: mỗi khái niệm một tên — "practice" là câu Learn còn lại hôm nay, "cards" là Card Review đến hạn
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const sections = [
    {
      title: 'Vocabulary',
      href: '/learn',
      count: `${learn.questionsToday} practice · ${plural(review.areas.kana.dueNow, 'card', 'cards')}`,
      note: `${plural(learn.newToday, 'new word', 'new words')} left today · ${learn.inProgress} in progress`,
    },
    {
      title: 'Kanji words',
      href: '/learn/word-kanji',
      count: `${wordKanji.questionsToday} practice · ${plural(review.areas.kanji.dueNow, 'card', 'cards')}`,
      note: `${wordKanji.waiting} ready to start · ${wordKanji.completed} of ${wordKanji.total} learned`,
    },
    {
      title: 'Kanji',
      href: '/learn/kanji',
      count: `${kanji.questionsToday} practice`,
      note: `${kanji.learning} learning · ${kanji.newToday} new · ${kanji.longTerm} of ${kanji.total} learned`,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={user.username ?? 'there'} />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* V10: thứ tự trong ngày — ôn Card trước để giữ trí nhớ, rồi mới luyện và học từ mới */}
          <StudyHeroCard
            eyebrow="Step 1 · Review"
            title={review.dueNow > 0 ? `${plural(review.dueNow, 'card', 'cards')} to review` : 'Review done for today'}
            subtitle={
              review.dueNow > 0
                ? `Do these first. Vocabulary ${review.areas.kana.dueNow} · Kanji words ${review.areas.kanji.dueNow} · about ${plural(reviewMinutes, 'minute', 'minutes')}`
                : `${plural(review.dueTomorrow, 'card', 'cards')} tomorrow.`
            }
            href={review.dueNow > 0 ? reviewHref : undefined}
            cta="Start review"
          />
          <StudyHeroCard
            eyebrow="Step 2 · Learn"
            title={questions + fresh > 0 ? `${plural(questions, 'practice question', 'practice questions')} · ${fresh} new` : 'Learn done for today'}
            subtitle={
              questions + fresh > 0
                ? 'Practice the words you are learning, then meet new ones. The number goes down as you go.'
                : 'Everything for today is done. New questions come up tomorrow.'
            }
            href={questions + fresh > 0 ? '/learn/lesson' : undefined}
            cta="Learn"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((sec) => (
            <Link key={sec.title} href={sec.href} className="rounded-3xl border border-border bg-card p-5 transition-colors hover:border-[#3b4250]">
              <span className="flex items-center justify-between text-sm font-medium text-subtle">
                {sec.title}
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="mt-2 block text-2xl font-semibold tabular-nums">{sec.count}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{sec.note}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
