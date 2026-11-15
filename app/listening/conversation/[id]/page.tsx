import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ConversationPlayer } from '@/components/listening/conversation-player'
import { getConversationSession } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Conversation listening · Nihongo' }

export default async function ConversationSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getConversationSession(id)
  if (!session) redirect('/practice/conversations')
  return <ConversationPlayer session={session} />
}
