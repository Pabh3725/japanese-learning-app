import Link from 'next/link'
import { ArrowRight, Play, Star } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { ProgressBar } from '@/components/progress-bar'
import { LearnMoreButton } from '@/components/learning/learn-more-button'
import { LevelUpPrompt } from '@/components/learning/level-up-prompt'
import { getKanjiOverview } from '@/lib/dal/kanji'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getWordKanjiOverview } from '@/lib/dal/word-kanji'
import { cn } from '@/lib/utils'

// V9: một khu Learn. Ô trên cùng có nút Learn trộn cả ba nhóm; ba ô bên dưới để theo dõi và học riêng từng nhóm.
const stages = [
  { step: '1–3', title: 'Vocabulary', body: 'Meet the word, recognize its kana and meaning, then recall it from memory. Finishing Stage 3 adds a vocabulary card.' },
  { step: '4–6', title: 'Kanji words', body: 'Meet how the word is written, recognize its Kanji and Sino-Vietnamese, then recall them. Finishing Stage 6 adds a Kanji word card.' },
  { step: 'K', title: 'Kanji', body: 'Learn each character over 4 sittings, then keep two cards: meaning and Sino-Vietnamese.' },
]

function SectionBox({
  title,
  jp,
  tone,
  line,
  detail,
  progress,
  progressLabel,
  startHref,
  canStart,
  moreHref,
}: {
  title: string
  jp: string
  tone: 'cyan' | 'pink' | 'yellow'
  line: string
  detail: string
  progress: { value: number; max: number }
  progressLabel: string
  startHref: string
  canStart: boolean
  moreHref: string
}) {
  return (
    <section aria-labelledby={`learn-${tone}`} className="flex flex-col rounded-3xl border border-border bg-card p-5">
      <p lang="ja" className="font-jp text-xs text-muted-foreground">{jp}</p>
      <h2 id={`learn-${tone}`} className="mt-1 font-semibold">{title}</h2>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{line}</p>
      <p className="mt-1 text-sm text-subtle">{detail}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{progressLabel}</span>
          <span>{progress.value} / {progress.max}</span>
        </div>
        <ProgressBar value={progress.value} max={progress.max} tone={tone} size="sm" label={`${title} progress`} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <Link href={moreHref} className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Details</Link>
        {canStart && (
          <Link href={startHref} className={actionButton({ variant: 'secondary', size: 'sm' })}>
            Practice only this
          </Link>
        )}
      </div>
    </section>
  )
}

