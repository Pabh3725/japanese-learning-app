import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { LessonListening, type ModeOption } from '@/components/listening/lesson-listening'
import { getListeningOverview } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Dictation · Nihongo' }

/** Practice · Dictation (docs/listening-rules.md §V2.3). Theo đoạn cần hội thoại soạn mới (đợt B). */
const MODES: ModeOption[] = [
  { id: 'dictation', name: 'Sentence by sentence', description: 'Short sentences of the lesson, one at a time.' },
  { id: 'dictation', name: 'Conversation', description: 'Every line of a conversation, in order.', soon: true },
]

export default async function DictationPage() {
  const overview = await getListeningOverview('dictation')
  return (
    <>
      <PageHeader eyebrow="書き取り" title="Dictation" description="Listen, then type what you hear in romaji. It turns into kana as you type." />
      <LessonListening overview={overview} modes={MODES} />
    </>
  )
}
