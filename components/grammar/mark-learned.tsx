'use client'

// Đánh dấu mẫu ngữ pháp đã học: chọn có ôn (Card ôn từ ngày mai) hoặc không ôn (lưu trữ, khôi phục được).
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markGrammarLearnedAction } from '@/app/grammar/actions'
import { actionButton } from '@/components/action-button'
import { cn } from '@/lib/utils'

export function MarkGrammarLearned({ codes, label, className }: { codes: string[]; label: string; className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [review, setReview] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(actionButton({ size: 'sm', variant: 'secondary' }), className)}>
        {label}
      </button>
    )
  }
  const save = () =>
    start(async () => {
      setError(null)
      const res = await markGrammarLearnedAction({ codes, review })
      if (res.status !== 'saved') return setError("Couldn't save. Try again.")
      setOpen(false)
      router.refresh()
    })
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-4', className)}>
      <p className="text-sm">
        {codes.length === 1 ? 'This pattern' : `These ${codes.length} patterns`} will count as learned and leave Learn.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="size-4 accent-[var(--primary)]" />
        Also review {codes.length === 1 ? 'it' : 'them'} (first review tomorrow)
      </label>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy} className={actionButton({ size: 'sm' })}>{busy ? 'Saving…' : 'Mark as learned'}</button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className={actionButton({ size: 'sm', variant: 'ghost' })}>Cancel</button>
      </div>
    </div>
  )
}

/** Mẫu đã học: bật/tắt ôn (lưu trữ). */
export function GrammarReviewToggle({ code, archived }: { code: string; archived: boolean }) {
  const router = useRouter()
  const [busy, start] = useTransition()
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => start(async () => { await markGrammarLearnedAction({ codes: [code], review: archived }); router.refresh() })}
      className={actionButton({ size: 'sm', variant: 'secondary' })}
    >
      {busy ? 'Saving…' : archived ? 'Add back to review' : 'Stop reviewing'}
    </button>
  )
}
