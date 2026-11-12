'use server'

// Thể động từ: Server Function mỏng, mọi logic ở lib/dal/verbs.ts.
import { submitVerbAnswer, type VerbAnswerResponse } from '@/lib/dal/verbs'

export async function submitVerbAnswerAction(input: unknown): Promise<VerbAnswerResponse> {
  return submitVerbAnswer(input)
}
