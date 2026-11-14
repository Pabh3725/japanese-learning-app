import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { JlptHome } from '@/components/jlpt/jlpt-home'
import { getJlptStats } from '@/lib/dal/jlpt'
import { isJlptLevel } from '@/lib/jlpt/catalog'

export const metadata: Metadata = { title: 'JLPT · Nihongo' }

export default async function JlptPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams
  const stats = await getJlptStats()
  return (
    <>
      <PageHeader eyebrow="試験" title="JLPT practice" description="Practice by question type, the way the N5 and N4 tests ask. It doesn't change your Learn or Review schedule." />
      <JlptHome stats={stats} initialLevel={isJlptLevel(level) ? level : 'N5'} />
    </>
  )
}
