import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { GrammarExamples } from '@/components/grammar/grammar-intro'
import { GrammarReviewToggle, MarkGrammarLearned } from '@/components/grammar/mark-learned'
import { getGrammarPoint } from '@/lib/dal/grammar'
import { formatVnDateTime } from '@/lib/learning/time'

export const metadata: Metadata = { title: 'Grammar · Nihongo' }

const STATUS = { locked: 'Not open yet', new: 'Ready to learn', learning: 'Learning', review: 'Learned · in Review' } as const

/** Chi tiết một mẫu ngữ pháp: dùng chung cho tab Grammar và Library. */
export default async function GrammarPointPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams])
  const p = await getGrammarPoint(id)
  if (!p) notFound()
  const back = from === 'library' ? { href: '/library?tab=grammar', label: 'Back to Library' } : { href: '/grammar', label: 'Back to Grammar' }

  return (
    <div className="flex flex-col gap-6">
      <Link href={back.href} className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {back.label}
      </Link>

      <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <p className="text-sm text-muted-foreground">{p.level} · Lesson {p.lesson}</p>
        <h1 lang="ja" className="mt-1 font-jp text-3xl font-medium md:text-4xl">{p.pattern}</h1>
        <p className="mt-2 text-lg font-medium text-yellow">{p.meaning}</p>
        <p className="mt-4 text-pretty leading-relaxed text-subtle">{p.explanation}</p>
        {p.notes && <p className="mt-4 rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">{p.notes}</p>}
      </section>

      <section aria-labelledby="examples-title" className="rounded-3xl border border-border bg-card p-6">
        <h2 id="examples-title" className="mb-3 font-semibold">Examples</h2>
        <GrammarExamples examples={p.examples} furigana />
      </section>

      <section aria-labelledby="progress-title" className="rounded-3xl border border-border bg-card p-6">
        <h2 id="progress-title" className="font-semibold">Your progress</h2>
        <p className="mt-2 text-sm text-subtle">
          {STATUS[p.status]}
          {p.status === 'learning' && ` · ${p.points} of 40 points`}
          {p.status === 'review' && (p.archived ? ' · not in review' : p.dueAt ? ` · next review ${formatVnDateTime(new Date(p.dueAt))}` : '')}
        </p>
        <div className="mt-4">
          {p.status === 'review' ? <GrammarReviewToggle code={p.code} archived={p.archived} /> : <MarkGrammarLearned codes={[p.code]} label="Skip this pattern…" />}
        </div>
      </section>
    </div>
  )
}
