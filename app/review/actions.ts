'use server'

import { submitReviewAnswer, type SubmitReviewAnswerResponse } from '@/lib/dal/review'

export async function submitReviewAnswerAction(input: unknown): Promise<SubmitReviewAnswerResponse> {
  return submitReviewAnswer(input)
}
