'use server'

import { archiveCard, restoreCard, type ArchiveResponse } from '@/lib/dal/archive'
import { submitReviewAnswer, type SubmitReviewAnswerResponse } from '@/lib/dal/review'

export async function submitReviewAnswerAction(input: unknown): Promise<SubmitReviewAnswerResponse> {
  return submitReviewAnswer(input)
}

export async function archiveCardAction(kind: unknown, cardId: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  return archiveCard(kind, cardId, clientEventId)
}

export async function restoreCardAction(kind: unknown, cardId: unknown, mode: unknown, clientEventId: unknown): Promise<ArchiveResponse> {
  return restoreCard(kind, cardId, mode, clientEventId)
}
