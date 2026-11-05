import type { Metadata } from 'next'
import { Stage2Session } from '@/components/learning/stage2-session'
import { getStage2Session } from '@/lib/dal/stage2'

export const metadata: Metadata = { title: 'Stage 2 · Nihongo' }

// Trang đọc cookie đăng nhập (requireUser) nên luôn render mới mỗi lần mở → đề xáo lại.
export default async function Stage2Page() {
  const { questions, wordCount } = await getStage2Session()
  return <Stage2Session questions={questions} wordCount={wordCount} />
}
