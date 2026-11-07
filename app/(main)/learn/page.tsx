import Link from 'next/link'
import { ArrowRight, Play, Star } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { ProgressBar } from '@/components/progress-bar'
import { LearnMoreButton } from '@/components/learning/learn-more-button'
import { LearnTabs } from '@/components/learning/learn-tabs'
import { LevelUpPrompt } from '@/components/learning/level-up-prompt'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { cn } from '@/lib/utils'

const stages = [
  { step: '1', title: 'Meet', body: 'See the reading and meaning of a new word, and hear how it sounds.' },
  { step: '2', title: 'Recognize', body: 'Choose the right answer first, then build the reading from Kana pieces.' },
  { step: '3', title: 'Sino-Vietnamese', body: 'Meet the Sino-Vietnamese reading of the word. Its Kanji comes later.' },
  { step: '4', title: 'Practice Kanji', body: 'Choose the reading, meet each Kanji, then build the word from pieces.' },
  { step: '5', title: 'Recall', body: 'Type and build the word from memory.' },
]

export default async function LearnPage() {
  const overview = await getLearnOverview()
  const hasWork = overview.questionsToday + overview.newToday > 0

  return (
    <>
      <PageHeader eyebrow="学習" title="Learn" description="New words and practice, mixed into short sessions." />
      <LearnTabs active="vocabulary" />
      {overview.nextLevel !== null && <LevelUpPrompt skill="vocabulary" level={overview.level} next={overview.nextLevel} itemName="words" />}

      <section aria-labelledby="today-title" className="rounded-3xl border border-primary/30 bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <h2 id="today-title" className="mt-1 text-3xl font-semibold tabular-nums">
              {hasWork ? `${overview.sessions} ${overview.sessions === 1 ? 'session' : 'sessions'}` : 'All caught up'}
            </h2>
            <p className="mt-2 text-sm text-subtle">
              {overview.questionsToday} questions due · {overview.newToday} new words
            </p>
            {overview.currentLesson && (
              <p className="mt-2 text-sm text-subtle">
                Lesson {overview.currentLesson.lesson}: {overview.currentLesson.met} of {overview.currentLesson.total} words met
              </p>
            )}
            {overview.block && (
              <p className="mt-2 text-sm text-yellow">
                {overview.block === 'cards' ? 'New words are paused: many cards are waiting in Review.' : "New words are paused: you've reached today's question limit."}
              </p>
            )}
          </div>
          {!hasWork && (
            <div className="flex flex-col gap-3">
              {overview.answeredToday > 0 && (
                <Link href="/learn/summary" className={actionButton({ variant: 'secondary', size: 'md' })}>
                  See today&apos;s summary
                </Link>
              )}
              {overview.canBorrow > 0 && <LearnMoreButton count={overview.canBorrow} />}
            </div>
          )}
          {hasWork && (
            <Link href="/learn/session" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-10')}>
              <Play className="fill-current" aria-hidden="true" />
              Start learning
            </Link>
          )}
        </div>
      </section>

      <Link href="/learn/starred" className="mt-8 flex items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6 transition-colors hover:border-[#3b4250]">
        <span className="flex items-center gap-3">
          <Star className={cn('size-6 shrink-0 text-yellow', overview.starredCount > 0 && 'fill-current')} aria-hidden="true" />
          <span>
            <span className="block font-semibold">Starred words</span>
            <span className="block text-sm text-muted-foreground">
              {overview.starredCount > 0 ? `${overview.starredCount} ${overview.starredCount === 1 ? 'word' : 'words'} with extra practice` : 'Star the words you want to practice more'}
            </span>
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <section aria-labelledby="path-title" className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 id="path-title" className="font-semibold">Your JLPT path</h2>
        <div className="mt-5 flex flex-col gap-6">
          {overview.levels.map((level) => (
            <div key={level.level}>
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <span className="text-subtle">
                  <span className="font-medium text-foreground">{level.level}</span>
                  {level.firstLesson !== null && ` · Lessons ${level.firstLesson}–${level.lastLesson}`}
                </span>
                <span className="tabular-nums text-muted-foreground">{level.completed} / {level.total}</span>
              </div>
              <ProgressBar value={level.completed} max={level.total} tone={level.level === 'N5' ? 'cyan' : 'pink'} label={`${level.level} vocabulary progress`} />
            </div>
          ))}
          <p className="text-sm text-muted-foreground">{overview.inProgress} in progress</p>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mt-8">
        <h2 id="how-title" className="mb-4 font-semibold">How a word is learned</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {stages.map((s) => (
            <li key={s.step} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">{s.step}</span>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">Words written only in Kana skip steps 3 and 4.</p>
      </section>
    </>
  )
}
