'use server'

// V12: Server Function mỏng, mọi logic ở lib/dal/v12/deck.ts.
import { revalidatePath } from 'next/cache'
import { answerDeck, getDeck, learnItem, markRadicalsKnown, starItem } from '@/lib/dal/v12/deck'
import { saveV12Setting } from '@/lib/dal/v12/settings'

export async function getDeckAction(scope: unknown) {
  return getDeck(scope)
}

export async function answerDeckAction(input: unknown) {
  return answerDeck(input)
}

export async function saveV12SettingAction(key: unknown, value: unknown) {
  return saveV12Setting(key, value)
}

export async function markRadicalsKnownAction(known: unknown) {
  const res = await markRadicalsKnown(known)
  revalidatePath('/learn')
  return res
}

export async function starItemAction(itemId: unknown, starred: unknown) {
  return starItem(itemId, starred)
}

export async function learnItemAction(itemId: unknown, review: unknown) {
  return learnItem(itemId, review)
}
