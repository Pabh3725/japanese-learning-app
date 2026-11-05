'use server'

// Server Function cho trang /learn/stage2 (VOC-02). Mỏng: mọi logic nằm ở lib/dal/stage2.ts.
import { answerStage2, type Stage2AnswerResponse } from '@/lib/dal/stage2'

export async function submitStage2Answer(input: unknown): Promise<Stage2AnswerResponse> {
  return answerStage2(input)
}
