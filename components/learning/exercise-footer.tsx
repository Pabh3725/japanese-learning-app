'use client'

import { Fragment, useEffect, useEffectEvent, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { SpeakerButton } from '@/components/learning/speaker-button'
import type { WordReveal } from '@/lib/exercise/stage-questions'
import type { TypingTip } from '@/lib/exercise/typing-tips'
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

/** Khi trả lời sai: hiện đủ thông tin của từ để đọc lại, kèm nút loa và phím P. */
function WordRevealCard({ reveal }: { reveal: WordReveal }) {
  const rows = [
    reveal.expression ? { label: 'Reading', value: reveal.kana, japanese: true } : null,
    reveal.romaji ? { label: 'Romaji', value: reveal.romaji, japanese: false } : null,
    reveal.hanViet ? { label: 'Sino-Vietnamese', value: reveal.hanViet, japanese: false } : null,
    { label: 'Meaning', value: reveal.meaning, japanese: false },
  ].filter((row) => row !== null)

  return (
    <div className="mt-2 rounded-2xl border border-border bg-background/50 p-3">
      <div className="flex items-center gap-3">
        <p lang="ja" className="font-jp text-2xl font-medium text-foreground">{reveal.expression ?? reveal.kana}</p>
        <SpeakerButton kana={reveal.kana} />
        <span className="hidden text-xs text-muted-foreground md:inline">Press P to listen</span>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map((row) => (
          <Fragment key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd lang={row.japanese ? 'ja' : undefined} className={cn('text-foreground', row.japanese && 'font-jp text-base')}>{row.value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  )
}

function TypingTipNote({ tip }: { tip: TypingTip }) {
  return (
    <div className="mt-2 text-sm text-subtle">
      <p>
        Mẹo gõ: <code className="font-sans font-semibold text-cyan">{tip.typed}</code>
      </p>
      {tip.rules.map((rule) => <p key={rule} className="mt-0.5 text-muted-foreground">{rule}</p>)}
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
  /** Có thì khi trả lời sai sẽ hiện đủ thông tin của từ, thay cho dòng đáp án. */
  reveal?: WordReveal
  /** Mẹo gõ của câu gõ Kana. */
  typingTip?: TypingTip
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
  reveal,
  typingTip,
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
                {status === 'incorrect' && reveal && <WordRevealCard reveal={reveal} />}
                {status === 'incorrect' && !reveal && correctAnswer && (
                  <p className="mt-0.5 text-sm text-subtle">
                    Answer: <span lang="ja" className="font-jp text-base text-foreground">{correctAnswer}</span>
                  </p>
                )}
                {status === 'incorrect' && wrongNote && <p className="mt-2 text-sm font-medium text-yellow">{wrongNote}</p>}
                {typingTip && <TypingTipNote tip={typingTip} />}
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
