'use client'

// V10 — Phần dùng chung của Library: lưu thao tác kèm Undo, ô chọn, nút cho cả unit.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { actionButton } from '@/components/action-button'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

/** Thông báo sau khi đánh dấu, kèm nút Undo. */
export interface UndoNotice {
  message: string
  undo: () => Promise<{ status: string }>
  confirm?: string
}

/** Lưu một thao tác rồi tải lại dữ liệu trang; lỗi thì báo. */
export function useSave() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [notice, setNotice] = useState<UndoNotice | null>(null)
  const run = (save: () => Promise<{ status: string }>, after?: UndoNotice) => {
    setError(null)
    startSaving(async () => {
      try {
        const res = await save()
        if (res.status !== 'saved') throw new Error(res.status)
        setNotice(after ?? null)
        router.refresh()
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }
  const undo = () => {
    if (!notice) return
    if (notice.confirm && !window.confirm(notice.confirm)) return
    const { undo: action } = notice
    run(action)
  }
  return { run, saving, error, notice, undo, dismiss: () => setNotice(null) }
}

export function UndoBar({ notice, onUndo, onDismiss, saving }: { notice: UndoNotice | null; onUndo: () => void; onDismiss: () => void; saving: boolean }) {
  if (!notice) return null
  return (
    <div role="status" className="sticky bottom-4 z-30 mx-auto mt-4 flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card p-3 shadow-lg">
      <p className="text-sm">{notice.message}</p>
      <span className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onUndo} disabled={saving} className={actionButton({ size: 'sm', variant: 'secondary' })}>
          Undo
        </button>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
          <X className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  )
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-sm text-subtle">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

/** Hai nút áp cho cả một unit. */
export function UnitActions({ unit, count, onLearned, onKnown, saving }: { unit: string; count: number; onLearned: () => void; onKnown: () => void; saving: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
      <span className="mr-auto text-sm text-subtle">
        {unit} · {count} {count === 1 ? 'item' : 'items'}
      </span>
      <button type="button" disabled={saving || count === 0} onClick={onLearned} className={actionButton({ size: 'sm' })}>
        Move unit to Reviewing (It still can be reviewed)
      </button>
      <button type="button" disabled={saving || count === 0} onClick={onKnown} className={actionButton({ size: 'sm', variant: 'secondary' })}>
        Mark unit as learned (Not review)
      </button>
    </div>
  )
}

