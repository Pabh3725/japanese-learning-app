import type { Metadata } from 'next'
import { Stage3Session } from '@/components/learning/stage3-session'
import { getStage3Words } from '@/lib/dal/stage3'

export const metadata: Metadata = { title: 'Stage 3 · Nihongo' }

export default async function Stage3Page() {
  const words = await getStage3Words()
  return <Stage3Session key={words[0]?.learnerVocabularyId ?? 'empty'} words={words} />
}
