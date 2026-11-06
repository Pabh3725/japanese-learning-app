'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actionButton } from '@/components/action-button'
import { withRetry } from '@/lib/retry'

interface RelearnButtonProps {
  label: string
  /** Có thì phải xác nhận trước, vì việc này đổi điểm. */
  confirm?: string
  action: () => Promise<{ status: string }>
}

export function RelearnButton({ label, confirm, action }: RelearnButtonProps) {
  const router = useRouter()
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const run = () => {
    setAsking(false)
    setError(null)
    startSaving(async () => {
      try {
        const { status } = await withRetry(action)
        if (status !== 'saved') throw new Error(status)
        router.refresh()
      } catch {
        setError("Couldn't save. Check your connection and try again.")
      }
    })
  }

  if (asking) {
    return (
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        <p className="text-sm text-subtle">{confirm}</p>
        <button type="button" onClick={run} className={actionButton({ variant: 'secondary', size: 'sm' })}>Confirm</button>
        <button type="button" onClick={() => setAsking(false)} className={actionButton({ variant: 'ghost', size: 'sm' })}>Cancel</button>
      </div>
    )
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" onClick={confirm ? () => setAsking(true) : run} disabled={saving} className={actionButton({ variant: 'ghost', size: 'sm' })}>
        {label}
      </button>
      {error && <span role="alert" className="text-xs text-error">{error}</span>}
    </span>
  )
}
