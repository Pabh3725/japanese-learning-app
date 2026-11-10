'use client'

import { useState } from 'react'
import { archiveCardAction, restoreCardAction } from '@/app/review/actions'
import { withRetry } from '@/lib/retry'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

/**
 * Nút "Đã học xong" (R13): lưu trữ riêng Card đang ôn, bỏ Card khỏi phiên ngay và có Undo.
 * Card khác của từ và chữ thành phần không đổi. Khôi phục được ở /review/archive.
 */
export function ArchiveCardBar({ kind, cardId, onArchived }: { kind: 'vocab' | 'kanji'; cardId: string | null; onArchived: (cardId: string) => void }) {
  const [last, setLast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const archive = () => {
    if (!cardId) return
    const id = cardId
    setError(null)
    setLast(id)
    onArchived(id)
    const eventId = crypto.randomUUID()
    withRetry(() => archiveCardAction(kind, id, eventId)).catch(() => {
      setLast(null)
      setError(SAVE_ERROR)
    })
  }

  const undo = () => {
    if (!last) return
    const id = last
    setLast(null)
    const eventId = crypto.randomUUID()
    withRetry(() => restoreCardAction(kind, id, 'keep', eventId)).catch(() => setError(SAVE_ERROR))
  }

  if (!cardId && !last && !error) return null
  return (
    <div className="mx-auto flex min-h-7 w-full max-w-2xl flex-wrap items-center justify-end gap-3 px-4 text-sm">
      {error && <p role="alert" className="mr-auto text-error">{error}</p>}
      {last && (
        <p role="status" className="mr-auto text-muted-foreground">
          Card archived.{' '}
          <button type="button" onClick={undo} className="font-medium text-primary underline-offset-2 hover:underline">Undo</button>
        </p>
      )}
      {cardId && (
        <button type="button" onClick={archive} title="Stop reviewing this card. You can bring it back from the archive." className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          I&apos;ve learned this card
        </button>
      )}
    </div>
  )
}
