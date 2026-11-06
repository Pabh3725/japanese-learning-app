import { LearningCard } from '@/components/dashboard/learning-card'
import { PageHeader } from '@/components/page-header'
import { ProgressBar } from '@/components/progress-bar'
import { getLearnOverview } from '@/lib/dal/learn-overview'

const stages = [
  { step: '1', title: 'Meet', body: 'See the reading and meaning of a new word, and hear how it sounds.' },
  { step: '2', title: 'Recognize', body: 'Choose the right answer first, then build the reading from Kana pieces.' },
  { step: '3', title: 'Sino-Vietnamese', body: 'Meet the Sino-Vietnamese reading of the word. Its Kanji comes later.' },
  { step: '4', title: 'Practice Kanji', body: 'Choose the reading, meet each Kanji, then build the word from pieces.' },
  { step: '5', title: 'Recall', body: 'Type and build the word from memory.' },
]

export default async function LearnPage() {
  const overview = await getLearnOverview()

  return (
    <>
      <PageHeader eyebrow="学習" title="Learn" description="Pick up new words in short, guided sessions." />

      <div className="grid gap-4 md:grid-cols-2">
        <LearningCard
          href="/learn/intro"
          title="Stage 1 · New words"
          description="Meet new words with their sound and meaning"
          sample="語"
          count={overview.newToday}
          countLabel="new today"
          tone="cyan"
        />
        <LearningCard
          href="/learn/stage2"
          title="Stage 2 · Kana"
          description="Choose first, then build the reading"
          sample="か"
          count={overview.due[2]}
          countLabel="due now"
          tone="yellow"
        />
        <LearningCard
          href="/learn/stage3"
          title="Stage 3 · Introductions"
          description="Meet Sino-Vietnamese readings and Kanji"
          sample="字"
          count={overview.stage3Waiting}
          countLabel="to meet"
          tone="pink"
        />
        <LearningCard
          href="/learn/stage4"
          title="Stage 4 · Kanji"
          description="Choose first, then build Kanji and Sino-Vietnamese"
          sample="漢"
          count={overview.due[4]}
          countLabel="due now"
          tone="cyan"
        />
        <LearningCard
          href="/learn/stage5"
          title="Stage 5 · Recall"
          description="Type and build from memory"
          sample="憶"
          count={overview.due[5]}
          countLabel="due now"
          tone="yellow"
        />
      </div>

      <section aria-labelledby="path-title" className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 id="path-title" className="font-semibold">JLPT N5 path</h2>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-subtle">Vocabulary completed</span>
            <span className="tabular-nums text-muted-foreground">
              {overview.completed} / {overview.total}
            </span>
          </div>
          <ProgressBar value={overview.completed} max={overview.total} tone="cyan" label="Vocabulary progress" />
          <p className="mt-2 text-sm text-muted-foreground">{overview.inProgress} in progress</p>
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
