import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { restoreCardAction } from '@/app/review/actions'
import { StarButton, StarNote, StarredWordsProvider } from '@/components/learning/star-button'
import { KnownToggle } from '@/components/library/known-toggle'
import { RelearnButton } from '@/components/library/relearn-button'
import { SpeakerButton } from '@/components/learning/speaker-button'
import { getWordDetail } from '@/lib/dal/word-detail'
import { formatVnDateTime } from '@/lib/learning/time'
import { CARD_TYPES, REVIEW_CARDS } from '@/lib/v12/card-types'

export const metadata: Metadata = { title: 'Word · Nihongo' }

const AREA_LABEL = { kana: 'Kana vocabulary', word_kanji: 'Kanji word' } as const

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
          {word.hasKanjiForm && <p className="mt-2 text-sm text-subtle">Its Kanji form opens in Kanji words once you reach Stage 2 with its kana and each of its characters.</p>}
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {word.kanji.map((k) => (
              <li key={k.character} className="flex items-baseline gap-3 py-3">
                <Link href={`/library/kanji/${encodeURIComponent(k.character)}`} lang="ja" className="font-jp text-2xl hover:text-primary">{k.character}</Link>
                <span className="text-sm font-semibold text-yellow">{k.hanViet}</span>
                <span className="text-sm text-subtle">{k.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="progress-title" className="rounded-3xl border border-border bg-card p-6">
        <h2 id="progress-title" className="font-semibold">Your progress</h2>
        {word.known && <p className="mt-2 text-sm text-success">Learned. This word needs no review and is not on your path.</p>}
        {word.items.length === 0 && !word.known && <p className="mt-2 text-sm text-muted-foreground">You haven&apos;t met this word yet. It will come up in lesson order.</p>}
        {word.items.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {word.items.map((it) => (
              <li key={it.area} className="flex flex-col gap-1 py-3 text-sm">
                <span>
                  {AREA_LABEL[it.area]} · {it.stage === 'review' ? 'review cards' : `Stage ${it.stage}`}
                </span>
                {it.types.length > 0 && (
                  <span className="text-muted-foreground tabular-nums">{it.types.map((t) => `${CARD_TYPES[t.type].label}: ${t.points}/3`).join(' · ')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {word.cards.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-medium">Review cards</h3>
            <ul className="mt-1 flex flex-col divide-y divide-border">
              {word.cards.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>{REVIEW_CARDS[c.type].label}</span>
                  <span className="text-muted-foreground tabular-nums">{c.archived ? 'archived' : word.known ? 'paused' : `next ${formatVnDateTime(new Date(c.dueAt))}`}</span>
                  {c.archived && !word.known && <RelearnButton label="Restore" action={restoreCardAction.bind(null, 'item', c.id, 'keep', crypto.randomUUID())} />}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-5">
          <KnownToggle vocabularyId={word.id} known={word.known} />
        </div>
      </section>
    </div>
  )
}
