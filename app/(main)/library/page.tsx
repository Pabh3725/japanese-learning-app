import { StarredKanjiProvider } from '@/components/kanji/kanji-star-button'
import { StarredWordsProvider } from '@/components/learning/star-button'
import { LibraryBrowser } from '@/components/library/library-browser'
import { PageHeader } from '@/components/page-header'
import { getGrammarOverview } from '@/lib/dal/grammar'
import { getLibraryData } from '@/lib/dal/library'

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const [{ vocabulary, kanji, starredIds, starredKanjiIds }, g] = await Promise.all([getLibraryData(), getGrammarOverview()])
  const grammar = g.lessons.flatMap((l) => l.points.map((p) => ({ code: p.code, lesson: l.lesson, level: l.level, pattern: p.pattern, meaning: p.meaning, status: p.status, archived: p.archived })))

  return (
    <>
      <PageHeader eyebrow="辞書" title="Library" description="Every word, Kanji and grammar pattern on your path, with your progress. N5 is units 1–25, N4 is units 26–50." />
      <StarredWordsProvider ids={starredIds}>
        <StarredKanjiProvider ids={starredKanjiIds}>
          <LibraryBrowser vocabulary={vocabulary} kanji={kanji} grammar={grammar} initialTab={tab === 'kanji' ? 'kanji' : tab === 'grammar' ? 'grammar' : 'vocab'} />
        </StarredKanjiProvider>
      </StarredWordsProvider>
    </>
  )
}
