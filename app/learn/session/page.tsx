import type { Metadata } from 'next'
import { LearnSession } from '@/components/learning/learn-session'
import { StarredWordsProvider } from '@/components/learning/star-button'
import { getLearnSession } from '@/lib/dal/stage-session'

export const metadata: Metadata = { title: 'Learn · Nihongo' }

export default async function LearnSessionPage({ searchParams }: { searchParams: Promise<{ n?: string; practice?: string; skill?: string }> }) {
  const { n, practice, skill } = await searchParams
  const wordKanji = skill === 'word_kanji'
  const parsed = Number(n)
  const sessionNumber = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
  const data = await getLearnSession(practice === '1', wordKanji ? 'word_kanji' : 'vocabulary')
  // clientEventId mới cho mỗi phiên, nên key đổi và phiên chạy lại từ câu đầu.
  const first = data.intros[0]
  const key = data.questions[0]?.clientEventId ?? (first ? (first.kind === 'new' ? first.word.id : first.learnerVocabularyId) : 'empty')
  return (
    <StarredWordsProvider ids={data.starredIds}>
      <LearnSession key={key} data={data} sessionNumber={sessionNumber} wordKanji={wordKanji} />
    </StarredWordsProvider>
  )
}
