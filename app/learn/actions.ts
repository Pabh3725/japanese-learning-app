'use server'

// Server Function cho các câu Stage 2, 4, 5. Mỏng: mọi logic nằm ở lib/dal/stage-session.ts.
import { markWordsKnown, unmarkWordsKnown } from '@/lib/dal/known-words'
import {
  borrowNewWords,
  checkStageAnswer,
  submitMatchPenalties,
  submitStageAnswer,
  type CheckStageAnswerResponse,
  type SubmitStageAnswerResponse,
} from '@/lib/dal/stage-session'

export async function markWordsKnownAction(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return markWordsKnown(input)
}

export async function unmarkWordsKnownAction(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return unmarkWordsKnown(input)
}

export async function borrowNewWordsAction(requested: unknown): Promise<{ status: 'saved' | 'blocked' | 'invalid' }> {
  return borrowNewWords(requested)
}

export async function submitStageAnswerAction(input: unknown): Promise<SubmitStageAnswerResponse> {
  return submitStageAnswer(input)
}

export async function checkStageAnswerAction(input: unknown): Promise<CheckStageAnswerResponse> {
  return checkStageAnswer(input)
}

export async function submitMatchPenaltiesAction(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return submitMatchPenalties(input)
}