export default async function LearnPage() {
  const [vocab, wordKanji, kanji] = await Promise.all([getLearnOverview(), getWordKanjiOverview(), getKanjiOverview()])
  const questions = vocab.questionsToday + wordKanji.questionsToday + kanji.questionsToday
  const fresh = vocab.newToday + wordKanji.waiting + kanji.newToday
  const hasWork = questions + fresh > 0
  const answeredToday = vocab.answeredToday + wordKanji.answeredToday + kanji.answeredToday

  return (
    <>
      <PageHeader eyebrow="学習" title="Learn" description="Vocabulary, Kanji words and Kanji, mixed into one session." />
      {vocab.nextLevel !== null && <LevelUpPrompt skill="vocabulary" level={vocab.level} next={vocab.nextLevel} itemName="words" />}
      {wordKanji.nextLevel !== null && <LevelUpPrompt skill="word_kanji" level={wordKanji.level} next={wordKanji.nextLevel} itemName="Kanji words" />}
      {kanji.nextLevel !== null && <LevelUpPrompt skill="kanji" level={kanji.level} next={kanji.nextLevel} itemName="Kanji" />}

      <section aria-labelledby="today-title" className="rounded-3xl border border-primary/30 bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <h2 id="today-title" className="mt-1 text-3xl font-semibold tabular-nums">
              {hasWork ? `${questions} ${questions === 1 ? 'question' : 'questions'}` : 'All caught up'}
            </h2>
            <p className="mt-2 text-sm text-subtle">
              {fresh} new · {vocab.newToday} words, {wordKanji.waiting} Kanji words, {kanji.newToday} Kanji
              {answeredToday > 0 && ` · ${answeredToday} answered today`}
            </p>
            {vocab.block && (
              <p className="mt-2 text-sm text-yellow">
                {vocab.block === 'cards' ? 'New words are paused: many cards are waiting in Review.' : "New words are paused: you've reached today's question limit."}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            {hasWork && (
              <Link href="/learn/mixed" className={cn(actionButton({ size: 'lg' }), 'w-full md:w-auto md:px-12')}>
                <Play className="fill-current" aria-hidden="true" />
                Learn
              </Link>
            )}
            {!hasWork && vocab.canBorrow > 0 && <LearnMoreButton count={vocab.canBorrow} />}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SectionBox
          title="Vocabulary"
          jp="語彙"
          tone="cyan"
          line={`${vocab.questionsToday} due`}
          detail={`${vocab.newToday} new words${vocab.currentLesson ? ` · Lesson ${vocab.currentLesson.lesson}: ${vocab.currentLesson.met}/${vocab.currentLesson.total}` : ''}`}
          progress={{ value: vocab.levels.reduce((s, l) => s + l.completed, 0), max: vocab.levels.reduce((s, l) => s + l.total, 0) }}
          progressLabel={`${vocab.inProgress} in progress`}
          startHref="/learn/session"
          canStart={vocab.questionsToday + vocab.newToday > 0}
          moreHref="#path-title"
        />
        <SectionBox
          title="Kanji words"
          jp="漢字語"
          tone="pink"
          line={`${wordKanji.questionsToday} due`}
          detail={`${wordKanji.waiting} ready · ${wordKanji.waitingForLevel} for the next level`}
          progress={{ value: wordKanji.completed, max: wordKanji.total }}
          progressLabel={`${wordKanji.inProgress} in progress`}
          startHref="/learn/session?skill=word_kanji"
          canStart={wordKanji.questionsToday + wordKanji.waiting > 0}
          moreHref="/learn/word-kanji"
        />
        <SectionBox
          title="Kanji"
          jp="漢字"
          tone="yellow"
          line={`${kanji.questionsToday} due`}
          detail={`${kanji.dueReview} cards · ${kanji.dueLearning} learning · ${kanji.newToday} new`}
          progress={{ value: kanji.longTerm, max: kanji.total }}
          progressLabel={`${kanji.learning} learning`}
          startHref="/learn/kanji/session"
          canStart={kanji.questionsToday + kanji.newToday > 0}
          moreHref="/learn/kanji"
        />
      </div>

      <Link href="/learn/starred" className="mt-8 flex items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6 transition-colors hover:border-[#3b4250]">
        <span className="flex items-center gap-3">
          <Star className={cn('size-6 shrink-0 text-yellow', vocab.starredCount > 0 && 'fill-current')} aria-hidden="true" />
          <span>
            <span className="block font-semibold">Starred words</span>
            <span className="block text-sm text-muted-foreground">
              {vocab.starredCount > 0 ? `${vocab.starredCount} ${vocab.starredCount === 1 ? 'word' : 'words'} with extra practice` : 'Star the words you want to practice more'}
            </span>
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <section aria-labelledby="path-title" className="mt-8 scroll-mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 id="path-title" className="font-semibold">Your JLPT vocabulary path</h2>
        <div className="mt-5 flex flex-col gap-6">
          {vocab.levels.map((level) => (
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
        </div>
      </section>

      <section aria-labelledby="how-title" className="mt-8">
        <h2 id="how-title" className="mb-4 font-semibold">How it works</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {stages.map((s) => (
            <li key={s.step} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex h-8 min-w-8 w-fit items-center justify-center rounded-full bg-primary/12 px-2 text-sm font-semibold text-primary">{s.step}</span>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">Words written only in kana stop after Stage 3.</p>
      </section>
    </>
  )
}
