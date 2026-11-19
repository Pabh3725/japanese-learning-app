'use server'

// Server Function của Library và nút sao / đã biết. Mỏng: logic nằm ở lib/dal.
import { markWordsKnown, unmarkWordsKnown } from '@/lib/dal/known-words'
import { markWordsLearned, undoWordsLearned } from '@/lib/dal/mark-learned'
import { setWordStarred } from '@/lib/dal/star-relearn'

export async function markWordsKnownAction(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return markWordsKnown(input)
}

export async function unmarkWordsKnownAction(input: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return unmarkWordsKnown(input)
}

export async function setWordStarredAction(vocabularyId: unknown, starred: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return setWordStarred(vocabularyId, starred)
}

export async function undoWordsLearnedAction(input: unknown): Promise<{ status: 'saved' | 'invalid'; undone?: number }> {
  return undoWordsLearned(input)
}

export async function markWordsLearnedAction(input: unknown): Promise<{ status: 'saved' | 'invalid'; marked?: number }> {
  return markWordsLearned(input)
}
