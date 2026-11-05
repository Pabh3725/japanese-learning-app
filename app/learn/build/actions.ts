'use server'

// Server Function cho bài ghép kana (VOC-03). Xác thực, kiểm tra dữ liệu và chấm điểm nằm trong DAL.
import { submitKanaAssembly, type SubmitKanaAssemblyResponse } from '@/lib/dal/kana-assembly'

export async function submitKanaAssemblyAction(input: unknown): Promise<SubmitKanaAssemblyResponse> {
  return submitKanaAssembly(input)
}
