'use server'

// V9 bài Learn: Server Function mỏng, mọi logic ở lib/dal/lesson.ts.
import { advanceLesson, answerMicro, skipLessonItem, type AdvanceResponse, type MicroResponse } from '@/lib/dal/lesson'

export async function advanceLessonAction(input: unknown): Promise<AdvanceResponse> {
  return advanceLesson(input)
}

export async function answerMicroAction(input: unknown): Promise<MicroResponse> {
  return answerMicro(input)
}

export async function skipLessonItemAction(input: unknown): Promise<AdvanceResponse> {
  return skipLessonItem(input)
}
