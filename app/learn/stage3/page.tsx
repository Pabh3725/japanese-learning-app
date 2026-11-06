import type { Metadata } from 'next'
import { Stage3Session } from '@/components/learning/stage3-session'
import { getStage3Items } from '@/lib/dal/stage3'

export const metadata: Metadata = { title: 'Stage 3 · Nihongo' }

export default async function Stage3Page() {
  const items = await getStage3Items()
  return <Stage3Session key={items[0]?.learnerVocabularyId ?? 'empty'} items={items} />
}
