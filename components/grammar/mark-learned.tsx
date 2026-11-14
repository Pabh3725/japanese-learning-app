'use client'

// Đưa mẫu ngữ pháp ra khỏi Learn: Move to Reviewing (ôn từ ngày mai) hoặc Mark as learned (không ôn, khôi phục được).
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markGrammarLearnedAction } from '@/app/grammar/actions'
import { actionButton } from '@/components/action-button'
import { cn } from '@/lib/utils'

export function MarkGrammarLearned({ codes, label, className }: { codes: string[]; label: string; className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(actionButton({ size: 'sm', variant: 'secondary' }), className)}>
        {label}
      </button>
    )
  }
  const save = (review: boolean) =>
    start(async () => {
      setError(null)
      const res = await markGrammarLearnedAction({ codes, review })
      if (res.status !== 'saved') return setError("Couldn't save. Try again.")
      setOpen(false)
      router.refresh()
    })
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-4', className)}>
      <p className="text-sm">{codes.length === 1 ? 'This pattern' : `These ${codes.length} patterns`} will leave Learn.</p>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => save(true)} disabled={busy} className={actionButton({ size: 'sm' })}>Move to Reviewing (It still can be reviewed)</button>
        <button type="button" onClick={() => save(false)} disabled={busy} className={actionButton({ size: 'sm', variant: 'secondary' })}>Mark as learned (Not review)</button>
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
      {busy ? 'Saving…' : archived ? 'Move back to Reviewing' : 'Mark as learned (Not review)'}
    </button>
  )
}
