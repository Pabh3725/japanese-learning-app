import type { Metadata } from 'next'
import { CountersPage } from '@/components/counters/counters-page'
import { PageHeader } from '@/components/page-header'
import { requireUser } from '@/lib/dal/auth'

export const metadata: Metadata = { title: 'Counters · Nihongo' }

// Counters (More): bảng tra từ đếm, ngày tháng năm, giờ phút và bài luyện. Chỉ luyện, không lưu gì.
export default async function CountersRoute() {
  await requireUser()
  return (
    <>
      <PageHeader eyebrow="助数詞" title="Counters" description="Counting words, dates and time, with every sound change written out. Look them up here or practice them; practice does not change your points or schedule." />
      <CountersPage />
    </>
  )
}
