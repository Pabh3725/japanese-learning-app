'use server'

// Server Function cho các câu Stage 2, 4, 5. Mỏng: mọi logic nằm ở lib/dal/stage-session.ts.
import {
  checkStageAnswer,
  submitMatchPenalties,
  submitStageAnswer,
  type CheckStageAnswerResponse,
  type SubmitStageAnswerResponse,
} from '@/lib/dal/stage-session'

export async function submitStageAnswerAction(input: unknown): Promise<SubmitStageAnswerResponse> {
  return submitStageAnswer(input)
}

export async function checkStageAnswerAction(input: unknown): Promise<CheckStageAnswerResponse> {
  return checkStageAnswer(input)
}

export async function submitMatchPenaltiesAction(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return submitMatchPenalties(input)
}
