import type { Metadata } from 'next'
import { BuildSession } from '@/components/learning/build-session'
import { getKanaAssemblyWords } from '@/lib/dal/kana-assembly'

export const metadata: Metadata = { title: 'Build the reading · Nihongo' }

export default async function LearnBuildPage() {
  const words = await getKanaAssemblyWords()
  // clientEventId mới cho mỗi lượt, nên key đổi và phiên chạy lại từ câu đầu kể cả khi cùng từ.
  return <BuildSession key={words[0]?.clientEventId ?? 'empty'} words={words} />
}
