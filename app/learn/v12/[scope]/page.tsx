import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { V12Player } from '@/components/v12/v12-player'
import { getDeck } from '@/lib/dal/v12/deck'
import { getV12Settings } from '@/lib/dal/v12/settings'

export const metadata: Metadata = { title: 'Learn · Nihongo' }

export default async function V12DeckPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope } = await params
  if (!(await getV12Settings()).enabled) redirect('/learn')
  const deck = await getDeck(scope)
  if (!deck) redirect('/learn')
  return <V12Player initial={deck} />
}
