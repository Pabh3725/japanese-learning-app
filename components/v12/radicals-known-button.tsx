'use client'

// Nút "đã biết cả nhóm" của bộ thủ (chủ dự án chốt 2026-11-19): bỏ qua cả 100 bộ, chữ Kanji mở ngay; bấm lại để học bộ thủ.
import { useState, useTransition } from 'react'
import { markRadicalsKnownAction } from '@/app/learn/v12/actions'

export function RadicalsKnownButton({ total, known }: { total: number; known: number }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const allKnown = known >= total
  const save = (value: boolean) =>
    start(async () => {
      setError(null)
      try {
        const { status } = await markRadicalsKnownAction(value)
        if (status !== 'saved') throw new Error(status)
        setConfirming(false)
      } catch {
        setError("Couldn't save. Check your connection and try again.")
      }
    })

  return (
    <div className="mt-3 text-xs text-muted-foreground">
      {allKnown ? (
        <p>
          All {total} radicals marked as known.{' '}
          <button type="button" disabled={busy} onClick={() => save(false)} className="font-medium text-primary underline-offset-2 hover:underline">
            Learn them again
          </button>
        </p>
      ) : confirming ? (
        <p>
          Skip all {total} radicals and go straight to Kanji?{' '}
          <button type="button" disabled={busy} onClick={() => save(true)} className="font-medium text-primary underline-offset-2 hover:underline">
            Yes, I know them
          </button>{' '}
          ·{' '}
          <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="underline-offset-2 hover:underline">
            Cancel
          </button>
        </p>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="underline-offset-2 hover:text-foreground hover:underline">
          I already know the radicals
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-error">{error}</p>}
    </div>
  )
}
