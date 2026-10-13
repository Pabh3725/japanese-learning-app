import { LibraryBrowser } from '@/components/library/library-browser'
import { PageHeader } from '@/components/page-header'

export default function LibraryPage() {
  return (
    <>
      <PageHeader eyebrow="辞書" title="Library" description="Everything you've studied, with memory strength for each item." />
      <LibraryBrowser />
    </>
  )
}
