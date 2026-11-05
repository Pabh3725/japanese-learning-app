import type { Metadata } from 'next'
import { StageSession } from '@/components/learning/stage-session'
import { getStageSession } from '@/lib/dal/stage-session'

export const metadata: Metadata = { title: 'Stage 2 · Nihongo' }

// Trang đọc cookie đăng nhập (requireUser) nên luôn render mới mỗi lần mở → đề xáo lại.
export default async function Stage2Page() {
  const { questions, nextDueAt } = await getStageSession(2)
  // clientEventId mới cho mỗi lượt, nên key đổi và phiên chạy lại từ câu đầu.
  return <StageSession key={questions[0]?.clientEventId ?? 'empty'} stage={2} questions={questions} nextDueAt={nextDueAt} />
}
