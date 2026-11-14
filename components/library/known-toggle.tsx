'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markWordsKnownAction, unmarkWordsKnownAction } from '@/app/learn/actions'
import { actionButton } from '@/components/action-button'

/** Bỏ từ khỏi lộ trình, hoặc đưa trở lại với điểm và Card còn nguyên. */
export function KnownToggle({ vocabularyId, known }: { vocabularyId: string; known: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const toggle = () => {
    setError(null)
    startSaving(async () => {
      try {
        const save = known ? unmarkWordsKnownAction : markWordsKnownAction
        const { status } = await save([vocabularyId])
        if (status !== 'saved') throw new Error(status)
        router.refresh()
      } catch {
        setError("Couldn't save. Check your connection and try again.")
      }
    })
  }

  return (
    <div>
      <button type="button" onClick={toggle} disabled={saving} className={actionButton({ variant: 'secondary', size: 'sm' })}>
        {known ? 'Put back on my path' : 'Mark as learned (Not review)'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
    </div>
  )
}
