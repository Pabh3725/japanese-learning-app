'use server'

import { saveGrammarBalance, saveGrammarFurigana, saveStudyLimit } from '@/lib/dal/settings'

export async function saveStudyLimitAction(key: unknown, value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveStudyLimit(key, value)
}

export async function saveGrammarFuriganaAction(value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveGrammarFurigana(value)
}

export async function saveGrammarBalanceAction(key: unknown, value: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return saveGrammarBalance(key, value)
}
