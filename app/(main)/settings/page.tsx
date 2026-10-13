import { PageHeader } from '@/components/page-header'
import { SettingsForm } from '@/components/settings/settings-form'

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="設定" title="Settings" description="Tune your study experience." />
      <SettingsForm />
    </>
  )
}
