import { StarredWordsProvider } from '@/components/learning/star-button'
import { LibraryBrowser } from '@/components/library/library-browser'
import { PageHeader } from '@/components/page-header'
import { getLibraryData } from '@/lib/dal/library'

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const { vocabulary, kanji, starredIds } = await getLibraryData()

  return (
    <>
      <PageHeader eyebrow="辞書" title="Library" description="Every word on your path, with your progress. N5 is lessons 1–25, N4 is lessons 26–50." />
      <StarredWordsProvider ids={starredIds}>
        <LibraryBrowser vocabulary={vocabulary} kanji={kanji} initialTab={tab === 'kanji' ? 'kanji' : 'vocab'} />
      </StarredWordsProvider>
    </>
  )
}
