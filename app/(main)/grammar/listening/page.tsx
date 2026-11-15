import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { LessonListening, type ModeOption } from '@/components/listening/lesson-listening'
import { getListeningOverview } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Grammar listening · Nihongo' }

/** Grammar · nghe theo câu của từng bài (docs/listening-rules.md §V2.2). */
const MODES: ModeOption[] = [
  { id: 'mix', name: 'Mix', description: 'All three kinds together.' },
  { id: 'heard_sentence', name: 'Which sentence did you hear?', description: 'Four sentences that differ in one spot.' },
  { id: 'sentence_meaning', name: 'Sentence → meaning', description: 'Hear a sentence, choose what it means.' },
  { id: 'reply', name: 'Question → reply', description: 'Hear a question, choose the best reply.' },
]

export default async function GrammarListeningPage() {
  const overview = await getListeningOverview('grammar')
  return (
    <>
      <PageHeader eyebrow="文法 · 聴解" title="Listening" description="Listen to the sentences of each Minna lesson." />
      <LessonListening overview={overview} modes={MODES} />
    </>
  )
}
