import { LearningCard } from '@/components/dashboard/learning-card'
import { PageHeader } from '@/components/page-header'
import { ProgressBar } from '@/components/progress-bar'
import { userProfile } from '@/lib/mock-data'

const stages = [
  { step: '1', title: 'Discover', body: 'Meet each word or Kanji with its reading, Sino-Vietnamese and meaning.' },
  { step: '2', title: 'Recognize', body: 'Pick the right answer from a few options to build familiarity.' },
  { step: '3', title: 'Build', body: 'Assemble words from Kana pieces or Kanji from its components.' },
  { step: '4', title: 'Recall', body: 'Type the answer from memory to lock it in long-term.' },
]

export default function LearnPage() {
  return (
    <>
      <PageHeader eyebrow="学習" title="Learn" description="Pick up new words and Kanji in short, guided sessions." />

      <div className="grid gap-4 md:grid-cols-2">
        <LearningCard
          href="/learn/session?mode=vocab"
          title="New Vocabulary"
          description="5 words · about 6 minutes"
          sample="語"
          count={userProfile.newToday}
          countLabel="new today"
          tone="cyan"
        />
        <LearningCard
          href="/learn/session?mode=kanji"
          title="New Kanji"
          description="3 characters · about 5 minutes"
          sample="漢"
          count={3}
          countLabel="new today"
          tone="pink"
        />
      </div>

      <section aria-labelledby="path-title" className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 id="path-title" className="font-semibold">JLPT N5 path</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-subtle">Vocabulary</span>
              <span className="tabular-nums text-muted-foreground">
                {userProfile.vocabLearned} / {userProfile.vocabTotal}
              </span>
            </div>
            <ProgressBar value={userProfile.vocabLearned} max={userProfile.vocabTotal} tone="cyan" label="Vocabulary progress" />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-subtle">Kanji</span>
              <span className="tabular-nums text-muted-foreground">
                {userProfile.kanjiLearned} / {userProfile.kanjiTotal}
              </span>
            </div>
            <ProgressBar value={userProfile.kanjiLearned} max={userProfile.kanjiTotal} tone="pink" label="Kanji progress" />
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mt-8">
        <h2 id="how-title" className="mb-4 font-semibold">How a session works</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((s) => (
            <li key={s.step} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">{s.step}</span>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
