import type { Metadata } from 'next'
import { StarredWordsProvider } from '@/components/learning/star-button'
import { ReviewSession } from '@/components/review/review-session'
import { getReviewSession, isReviewArea } from '@/lib/dal/review'

export const metadata: Metadata = { title: 'Review · Nihongo' }

// V9: Review tách 2 mục; ?type=kanji là Card Từ vựng Kanji, mặc định là Card Từ vựng Kana
export default async function ReviewSessionPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  const area = isReviewArea(type) ? type : 'kana'
  const { questions, capReached, cardsLeft, starredIds } = await getReviewSession(area)
  // clientEventId mới cho mỗi phiên, nên key đổi và phiên chạy lại từ câu đầu.
  return (
    <StarredWordsProvider ids={starredIds}>
      <ReviewSession key={questions[0]?.clientEventId ?? 'empty'} questions={questions} capReached={capReached} cardsLeft={cardsLeft} />
    </StarredWordsProvider>
  )
}
