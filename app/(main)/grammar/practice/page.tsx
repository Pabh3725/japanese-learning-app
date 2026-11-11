import type { Metadata } from 'next'
import { GrammarPracticeForm } from '@/components/grammar/practice-form'
import { PageHeader } from '@/components/page-header'
import { getGrammarOverview } from '@/lib/dal/grammar'

export const metadata: Metadata = { title: 'Grammar practice · Nihongo' }

export default async function GrammarPracticePage() {
  const g = await getGrammarOverview()
  const opened = new Set(g.practicable)
  const points = g.lessons.flatMap((l) => l.points.filter((p) => opened.has(p.code)).map((p) => ({ code: p.code, lesson: l.lesson, pattern: p.pattern, meaning: p.meaning })))
  return (
    <>
      <PageHeader eyebrow="文法" title="Practice" description="Extra practice with the patterns you have opened. Your points and review schedule do not change." />
      <GrammarPracticeForm points={points} />
    </>
  )
}
