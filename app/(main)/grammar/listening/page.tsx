import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { PointListening } from '@/components/listening/point-listening'
import { getPointListeningOverview } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Grammar listening · Nihongo' }

/** Grammar · nghe theo từng mẫu: 30 câu, 3 chặng (docs/listening-rules.md §V2.2b). */
export default async function GrammarListeningPage() {
  const overview = await getPointListeningOverview()
  return (
    <>
      <PageHeader eyebrow="文法 · 聴解" title="Listening" description="Listen to sentences of each grammar pattern, from basic to harder ones that mix patterns you know." />
      <PointListening overview={overview} />
    </>
  )
}
