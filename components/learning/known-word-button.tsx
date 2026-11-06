'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { markWordsKnownAction, unmarkWordsKnownAction } from '@/app/learn/actions'
import { isShortcutEvent } from '@/lib/keyboard'
import { withRetry } from '@/lib/retry'

const KNOWN_KEY = 'k'
const SAVE_ERROR = "Couldn't save. Check your connection and try again."

/**
 * Nút "đã biết từ này" (phím K). Bấm là bỏ từ khỏi phiên ngay, không hỏi lại vì có nút Undo,
 * và khôi phục được trong Library. `vocabularyId` null thì chỉ còn hiện thông báo Undo của lần trước.
 */
export function KnownWordBar({ vocabularyId, onKnown }: { vocabularyId: string | null; onKnown: (vocabularyId: string) => void }) {
  const [last, setLast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mark = () => {
    if (!vocabularyId) return
    const id = vocabularyId
    setError(null)
    setLast(id)
    onKnown(id)
    withRetry(() => markWordsKnownAction([id])).catch(() => {
      setLast(null)
      setError(SAVE_ERROR)
    })
  }

  const undo = () => {
    if (!last) return
    const id = last
    setLast(null)
    unmarkWordsKnownAction([id]).catch(() => setError(SAVE_ERROR))
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (isShortcutEvent(e) && e.key.toLowerCase() === KNOWN_KEY) mark()
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="mx-auto flex min-h-8 w-full max-w-2xl flex-wrap items-center justify-end gap-3 px-4 pt-2 text-sm">
      {error && <p role="alert" className="mr-auto text-error">{error}</p>}
      {last && (
        <p role="status" className="mr-auto text-muted-foreground">
          Removed from your path.{' '}
          <button type="button" onClick={undo} className="font-medium text-primary underline-offset-2 hover:underline">Undo</button>
        </p>
      )}
      {vocabularyId && (
        <button type="button" onClick={mark} title="Remove this word from your path (K)" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          I already know this
        </button>
      )}
    </div>
  )
}
