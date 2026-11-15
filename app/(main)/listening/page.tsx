import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { ListeningHome } from '@/components/listening/listening-home'
import { getJlptStats } from '@/lib/dal/jlpt'
import { getListeningOverview } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Listening · Nihongo' }

export default async function ListeningPage() {
  const [overview, jlpt] = await Promise.all([getListeningOverview(), getJlptStats()])
  return (
    <>
      <PageHeader eyebrow="聴解" title="Listening" description="Practice listening by Minna lesson, or the JLPT listening section. It doesn't change your Learn or Review schedule." />
      <ListeningHome overview={overview} jlpt={jlpt} />
    </>
  )
}
