import { PageHeader } from '@/components/page-header'
import { SettingsForm } from '@/components/settings/settings-form'
import { actionButton } from '@/components/action-button'
import { requireUser } from '@/lib/dal/auth'
import { getNewPerDay, getStudyLimits } from '@/lib/dal/settings'

export default async function SettingsPage() {
  const [user, newPerDay, limits] = await Promise.all([requireUser(), getNewPerDay(), getStudyLimits()])

  return (
    <>
      <PageHeader eyebrow="設定" title="Settings" description="Tune your study experience." />
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
