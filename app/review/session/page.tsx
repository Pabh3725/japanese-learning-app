import type { Metadata } from 'next'
import { ReviewSession } from '@/components/review/review-session'
import { reviewQueue } from '@/lib/mock-data'

export const metadata: Metadata = { title: 'Review · Nihongo' }

export default function ReviewSessionPage() {
  return <ReviewSession cards={reviewQueue} />
}
