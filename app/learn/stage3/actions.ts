'use server'

import { completeKanjiIntro, completeStage3, type CompleteStage3Response } from '@/lib/dal/stage3'

export async function completeStage3Action(learnerVocabularyId: string): Promise<CompleteStage3Response> {
  return completeStage3(learnerVocabularyId)
}

export async function completeKanjiIntroAction(learnerVocabularyId: string): Promise<CompleteStage3Response> {
  return completeKanjiIntro(learnerVocabularyId)
}
