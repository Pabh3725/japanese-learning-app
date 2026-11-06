import type { Metadata } from 'next'
import { LearnSession } from '@/components/learning/learn-session'
import { getLearnSession } from '@/lib/dal/stage-session'

export const metadata: Metadata = { title: 'Learn · Nihongo' }

export default async function LearnSessionPage({ searchParams }: { searchParams: Promise<{ n?: string; practice?: string }> }) {
  const { n, practice } = await searchParams
  const parsed = Number(n)
  const sessionNumber = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
  const data = await getLearnSession(practice === '1')
  // clientEventId mới cho mỗi phiên, nên key đổi và phiên chạy lại từ câu đầu.
  const first = data.intros[0]
  const key = data.questions[0]?.clientEventId ?? (first ? (first.kind === 'new' ? first.word.id : first.learnerVocabularyId) : 'empty')
  return <LearnSession key={key} data={data} sessionNumber={sessionNumber} />
}
