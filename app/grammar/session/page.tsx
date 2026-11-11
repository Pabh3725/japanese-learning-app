import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { GrammarSessionPlayer } from '@/components/grammar/grammar-session'
import { buildLearnSession, buildPracticeSession, buildReviewSession } from '@/lib/dal/grammar'

export const metadata: Metadata = { title: 'Grammar · Nihongo' }

export default async function GrammarSessionPage({ searchParams }: { searchParams: Promise<{ mode?: string; points?: string; count?: string; ex?: string }> }) {
  const { mode, points, count, ex } = await searchParams
  if (mode === 'review') return <GrammarSessionPlayer session={await buildReviewSession()} />
  if (mode === 'practice') {
    const session = await buildPracticeSession({ points: points?.split(',') ?? [], count: Number(count), exercises: ex?.split(',') ?? [] })
    if ('status' in session) redirect('/grammar/practice')
    return <GrammarSessionPlayer session={session} />
  }
  return <GrammarSessionPlayer session={await buildLearnSession()} />
}
