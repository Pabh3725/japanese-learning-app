import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LearnPractice } from '@/components/learning/learn-practice'
import { StarredWordsProvider } from '@/components/learning/star-button'
import { getStarredSession } from '@/lib/dal/stage-session'

export const metadata: Metadata = { title: 'Starred words · Nihongo' }

export default async function StarredSessionPage() {
  const { questions, starredIds } = await getStarredSession()
  if (questions.length === 0) redirect('/learn/starred')
  return (
    <StarredWordsProvider ids={starredIds}>
      <LearnPractice key={questions[0].clientEventId} questions={questions} sessionNumber={1} sessionsLeft={1} finish={{ href: '/learn/starred', label: 'Back to Starred words' }} />
    </StarredWordsProvider>
  )
}
