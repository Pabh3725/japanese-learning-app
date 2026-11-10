import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LearnMoreButton } from '@/components/learning/learn-more-button'
import { SessionComplete } from '@/components/learning/session-complete'
import { getKanjiOverview } from '@/lib/dal/kanji'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getDaySummary, type SkillSummary } from '@/lib/dal/progress'
import { getReviewOverview } from '@/lib/dal/review'
import { getWordKanjiOverview } from '@/lib/dal/word-kanji'

export const metadata: Metadata = { title: "Today's summary · Nihongo" }

const percent = (s: SkillSummary) => (s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0)

function SkillRow({ label, skill, doneLabel }: { label: string; skill: SkillSummary; doneLabel: string }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-3 text-left text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground tabular-nums">
        {skill.answered === 0 ? 'Nothing today' : `${skill.answered} questions · ${percent(skill)}% · ${skill.completed} ${doneLabel}`}
      </span>
    </li>
  )
}

export default async function LearnSummaryPage() {
  const [summary, learn, wordKanji, kanji, review] = await Promise.all([getDaySummary(), getLearnOverview(), getWordKanjiOverview(), getKanjiOverview(), getReviewOverview()])
  if (summary.answered === 0) redirect('/learn')

  const correct = summary.vocabulary.correct + summary.wordKanji.correct + summary.kanji.correct
  const points = summary.vocabulary.points + summary.wordKanji.points
  const vocabularyWork = learn.questionsToday + learn.newToday > 0
  const primary = vocabularyWork
    ? { href: '/learn/session', label: 'Keep learning' }
    : wordKanji.questionsToday + wordKanji.waiting > 0
      ? { href: '/learn/word-kanji', label: 'Go to Kanji words' }
      : kanji.questionsToday + kanji.newToday > 0
        ? { href: '/learn/kanji', label: 'Go to Kanji' }
        : review.dueNow > 0
          ? { href: '/review', label: 'Go to Review' }
          : { href: '/', label: 'Back to Home' }

  return (
    <SessionComplete
      title="Today's summary"
      subtitle="Everything you answered in Learn today."
      stats={[
        { label: 'Questions', value: String(summary.answered), tone: 'text-cyan' },
        { label: 'Accuracy', value: `${Math.round((correct / summary.answered) * 100)}%`, tone: 'text-success' },
        { label: 'Stage points', value: points > 0 ? `+${points}` : String(points), tone: 'text-yellow' },
      ]}
      primary={primary}
      secondary={{ href: '/learn', label: 'Back to Learn' }}
    >
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card px-4">
        <SkillRow label="Vocabulary" skill={summary.vocabulary} doneLabel="stages done" />
        <SkillRow label="Kanji words" skill={summary.wordKanji} doneLabel="stages done" />
        <SkillRow label="Kanji" skill={summary.kanji} doneLabel="learned" />
      </ul>
      {!vocabularyWork && learn.canBorrow > 0 && <LearnMoreButton count={learn.canBorrow} />}
    </SessionComplete>
  )
}
