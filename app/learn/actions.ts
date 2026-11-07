'use server'

// Server Function cho các câu Stage 2, 4, 5. Mỏng: mọi logic nằm ở lib/dal/stage-session.ts.
import { markWordsKnown, unmarkWordsKnown } from '@/lib/dal/known-words'
import { raiseSkillLevel } from '@/lib/dal/skill-levels'
import { relearnCard, relearnStage, restartStarRound, setWordStarred, type RelearnResponse } from '@/lib/dal/star-relearn'
import {
  borrowNewWords,
  submitStarAnswer,
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

export async function submitStarAnswerAction(input: unknown): Promise<SubmitStageAnswerResponse> {
  return submitStarAnswer(input)
}

export async function restartStarRoundAction(): Promise<{ status: 'saved' }> {
  return restartStarRound()
}

export async function raiseSkillLevelAction(skill: unknown, level: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return raiseSkillLevel(skill, level)
}

export async function setWordStarredAction(vocabularyId: unknown, starred: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return setWordStarred(vocabularyId, starred)
}

export async function relearnCardAction(cardId: unknown): Promise<RelearnResponse> {
  return relearnCard(cardId)
}

export async function relearnStageAction(scheduleId: unknown): Promise<RelearnResponse> {
  return relearnStage(scheduleId)
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
