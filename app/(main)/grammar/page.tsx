import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, ListChecks } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { PreviewBanner } from '@/components/preview/preview-banner'
import { GRAMMAR_POINTS } from '@/lib/preview/grammar'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Grammar · Nihongo' }

export default function GrammarPage() {
  const lessons = [...new Set(GRAMMAR_POINTS.map((point) => point.lesson))]
  return (
    <>
      <PageHeader eyebrow="文法" title="Grammar" description="Learn each pattern with the lesson's words, then practice the way you like." />
      <PreviewBanner>This is a design preview with sample content. Your answers are not saved yet.</PreviewBanner>

      <Link href="/grammar/practice" className={cn(actionButton({ size: 'lg' }), 'mb-8 w-full md:w-auto md:px-8')}>
        <ListChecks aria-hidden="true" />
        Choose what to practice
      </Link>

      <div className="flex flex-col gap-6">
        {lessons.map((lesson) => (
          <section key={lesson} aria-labelledby={`lesson-${lesson}`} className="rounded-3xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`lesson-${lesson}`} className="font-semibold">Lesson {lesson}</h2>
              <span className="text-sm text-muted-foreground">Opens after you meet 80% of its words</span>
            </div>
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {GRAMMAR_POINTS.filter((point) => point.lesson === lesson).map((point) => (
                <li key={point.id}>
                  <Link href={`/grammar/${point.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                    <span className="min-w-0">
                      <span lang="ja" className="block font-jp text-lg">{point.pattern}</span>
                      <span className="block text-sm text-muted-foreground">{point.meaning}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
