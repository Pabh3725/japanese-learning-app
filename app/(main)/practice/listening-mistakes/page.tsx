import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { MistakesStart } from '@/components/listening/mistakes-start'
import { getMistakeCount } from '@/lib/dal/listening'

export const metadata: Metadata = { title: 'Listening mistakes · Nihongo' }

export default async function ListeningMistakesPage() {
  const open = await getMistakeCount()
  return (
    <>
      <PageHeader eyebrow="聞き直し" title="Listening mistakes" description="Listen again to what you got wrong." />
      <MistakesStart open={open} />
    </>
  )
}
