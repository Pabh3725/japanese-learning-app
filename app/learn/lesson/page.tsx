import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LessonPlayer } from '@/components/learning/lesson-player'
import { StarredWordsProvider } from '@/components/learning/star-button'
import { getMyStarredIds, parseGroups, startLesson } from '@/lib/dal/lesson'

export const metadata: Metadata = { title: 'Lesson · Nihongo' }

// V9 bài Learn. ?groups=vocabulary,word_kanji,kanji (mặc định cả ba). Có bài đang dở hôm nay thì tiếp tục bài đó.
export default async function LessonPage({ searchParams }: { searchParams: Promise<{ groups?: string }> }) {
  const { groups: raw } = await searchParams
  const groups = raw ? parseGroups(raw.split(',')) : ['vocabulary', 'word_kanji', 'kanji']
  if (!groups) redirect('/learn')
  const [view, starredIds] = await Promise.all([startLesson(groups), getMyStarredIds()])
  if ('status' in view) redirect('/learn')
  return (
    <StarredWordsProvider ids={starredIds}>
      <LessonPlayer key={`${view.lessonId}-${view.stepNo}-start`} initial={view} groupsQuery={raw ? `?groups=${groups.join(',')}` : ''} />
    </StarredWordsProvider>
  )
}
