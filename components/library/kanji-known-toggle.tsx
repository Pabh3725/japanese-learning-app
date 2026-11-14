'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setKanjiKnownAction } from '@/app/learn/kanji/actions'

/** Bỏ chữ khỏi khu Kanji, hoặc đưa trở lại với điểm và lịch còn nguyên. */
export function KanjiKnownToggle({ kanjiId, known }: { kanjiId: string; known: boolean }) {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [saving, startSaving] = useTransition()

  const toggle = () => {
    setError(false)
    startSaving(async () => {
      try {
        const { status } = await setKanjiKnownAction(kanjiId, !known)
        if (status !== 'saved') throw new Error(status)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  return (
    <div>
      <button type="button" onClick={toggle} disabled={saving} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        {known ? 'Put back in Kanji' : 'Mark as learned (Not review)'}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-error">Couldn&apos;t save.</p>}
    </div>
  )
}
