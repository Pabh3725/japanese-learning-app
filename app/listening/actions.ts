'use server'

// Luyện nghe: Server Function mỏng, mọi logic ở lib/dal/listening.ts.
import { answerListening, finishListening, retryWrongListening, startLessonListening, startMistakesListening, startMockListening, startNumbersListening } from '@/lib/dal/listening'

export async function startLessonListeningAction(input: unknown) {
  return startLessonListening(input)
}

export async function startMockListeningAction(input: unknown) {
  return startMockListening(input)
}

export async function answerListeningAction(input: unknown) {
  return answerListening(input)
}

export async function finishListeningAction(id: unknown) {
  return finishListening(id)
}

export async function retryWrongListeningAction(id: unknown) {
  return retryWrongListening(id)
}

export async function startNumbersListeningAction(input: unknown) {
  return startNumbersListening(input)
}

export async function startMistakesListeningAction(input: unknown) {
  return startMistakesListening(input)
}
