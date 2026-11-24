'use client'

// Số bộ thủ mới mỗi ngày ở bộ thẻ bộ thủ (phần More của Vocab).
import { useId } from 'react'
import { useRouter } from 'next/navigation'
import { saveV12SettingAction } from '@/app/learn/v12/actions'
import { NumberBox, useNumberField } from '@/components/settings/settings-form'

export function RadicalsPace({ initial }: { initial: number }) {
  const id = useId()
  const router = useRouter()
  const field = useNumberField(initial, 0, 30, async (value) => {
    const res = await saveV12SettingAction('v12_new_radical', value)
    router.refresh()
    return res
  })
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-medium">New radicals a day</label>
        <p className="text-sm text-muted-foreground">0 pauses new radicals. Changes apply from tomorrow if you already started today.</p>
        {field.error && <p role="alert" className="mt-1 text-sm text-error">{field.error}</p>}
      </div>
      <NumberBox id={id} min={0} max={30} field={field} className="w-full sm:w-28" />
    </div>
  )
}
