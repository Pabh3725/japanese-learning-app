'use server'

// V12: Server Function mỏng, mọi logic ở lib/dal/v12/deck.ts.
import { answerDeck, getDeck } from '@/lib/dal/v12/deck'
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
