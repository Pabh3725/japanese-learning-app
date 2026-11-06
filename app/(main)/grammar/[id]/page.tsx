import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { actionButton } from '@/components/action-button'
import { SpeakerButton } from '@/components/learning/speaker-button'
import { PageHeader } from '@/components/page-header'
import { PreviewBanner } from '@/components/preview/preview-banner'
import { grammarById } from '@/lib/preview/grammar'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Grammar · Nihongo' }

export default async function GrammarPointPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const point = grammarById(id)
  if (!point) notFound()

  return (
    <>
      <PageHeader eyebrow={`Lesson ${point.lesson}`} title={point.pattern} description={point.meaning} />
      <PreviewBanner>Sample content for the design preview.</PreviewBanner>

      <section aria-labelledby="explain-title" className="rounded-3xl border border-border bg-card p-6">
        <h2 id="explain-title" className="font-semibold">How it works</h2>
        <p className="mt-2 text-pretty leading-relaxed text-subtle">{point.explanation}</p>
      </section>

      <section aria-labelledby="examples-title" className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 id="examples-title" className="font-semibold">Examples</h2>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {point.examples.map((example) => (
            <li key={example.japanese} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span lang="ja" className="block font-jp text-xl">{example.japanese}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{example.meaning}</span>
              </span>
              <SpeakerButton kana={example.reading} />
            </li>
          ))}
        </ul>
      </section>

      <Link href={`/grammar/session?points=${point.id}&count=10`} className={cn(actionButton({ size: 'lg' }), 'mt-6 w-full md:w-auto md:px-8')}>
        Practice this grammar
      </Link>
    </>
  )
}
