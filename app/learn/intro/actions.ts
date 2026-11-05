'use server'

// Server Function cho phiên giới thiệu từ mới (VOC-01). Xác thực và kiểm tra dữ liệu nằm trong DAL.
import { completeWordIntro, type CompleteIntroResponse } from '@/lib/dal/intro'

export async function completeIntroAction(vocabularyId: string): Promise<CompleteIntroResponse> {
  return completeWordIntro(vocabularyId)
}
