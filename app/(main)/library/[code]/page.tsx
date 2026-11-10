import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { relearnCardAction, relearnStageAction } from '@/app/learn/actions'
import { StarButton, StarNote, StarredWordsProvider } from '@/components/learning/star-button'
import { KnownToggle } from '@/components/library/known-toggle'
import { RelearnButton } from '@/components/library/relearn-button'
import { SpeakerButton } from '@/components/learning/speaker-button'
import { getWordDetail } from '@/lib/dal/word-detail'
import { CARD_LABELS } from '@/lib/learning/card-labels'
import { relearnStagePoints } from '@/lib/learning/stage'
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

      <StarredWordsProvider ids={word.starred ? [word.id] : []} refreshOnSave>
      <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 lang="ja" className="font-jp text-5xl font-medium">{word.expression}</h1>
            {word.reading !== word.expression && <p lang="ja" className="mt-2 font-jp text-xl text-cyan">{word.reading}</p>}
            {word.romaji && <p className="mt-1 text-sm text-muted-foreground">{word.romaji}</p>}
          </div>
          <div className="flex items-center gap-1">
            <StarButton vocabularyId={word.id} />
            <SpeakerButton kana={word.reading} />
          </div>
        </div>
        {word.hanViet && <p className="mt-4 text-sm font-semibold tracking-wider text-yellow">{word.hanViet}</p>}
        <p className="mt-2 text-lg font-medium">{word.meaning}</p>
        {word.lesson !== null && <p className="mt-3 text-sm text-muted-foreground">Lesson {word.lesson}</p>}
        <StarNote vocabularyId={word.id} />
      </section>

      </StarredWordsProvider>

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
            <p className="mt-2 text-sm text-subtle">{word.progress.completed ? 'Vocabulary finished.' : `Vocabulary: Stage ${word.progress.currentStage}.`}</p>
            {!word.isKanaOnly && !word.progress.stages.some((s) => s.stage === 4) && (
              <p className="mt-2 text-sm text-muted-foreground">Its Kanji word opens after Stage 2, once you&apos;ve learned every Kanji in it.</p>
            )}
            {word.progress.stages.length > 0 && (
              <ul className="mt-3 flex flex-col divide-y divide-border">
                {word.progress.stages.map((s) => (
                  <li key={s.stage} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>{s.stage === 4 || s.stage === 6 ? 'Kanji word' : 'Vocabulary'} · Stage {s.stage}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {s.points} points · {s.completed ? 'complete' : `next ${formatVnDateTime(new Date(s.dueAt))}`}
                    </span>
                    {s.completed && !word.known && (
                      <RelearnButton
                        label="Learn again"
                        confirm={`Reopen Stage ${s.stage}? Points drop to ${relearnStagePoints(s.stage)}, and its questions return to Learn. Your cards stay.`}
                        action={relearnStageAction.bind(null, s.id)}
                      />
                    )}
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
                        {word.known || (c.type === 'vocab.star_recall' && !word.starred) ? 'paused' : `next ${formatVnDateTime(new Date(c.dueAt))}`}
                      </span>
                      {!word.known && (c.type !== 'vocab.star_recall' || word.starred) && <RelearnButton label="Review now" action={relearnCardAction.bind(null, c.id)} />}
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
