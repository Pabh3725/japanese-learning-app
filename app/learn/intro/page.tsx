import type { Metadata } from 'next'
import { IntroSession } from '@/components/learning/intro-session'
import { getIntroWords } from '@/lib/dal/intro'

export const metadata: Metadata = { title: 'New words · Nihongo' }

export default async function LearnIntroPage() {
  const words = await getIntroWords()
  // Đổi key khi có lượt từ mới để phiên chạy lại từ thẻ đầu.
  return <IntroSession key={words[0]?.id ?? 'empty'} words={words} />
}
