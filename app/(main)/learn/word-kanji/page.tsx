import type { Metadata } from 'next'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { LearnTabs } from '@/components/learning/learn-tabs'
import { LevelUpPrompt } from '@/components/learning/level-up-prompt'
import { PageHeader } from '@/components/page-header'
import { ProgressBar } from '@/components/progress-bar'
import { getWordKanjiOverview } from '@/lib/dal/word-kanji'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Kanji words · Nihongo' }

export default async function WordKanjiPage() {
  const overview = await getWordKanjiOverview()
  const hasWork = overview.questionsToday + overview.waiting > 0

  return (
    <>
      <PageHeader eyebrow="学習" title="Learn" description="Remember how each word is written. A word opens once you know its Kana and have learned its Kanji." />
      <LearnTabs active="word_kanji" />
      {overview.nextLevel !== null && <LevelUpPrompt skill="word_kanji" level={overview.level} next={overview.nextLevel} itemName="Kanji words" />}

      <section aria-labelledby="word-kanji-today" className="rounded-3xl border border-primary/30 bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <h2 id="word-kanji-today" className="mt-1 text-3xl font-semibold tabular-nums">
              {overview.questionsToday > 0
                ? `${overview.questionsToday} ${overview.questionsToday === 1 ? 'question' : 'questions'}`
                : overview.waiting > 0
                  ? `${overview.waiting} new ${overview.waiting === 1 ? 'word' : 'words'}`
                  : 'All caught up'}
            </h2>
            <p className="mt-2 text-sm text-subtle">{overview.waiting} words ready · {overview.waitingForLevel} waiting for the next level{overview.optional > 0 ? ` · ${overview.optional} optional` : ''}</p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">{overview.answeredToday} of {overview.cap} questions answered today</p>
          </div>
          {hasWork && (
            <Link href="/learn/session?skill=word_kanji" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-10')}>
              <Play className="fill-current" aria-hidden="true" />
              Start
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="word-kanji-progress" className="mt-8 rounded-3xl border border-border bg-card p-6">
        <div className="mb-2 flex justify-between text-sm">
          <h2 id="word-kanji-progress" className="font-semibold">Your progress</h2>
          <span className="tabular-nums text-muted-foreground">{overview.completed} / {overview.total} learned</span>
        </div>
        <ProgressBar value={overview.completed} max={overview.total} tone="pink" label="Kanji words learned" />
        <p className="mt-2 text-sm text-muted-foreground">{overview.inProgress} still learning</p>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Which words are usually written in kana comes from{' '}
        <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project" target="_blank" rel="noreferrer" className="underline underline-offset-2">JMdict</a>{' '}
        by the Electronic Dictionary Research and Development Group, under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2">CC BY-SA 4.0</a>.
      </p>
    </>
  )
}
