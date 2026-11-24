import { PageHeader } from '@/components/page-header'
import { SettingsForm, type GrammarPlan } from '@/components/settings/settings-form'
import { V12SettingsFields } from '@/components/v12/v12-settings'
import { actionButton } from '@/components/action-button'
import { requireUser } from '@/lib/dal/auth'
import { getGrammarOverview } from '@/lib/dal/grammar'
import { getGrammarFurigana, getStudyLimits } from '@/lib/dal/settings'
import { getHub, getRadicals } from '@/lib/dal/v12/deck'
import { getV12Settings } from '@/lib/dal/v12/settings'
import { secondsPerPattern } from '@/lib/grammar/balance'
import { addStudyDays, studyDate } from '@/lib/learning/time'

/** Mỗi mẫu học 5 buổi trong 8 ngày: mẫu cuối cùng xong Học sau chừng này ngày kể từ khi mở. */
const GRAMMAR_LEARNING_DAYS = 7

const around = (days: number) => new Date(`${addStudyDays(studyDate(new Date()), days)}T00:00:00+07:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Settings (chủ dự án chốt 2026-11-24): tự nhập số mục mới mỗi ngày của từng khu (bỏ cân bằng), có đề xuất và ước tính
// bao lâu nữa xong; Grammar tự nhập số mẫu mỗi ngày; trần mỗi ngày nằm ở Nâng cao.
export default async function SettingsPage() {
  const [user, limits, hub, furigana, grammar, v12, radicals] = await Promise.all([
    requireUser(),
    getStudyLimits(),
    getHub(),
    getGrammarFurigana(),
    getGrammarOverview(),
    getV12Settings(),
    getRadicals(),
  ])
  const remaining = { kana: 0, kanji: 0, word_kanji: 0 }
  for (const z of hub.zones) remaining[z.zone] = z.remaining
  // Ngữ pháp: cấp đang học = N5 nếu còn mẫu N5 chưa mở, không thì N4
  const unopened = (level: 'N5' | 'N4') => grammar.lessons.filter((l) => l.level === level).reduce((n, l) => n + l.points.filter((p) => p.status === 'new' || p.status === 'locked').length, 0)
  const grammarPlan: GrammarPlan = unopened('N5') > 0 ? { level: 'N5', remaining: unopened('N5') } : { level: 'N4', remaining: unopened('N4') }
  const grammarPerDay = limits.grammar_new_per_day
  const grammarDays = grammarPlan.remaining > 0 ? Math.ceil(grammarPlan.remaining / grammarPerDay) + GRAMMAR_LEARNING_DAYS : 0
  const grammarMinutes = Math.round((grammarPerDay * secondsPerPattern()) / 60)
  const level = hub.level ? `N${hub.level}` : 'This level'

  return (
    <>
      <PageHeader eyebrow="設定" title="Settings" description="Set how much new material you take on each day. Estimates update as you type." />
      <section aria-labelledby="plan-title" className="mb-6 max-w-2xl rounded-3xl border border-primary/40 bg-primary/5 p-6">
        <h2 id="plan-title" className="font-semibold">Your daily plan</h2>
        <p className="mt-1 text-sm text-subtle">About {hub.pace.minutes + grammarMinutes} min of study a day once reviews settle in.</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm">
          <li className="flex justify-between gap-3">
            <span className="text-subtle">
              Vocab: {hub.newPerDay.kana} Kana words · {hub.newPerDay.kanji} Kanji · {hub.newPerDay.word_kanji} Kanji words a day
            </span>
            <span className="shrink-0 tabular-nums">{hub.pace.total === null ? 'an area is paused' : hub.pace.total === 0 ? 'done' : `${level} in ~${hub.pace.total} days · ${around(hub.pace.total)}`}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span className="text-subtle">Grammar: {grammarPerDay} new {grammarPerDay === 1 ? 'pattern' : 'patterns'} a day</span>
            <span className="shrink-0 tabular-nums">{grammarDays === 0 ? 'done' : `${grammarPlan.level} in ~${grammarDays} days · ${around(grammarDays)}`}</span>
          </li>
        </ul>
      </section>
      <SettingsForm
        limits={limits}
        furigana={furigana}
        grammar={grammarPlan}
        v12Slot={<V12SettingsFields s={v12} plan={{ level: hub.level, remaining, seconds: hub.seconds }} radicalsPerDay={radicals.newPerDay} />}
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
