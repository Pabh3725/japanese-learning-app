import type { Metadata } from 'next'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { NewStarRoundButton } from '@/components/learning/new-star-round-button'
import { StarButton, StarredWordsProvider } from '@/components/learning/star-button'
import { getStarredArea } from '@/lib/dal/star-relearn'
import { formatVnDateTime } from '@/lib/learning/time'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Starred words · Nihongo' }

function roundLabel(word: { met: boolean; roundAnswered: number; roundSize: number }) {
  if (!word.met) return 'Starts when you meet this word'
  return word.roundAnswered >= word.roundSize ? 'Extra round done' : `Extra round: ${word.roundAnswered} of ${word.roundSize}`
}

export default async function StarredPage() {
  const area = await getStarredArea()

  return (
    <>
      <PageHeader eyebrow="星" title="Starred words" description="Extra practice alongside your normal path. Remove the star when a word feels easy." />

      {area.words.length === 0 ? (
        <section className="rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-subtle">No starred words yet. Tap the star on a word in the Library or during a session.</p>
          <Link href="/library" className={cn(actionButton({ size: 'md' }), 'mt-4')}>Open the Library</Link>
        </section>
      ) : (
        <>
          <section aria-labelledby="starred-today" className="rounded-3xl border border-primary/30 bg-card p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 id="starred-today" className="text-3xl font-semibold tabular-nums">{area.words.length} {area.words.length === 1 ? 'word' : 'words'}</h2>
                <p className="mt-2 text-sm text-subtle">
                  {area.questionsLeft} extra {area.questionsLeft === 1 ? 'question' : 'questions'} left · {area.cardsDue} {area.cardsDue === 1 ? 'card' : 'cards'} due
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                {area.questionsLeft > 0 ? (
                  <Link href="/learn/starred/session" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-10')}>
                    <Play className="fill-current" aria-hidden="true" />
                    Practice starred words
                  </Link>
                ) : (
                  area.canRestart && <NewStarRoundButton />
                )}
                {area.cardsDue > 0 && <Link href="/review/session" className={actionButton({ variant: 'secondary', size: 'md' })}>Review due cards</Link>}
              </div>
            </div>
          </section>

          <StarredWordsProvider ids={area.words.map((w) => w.id)} refreshOnSave>
            <ul className="mt-6 flex flex-col divide-y divide-border rounded-3xl border border-border bg-card px-6">
              {area.words.map((word) => (
                <li key={word.id} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/library/${word.code}`} lang="ja" className="font-jp text-2xl hover:text-primary">{word.label}</Link>
                    <p className="text-sm text-subtle">{word.meaning}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {roundLabel(word)}
                      {word.cardDueAt && ` · Card next ${formatVnDateTime(new Date(word.cardDueAt))}`}
                    </p>
                  </div>
                  <StarButton vocabularyId={word.id} />
                </li>
              ))}
            </ul>
          </StarredWordsProvider>
        </>
      )}
    </>
  )
}
