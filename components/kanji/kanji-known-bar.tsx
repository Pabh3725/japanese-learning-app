'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { setKanjiKnownAction } from '@/app/learn/kanji/actions'
import { KanjiStarButton } from '@/components/kanji/kanji-star-button'
import { isShortcutEvent } from '@/lib/keyboard'
import { withRetry } from '@/lib/retry'

const KNOWN_KEY = 'k'
const SAVE_ERROR = "Couldn't save. Check your connection and try again."

/** Nút "đã biết chữ này" (phím K). Bấm là bỏ chữ khỏi phiên ngay, có Undo và khôi phục được trong Library. */
export function KanjiKnownBar({ kanjiId, onKnown }: { kanjiId: string | null; onKnown: (kanjiId: string) => void }) {
  const [last, setLast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mark = () => {
    if (!kanjiId) return
    const id = kanjiId
    setError(null)
    setLast(id)
    onKnown(id)
    withRetry(() => setKanjiKnownAction(id, true)).catch(() => {
      setLast(null)
      setError(SAVE_ERROR)
    })
  }

  const undo = () => {
    if (!last) return
    const id = last
    setLast(null)
    setKanjiKnownAction(id, false).catch(() => setError(SAVE_ERROR))
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
          Marked as learned.{' '}
          <button type="button" onClick={undo} className="font-medium text-primary underline-offset-2 hover:underline">Undo</button>
        </p>
      )}
      {kanjiId && (
        <>
          {/* V10: gắn sao chữ ngay trong lúc học (cần StarredKanjiProvider ở trang) */}
          <KanjiStarButton kanjiId={kanjiId} className="size-8" />
          <button type="button" onClick={mark} title="Remove this Kanji from your list (K)" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Learned · no review
          </button>
        </>
      )}
    </div>
  )
}
