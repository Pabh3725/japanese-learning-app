import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { VerbSessionPlayer } from '@/components/verbs/verb-session'
import { buildVerbSession } from '@/lib/dal/verbs'

export const metadata: Metadata = { title: 'Verb forms · Nihongo' }

export default async function VerbSessionPage({ searchParams }: { searchParams: Promise<{ forms?: string; types?: string; count?: string }> }) {
  const { forms, types, count } = await searchParams
  const session = await buildVerbSession({ forms: forms?.split(',') ?? [], exercises: types?.split(',') ?? [], count: Number(count) })
  if ('status' in session) redirect('/grammar/verbs')
  return <VerbSessionPlayer session={session} />
}
