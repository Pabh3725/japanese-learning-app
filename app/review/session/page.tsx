import type { Metadata } from 'next'
import { StarredWordsProvider } from '@/components/learning/star-button'
import { ReviewSession } from '@/components/review/review-session'
import { getReviewSession } from '@/lib/dal/review'

export const metadata: Metadata = { title: 'Review · Nihongo' }

export default async function ReviewSessionPage() {
  const { questions, capReached, cardsLeft, starredIds } = await getReviewSession()
  // clientEventId mới cho mỗi phiên, nên key đổi và phiên chạy lại từ câu đầu.
  return (
    <StarredWordsProvider ids={starredIds}>
      <ReviewSession key={questions[0]?.clientEventId ?? 'empty'} questions={questions} capReached={capReached} cardsLeft={cardsLeft} />
    </StarredWordsProvider>
  )
}
