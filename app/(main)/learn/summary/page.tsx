import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LearnMoreButton } from '@/components/learning/learn-more-button'
import { SessionComplete } from '@/components/learning/session-complete'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getDaySummary } from '@/lib/dal/progress'
import { getReviewOverview } from '@/lib/dal/review'

export const metadata: Metadata = { title: "Today's summary · Nihongo" }

export default async function LearnSummaryPage() {
  const [summary, learn, review] = await Promise.all([getDaySummary(), getLearnOverview(), getReviewOverview()])
  if (summary.answered === 0) redirect('/learn')

  const hasWork = learn.questionsToday + learn.newToday + learn.stage3Waiting > 0
  const accuracy = Math.round((summary.correct / summary.answered) * 100)
  const stages = `${summary.stagesCompleted} ${summary.stagesCompleted === 1 ? 'stage' : 'stages'} completed today.`
  const primary = hasWork
    ? { href: '/learn/session', label: 'Keep learning' }
    : review.dueNow > 0
      ? { href: '/review', label: 'Go to Review' }
      : { href: '/', label: 'Back to Home' }

  return (
    <SessionComplete
      title="Today's summary"
      subtitle={stages}
      stats={[
        { label: 'Questions', value: String(summary.answered), tone: 'text-cyan' },
        { label: 'Accuracy', value: `${accuracy}%`, tone: 'text-success' },
        { label: 'Points', value: summary.points > 0 ? `+${summary.points}` : String(summary.points), tone: 'text-yellow' },
      ]}
      primary={primary}
      secondary={{ href: '/learn', label: 'Back to Learn' }}
    >
      {!hasWork && learn.canBorrow > 0 && <LearnMoreButton count={learn.canBorrow} />}
    </SessionComplete>
  )
}
