import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { KnownToggle } from '@/components/library/known-toggle'
import { SpeakerButton } from '@/components/learning/speaker-button'
import { getWordDetail } from '@/lib/dal/word-detail'
import { CARD_LABELS } from '@/lib/learning/card-labels'
import { formatVnDateTime } from '@/lib/learning/time'

export const metadata: Metadata = { title: 'Word · Nihongo' }

export default async function WordDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const word = await getWordDetail(code)
  if (!word) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link href="/library" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Library
      </Link>

      <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 lang="ja" className="font-jp text-5xl font-medium">{word.expression}</h1>
            {word.reading !== word.expression && <p lang="ja" className="mt-2 font-jp text-xl text-cyan">{word.reading}</p>}
            {word.romaji && <p className="mt-1 text-sm text-muted-foreground">{word.romaji}</p>}
          </div>
          <SpeakerButton kana={word.reading} />
        </div>
        {word.hanViet && <p className="mt-4 text-sm font-semibold tracking-wider text-yellow">{word.hanViet}</p>}
        <p className="mt-2 text-lg font-medium">{word.meaning}</p>
        {word.lesson !== null && <p className="mt-3 text-sm text-muted-foreground">Lesson {word.lesson}</p>}
      </section>

      {word.kanji.length > 0 && (
        <section aria-labelledby="kanji-title" className="rounded-3xl border border-border bg-card p-6">
          <h2 id="kanji-title" className="font-semibold">Kanji in this word</h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {word.kanji.map((k) => (
              <li key={k.character} className="flex items-baseline gap-3 py-3">
                <span lang="ja" className="font-jp text-2xl">{k.character}</span>
                <span className="text-sm font-semibold text-yellow">{k.hanViet}</span>
                <span className="text-sm text-subtle">{k.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="progress-title" className="rounded-3xl border border-border bg-card p-6">
        <h2 id="progress-title" className="font-semibold">Your progress</h2>
        {word.known && <p className="mt-2 text-sm text-success">Marked as already known. This word is not on your path.</p>}
        {!word.progress && !word.known && <p className="mt-2 text-sm text-muted-foreground">You haven&apos;t met this word yet. It will come up in lesson order.</p>}
        {word.progress && (
          <>
            <p className="mt-2 text-sm text-subtle">{word.progress.completed ? 'Finished the first learning round.' : `Currently at Stage ${word.progress.currentStage}.`}</p>
            {word.progress.stages.length > 0 && (
              <ul className="mt-3 flex flex-col divide-y divide-border">
                {word.progress.stages.map((s) => (
                  <li key={s.stage} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>Stage {s.stage}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {s.points} points · {s.completed ? 'complete' : `next ${formatVnDateTime(new Date(s.dueAt))}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {word.progress.cards.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-medium">Review cards</h3>
                <ul className="mt-1 flex flex-col divide-y divide-border">
                  {word.progress.cards.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span>{CARD_LABELS[c.type]}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {c.points} points · {c.retired ? 'retired' : word.known ? 'paused' : `next ${formatVnDateTime(new Date(c.dueAt))}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        <div className="mt-5">
          <KnownToggle vocabularyId={word.id} known={word.known} />
        </div>
      </section>
    </div>
  )
}
