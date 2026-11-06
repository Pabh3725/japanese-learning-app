'use client'

import { useEffect, useEffectEvent, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { cn } from '@/lib/utils'

export type CheckStatus = 'idle' | 'correct' | 'incorrect'

/** Câu nhắc khi trả lời sai ở các màn học thật. */
export const WRONG_ANSWER_NOTE = 'Hãy đọc lại 5 lần để nhớ từ nha'

/**
 * Enter hoặc Space bấm nút chính của màn hình, dù con trỏ đang ở đâu.
 * Đang focus đúng nút đó thì để trình duyệt tự bấm, tránh bấm hai lần. Giữ phím không tính, để phím Enter
 * vừa dùng nộp bài không trôi sang câu sau.
 */
function useContinueKeys(enabled: boolean, onPress: () => void, buttonRef: React.RefObject<HTMLButtonElement | null>) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!enabled || e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    if (e.target === buttonRef.current || e.target instanceof HTMLAnchorElement) return
    // Ô nhập còn đang sửa được thì Space là gõ chữ, Enter là nộp bài
    if (e.target instanceof HTMLInputElement && !e.target.readOnly) return
    e.preventDefault()
    onPress()
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

export function ContinueFooter({
  label,
  onClick,
  disabled,
  hint,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  hint?: string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  useContinueKeys(!disabled, onClick, buttonRef)

  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-between md:py-6">
        <p className="text-sm text-muted-foreground md:min-h-0">{hint}</p>
        <button ref={buttonRef} type="button" onClick={onClick} disabled={disabled} className={cn(actionButton({ size: 'lg' }), 'w-full md:w-48')}>
          {label}
        </button>
      </div>
    </div>
  )
}

interface ExerciseFooterProps {
  status: CheckStatus
  canCheck: boolean
  onCheck: () => void
  onContinue: () => void
  correctAnswer?: string
  explanation?: string
  /** Chỉ hiện khi trả lời sai. */
  wrongNote?: string
  checkLabel?: string
  secondary?: React.ReactNode
}

export function ExerciseFooter({
  status,
  canCheck,
  onCheck,
  onContinue,
  correctAnswer,
  explanation,
  wrongNote,
  checkLabel = 'Check',
  secondary,
}: ExerciseFooterProps) {
  const checked = status !== 'idle'
  const continueRef = useRef<HTMLButtonElement>(null)
  useContinueKeys(checked, onContinue, continueRef)
  return (
    <div
      className={cn(
        'border-t transition-colors duration-200',
        status === 'idle' && 'border-border bg-background',
        status === 'correct' && 'border-success/30 bg-[#132119]',
        status === 'incorrect' && 'border-error/30 bg-[#221416]',
      )}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-between md:py-6">
        <div aria-live="polite" className="min-h-0 md:min-h-12">
          {checked && (
            <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
              {status === 'correct' ? (
                <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <XCircle className="mt-0.5 size-6 shrink-0 text-error" aria-hidden="true" />
              )}
              <div>
                <p className={cn('font-semibold', status === 'correct' ? 'text-success' : 'text-error')}>
                  {status === 'correct' ? 'Correct!' : 'Not quite'}
                </p>
                {status === 'incorrect' && correctAnswer && (
                  <p className="mt-0.5 text-sm text-subtle">
                    Answer: <span lang="ja" className="font-jp text-base text-foreground">{correctAnswer}</span>
                  </p>
                )}
                {status === 'incorrect' && wrongNote && <p className="mt-1 text-sm font-medium text-yellow">{wrongNote}</p>}
                {explanation && <p className="mt-0.5 text-sm text-muted-foreground">{explanation}</p>}
              </div>
            </div>
          )}
          {!checked && secondary}
        </div>
        {checked ? (
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            autoFocus
            className={cn(actionButton({ size: 'lg', variant: status === 'correct' ? 'success' : 'primary' }), 'w-full md:w-48')}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={onCheck}
            disabled={!canCheck}
            className={cn(actionButton({ size: 'lg' }), 'w-full md:w-48')}
          >
            {checkLabel}
          </button>
        )}
      </div>
    </div>
  )
}
