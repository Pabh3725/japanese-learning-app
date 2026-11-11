import type { Metadata } from 'next'
import { GrammarTestForm } from '@/components/grammar/test-form'
import { PageHeader } from '@/components/page-header'
import { getGrammarOverview } from '@/lib/dal/grammar'

export const metadata: Metadata = { title: 'Grammar test · Nihongo' }

export default async function GrammarTestPage() {
  const g = await getGrammarOverview()
  const lessons = g.lessons.map((l) => ({ lesson: l.lesson, ready: g.testable.includes(l.lesson), missing: l.points.length - l.done, total: l.points.length }))
  return (
    <>
      <PageHeader eyebrow="文法" title="Test" description="Choose the lessons you have finished and how many questions you want." />
      <GrammarTestForm lessons={lessons} />
    </>
  )
}
