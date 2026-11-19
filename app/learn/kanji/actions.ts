'use server'

import { setKanjiKnown } from '@/lib/dal/kanji'
import { setKanjiStarred } from '@/lib/dal/kanji-stars'

export async function setKanjiStarredAction(kanjiId: unknown, starred: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return setKanjiStarred(kanjiId, starred)
}

export async function setKanjiKnownAction(kanjiId: unknown, known: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return setKanjiKnown(kanjiId, known)
}
