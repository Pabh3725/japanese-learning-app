import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { NumbersForm } from '@/components/listening/numbers-form'

export const metadata: Metadata = { title: 'Numbers listening · Nihongo' }

export default function NumbersListeningPage() {
  return (
    <>
      <PageHeader eyebrow="数字の聞き取り" title="Numbers listening" description="Numbers, prices, times and dates — the parts JLPT listening asks about most." />
      <NumbersForm />
    </>
  )
}
