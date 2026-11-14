import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { GrammarTestPlayer } from '@/components/grammar/test-player'
import { getGrammarTest } from '@/lib/dal/grammar-test'

export const metadata: Metadata = { title: 'Grammar test · Nihongo' }

export default async function GrammarTestRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const test = await getGrammarTest(id)
  if (!test) redirect('/grammar/test')
  return <GrammarTestPlayer test={test} />
}
