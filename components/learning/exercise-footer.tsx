import { CheckCircle2, XCircle } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { cn } from '@/lib/utils'

export type CheckStatus = 'idle' | 'correct' | 'incorrect'

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
  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-between md:py-6">
        <p className="text-sm text-muted-foreground md:min-h-0">{hint}</p>
        <button type="button" onClick={onClick} disabled={disabled} className={cn(actionButton({ size: 'lg' }), 'w-full md:w-48')}>
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
  checkLabel = 'Check',
  secondary,
}: ExerciseFooterProps) {
  const checked = status !== 'idle'
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
                {explanation && <p className="mt-0.5 text-sm text-muted-foreground">{explanation}</p>}
              </div>
            </div>
          )}
          {!checked && secondary}
        </div>
        {checked ? (
          <button
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
