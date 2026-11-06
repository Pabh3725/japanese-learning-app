'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restartStarRoundAction } from '@/app/learn/actions'
import { actionButton } from '@/components/action-button'

/** Đã xong vòng học thêm mà vẫn muốn luyện: bắt đầu vòng mới. Chỉ đặt lại số câu, không đổi điểm và lịch. */
export function NewStarRoundButton() {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [saving, startSaving] = useTransition()

  const start = () => {
    setError(false)
    startSaving(async () => {
      try {
        const { status } = await restartStarRoundAction()
        if (status !== 'saved') throw new Error(status)
        router.push('/learn/starred/session')
      } catch {
        setError(true)
      }
    })
  }

  return (
    <div>
      <button type="button" onClick={start} disabled={saving} className={actionButton({ size: 'lg' })}>
        Start a new round
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-error">Couldn&apos;t start. Check your connection and try again.</p>}
    </div>
  )
}
