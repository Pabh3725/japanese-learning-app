import { StarredWordsProvider } from '@/components/learning/star-button'
import { LibraryBrowser } from '@/components/library/library-browser'
import { PageHeader } from '@/components/page-header'
import { getLibraryData } from '@/lib/dal/library'

export default async function LibraryPage() {
  const { vocabulary, kanji, starredIds } = await getLibraryData()

  return (
    <>
      <PageHeader eyebrow="辞書" title="Library" description="Your N5 roadmap, with your progress on every word." />
      <StarredWordsProvider ids={starredIds}>
        <LibraryBrowser vocabulary={vocabulary} kanji={kanji} />
      </StarredWordsProvider>
    </>
  )
}
