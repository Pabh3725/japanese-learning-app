import { PageHeader } from '@/components/page-header'
import { SettingsForm } from '@/components/settings/settings-form'
import { V12SettingsFields } from '@/components/v12/v12-settings'
import { actionButton } from '@/components/action-button'
import { requireUser } from '@/lib/dal/auth'
import { getGrammarOverview } from '@/lib/dal/grammar'
import { getGrammarFurigana, getStudyLimits } from '@/lib/dal/settings'
import { getHub } from '@/lib/dal/v12/deck'
import { getV12Settings } from '@/lib/dal/v12/settings'
import { GRAMMAR_V1 } from '@/lib/grammar/rules'
import { addStudyDays, studyDate } from '@/lib/learning/time'

/** Ước lượng thời gian mỗi câu hoặc thẻ. */
const SECONDS_PER_ITEM = 15

export default async function SettingsPage() {
  const [user, limits, hub, furigana, grammar, v12] = await Promise.all([requireUser(), getStudyLimits(), getHub(), getGrammarFurigana(), getGrammarOverview(), getV12Settings()])
  const learnCards = hub.zones.reduce((n, z) => n + z.newItems + z.stageQuestions + z.reviews, 0)
  // Ngữ pháp: mẫu mới và mẫu đang học mỗi buổi 8 câu, mẫu ôn 2–3 câu
  const grammarQuestions = (grammar.today.newLeft + grammar.today.learningDue) * GRAMMAR_V1.learning.questionsPerSitting + grammar.today.reviewDue * 3
  const minutes = Math.ceil(((learnCards + grammarQuestions) * SECONDS_PER_ITEM) / 60)
  const minDate = addStudyDays(studyDate(new Date()), 1)

  return (
    <>
      <PageHeader eyebrow="設定" title="Settings" description="Tune your study experience." />
      <section aria-labelledby="estimate-title" className="mb-6 max-w-2xl rounded-3xl border border-border bg-card p-6">
        <h2 id="estimate-title" className="font-semibold">With your current settings</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-subtle">
          <li>
            About {minutes} {minutes === 1 ? 'minute' : 'minutes'} of study left today ({learnCards} Learn cards, about {grammarQuestions} grammar questions).
          </li>
          {hub.balance && (
            <li>
              Kana vocabulary, Kanji and Kanji words all finish N{hub.level} in about {hub.balance.days} days at {hub.balance.today.kana + hub.balance.today.kanji + hub.balance.today.word_kanji} new items a day (about {hub.balance.minutes} min of study a day once reviews settle in).
            </li>
          )}
        </ul>
      </section>
      <SettingsForm limits={limits} furigana={furigana} v12Slot={<V12SettingsFields s={v12} minDate={minDate} estimate={hub.balance && { ...hub.balance, level: hub.level }} />}
        grammarBalance={{
          on: grammar.settings.balanceOn,
          target: grammar.settings.balanceTarget,
          minutes: grammar.settings.balanceMinutes,
          date: grammar.settings.balanceDate,
          minDate,
          today: grammar.settings.balance && { perDay: grammar.settings.newPerDay, level: grammar.settings.balance.level, finishDate: grammar.settings.balance.finishDate },
        }}
      />

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
