import { LibraryBrowser } from '@/components/library/library-browser'
import { PageHeader } from '@/components/page-header'
import { getLibraryData } from '@/lib/dal/library'

export default async function LibraryPage() {
  const { vocabulary, kanji } = await getLibraryData()

  return (
    <>
      <PageHeader eyebrow="辞書" title="Library" description="Your N5 roadmap, with your progress on every word." />
      <LibraryBrowser vocabulary={vocabulary} kanji={kanji} />
    </>
  )
}
