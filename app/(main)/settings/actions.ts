'use server'

import { saveGrammarFurigana, saveNewPerDay, saveReviewAllAtOnce, saveStudyLimit } from '@/lib/dal/settings'

export async function saveNewPerDayAction(value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveNewPerDay(value)
}

export async function saveStudyLimitAction(key: unknown, value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveStudyLimit(key, value)
}

export async function saveReviewAllAtOnceAction(value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveReviewAllAtOnce(value)
}

export async function saveGrammarFuriganaAction(value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveGrammarFurigana(value)
}
