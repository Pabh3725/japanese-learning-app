import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { ConversationList } from '@/components/listening/conversation-list'
import { getConversationOverview } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Conversation listening · Nihongo' }

/** Practice · Conversation listening (docs/listening-rules.md §V2.4). */
export default async function ConversationsPage() {
  const overview = await getConversationOverview()
  return (
    <>
      <PageHeader eyebrow="会話の聞き取り" title="Conversation listening" description="Listen to a conversation, then pick the word you hear in each blank. Afterwards, go through every line." />
      <ConversationList overview={overview} />
    </>
  )
}
