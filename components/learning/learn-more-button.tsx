'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { borrowNewWordsAction } from '@/app/learn/actions'
import { actionButton } from '@/components/action-button'

/** "Học thêm": mượn từ mới của ngày mai, nên ngày mai sẽ có ít từ mới hơn tương ứng. */
export function LearnMoreButton({ count }: { count: number }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const borrow = () => {
    setError(null)
    startSaving(async () => {
      try {
        const { status } = await borrowNewWordsAction(count)
        if (status !== 'saved') throw new Error(status)
        router.push('/learn/lesson')
      } catch {
        setError("Couldn't start. Check your connection and try again.")
      }
    })
  }

  return (
    <div>
      <button type="button" onClick={borrow} disabled={saving} className={actionButton({ variant: 'secondary', size: 'md' })}>
        Learn {count} more {count === 1 ? 'word' : 'words'}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">These come from tomorrow&apos;s new words.</p>
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
    </div>
  )
}
