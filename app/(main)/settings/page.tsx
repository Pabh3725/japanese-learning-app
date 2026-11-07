import { PageHeader } from '@/components/page-header'
import { SettingsForm } from '@/components/settings/settings-form'
import { actionButton } from '@/components/action-button'
import { requireUser } from '@/lib/dal/auth'
import { getKanjiOverview } from '@/lib/dal/kanji'
import { getLearnOverview } from '@/lib/dal/learn-overview'
import { getReviewOverview } from '@/lib/dal/review'
import { getNewPerDay, getStudyLimits } from '@/lib/dal/settings'
import { RULES_V4 } from '@/lib/learning/rules'

/** Ước lượng thời gian mỗi câu hoặc thẻ. */
const SECONDS_PER_ITEM = 15

export default async function SettingsPage() {
  const [user, newPerDay, limits, learn, review, kanji] = await Promise.all([requireUser(), getNewPerDay(), getStudyLimits(), getLearnOverview(), getReviewOverview(), getKanjiOverview()])
  const minutes = Math.ceil(((learn.questionsToday + learn.newToday + review.dueNow + kanji.questionsToday + kanji.newToday * RULES_V4.kanji.questionsPerSitting) * SECONDS_PER_ITEM) / 60)
  const daysToFinish = newPerDay > 0 ? Math.ceil(learn.wordsLeft / newPerDay) : null

  return (
    <>
      <PageHeader eyebrow="設定" title="Settings" description="Tune your study experience." />
      <section aria-labelledby="estimate-title" className="mb-6 max-w-2xl rounded-3xl border border-border bg-card p-6">
        <h2 id="estimate-title" className="font-semibold">With your current settings</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-subtle">
          <li>About {minutes} {minutes === 1 ? 'minute' : 'minutes'} of study left today ({learn.questionsToday} questions, {review.dueNow} cards, {kanji.questionsToday + kanji.newToday * RULES_V4.kanji.questionsPerSitting} Kanji questions).</li>
          <li>
            {learn.block
              ? 'No more new words today: too many items are due.'
              : `${learn.newToday} new ${learn.newToday === 1 ? 'word' : 'words'} left today.`}
          </li>
          {daysToFinish !== null && <li>{learn.wordsLeft} words left on your path: about {daysToFinish} more days at this pace.</li>}
        </ul>
      </section>
      <SettingsForm newPerDay={newPerDay} limits={limits} />

      <section aria-labelledby="account-title" className="mt-6 max-w-2xl rounded-3xl border border-border bg-card p-6">
        <h2 id="account-title" className="font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{user.username ?? 'unknown user'}</span>
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button type="submit" className={actionButton({ variant: 'secondary', size: 'md' })}>
            Sign out
          </button>
        </form>
      </section>
    </>
  )
}
