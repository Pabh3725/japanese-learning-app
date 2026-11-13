import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CounterSessionPlayer } from '@/components/counters/counter-session'
import { requireUser } from '@/lib/dal/auth'
import { buildCounterSession, parseExercises, parseGroups } from '@/lib/counters/questions'

export const metadata: Metadata = { title: 'Counters · Nihongo' }

const COUNTS = [10, 20, 30]

export default async function CounterSessionPage({ searchParams }: { searchParams: Promise<{ groups?: string; types?: string; count?: string }> }) {
  await requireUser()
  const { groups, types, count } = await searchParams
  const questions = buildCounterSession({
    groups: parseGroups(groups?.split(',') ?? []),
    exercises: parseExercises(types?.split(',') ?? []),
    count: COUNTS.includes(Number(count)) ? Number(count) : 20,
  })
  if (questions.length === 0) redirect('/counters')
  return <CounterSessionPlayer questions={questions} />
}
