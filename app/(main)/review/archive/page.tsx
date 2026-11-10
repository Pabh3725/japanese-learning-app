import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ArchiveList } from '@/components/review/archive-list'
import { getArchivedCards } from '@/lib/dal/archive'

export const metadata: Metadata = { title: 'Archived cards · Nihongo' }

// V9 R13: Card đã bấm "Đã học xong". Khôi phục giữ tiến độ, hoặc học lại riêng Card đó từ đầu.
export default async function ArchivePage() {
  const cards = await getArchivedCards()
  return (
    <>
      <Link href="/review" className="mb-4 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Review
      </Link>
      <PageHeader eyebrow="保管" title="Archived cards" description="Cards you marked as learned. They keep their schedule and history; restore one to review it again." />
      <ArchiveList cards={cards} />
    </>
  )
}
