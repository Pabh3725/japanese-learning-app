'use server'

import { checkKanjiAnswer, openKanji, setKanjiKnown, submitKanjiAnswer, type SubmitKanjiResponse } from '@/lib/dal/kanji'
import { setKanjiStarred } from '@/lib/dal/kanji-stars'

export async function setKanjiStarredAction(kanjiId: unknown, starred: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return setKanjiStarred(kanjiId, starred)
}

export async function openKanjiAction(kanjiId: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return openKanji(kanjiId)
}

export async function setKanjiKnownAction(kanjiId: unknown, known: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  return setKanjiKnown(kanjiId, known)
}

export async function submitKanjiAnswerAction(input: unknown): Promise<SubmitKanjiResponse> {
  return submitKanjiAnswer(input)
}

export async function checkKanjiAnswerAction(input: unknown): Promise<SubmitKanjiResponse> {
  return checkKanjiAnswer(input)
}
