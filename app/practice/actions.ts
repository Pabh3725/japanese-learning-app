'use server'

import { finishSpeedSession, submitSpeedPair, type SpeedPairResponse } from '@/lib/dal/speed-matching'

export async function submitSpeedPairAction(input: unknown): Promise<SpeedPairResponse> {
  return submitSpeedPair(input)
}

export async function finishSpeedSessionAction(sessionId: unknown, score: unknown): Promise<void> {
  await finishSpeedSession(sessionId, score)
}
