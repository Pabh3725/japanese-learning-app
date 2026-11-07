'use server'

import { openWordKanji, type OpenWordKanjiResponse } from '@/lib/dal/word-kanji'

export async function openWordKanjiAction(learnerVocabularyId: string): Promise<OpenWordKanjiResponse> {
  return openWordKanji(learnerVocabularyId)
}
