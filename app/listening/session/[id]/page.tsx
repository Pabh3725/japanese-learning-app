import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ListeningPlayer } from '@/components/listening/listening-player'
import { getListeningSession } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Listening · Nihongo' }

export default async function ListeningSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getListeningSession(id)
  if (!session) redirect('/listening')
  return <ListeningPlayer session={session} />
}
