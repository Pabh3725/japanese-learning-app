'use server'

// JLPT: Server Function mỏng, mọi logic ở lib/dal/jlpt.ts.
import { answerJlpt, finishJlpt, retryWrongJlpt, startJlptSession } from '@/lib/dal/jlpt'

export async function startJlptSessionAction(input: unknown) {
  return startJlptSession(input)
}

export async function answerJlptAction(input: unknown) {
  return answerJlpt(input)
}

export async function finishJlptAction(id: unknown) {
  return finishJlpt(id)
}

export async function retryWrongJlptAction(id: unknown) {
  return retryWrongJlpt(id)
}
