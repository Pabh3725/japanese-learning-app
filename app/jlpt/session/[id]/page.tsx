import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { JlptPlayer } from '@/components/jlpt/jlpt-player'
import { getJlptSession } from '@/lib/dal/jlpt'

export const metadata: Metadata = { title: 'JLPT practice · Nihongo' }

export default async function JlptSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getJlptSession(id)
  if (!session) redirect('/jlpt')
  return <JlptPlayer session={session} />
}
