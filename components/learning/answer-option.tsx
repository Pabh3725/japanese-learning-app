import { Check, X } from 'lucide-react'
import type { DisplayKind } from '@/lib/types'
import { cn } from '@/lib/utils'

export type AnswerState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'dimmed'

interface AnswerOptionProps {
  label: string
  kind: DisplayKind
  state: AnswerState
  index: number
  disabled?: boolean
  onSelect: () => void
}

export function AnswerOption({ label, kind, state, index, disabled, onSelect }: AnswerOptionProps) {
  const isJapanese = kind !== 'meaning'
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={state === 'selected'}
      className={cn(
        'group relative flex min-h-16 w-full items-center justify-center rounded-2xl border-2 px-4 py-3 text-center transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        state === 'idle' && 'border-border bg-card hover:border-[#3b4250] hover:bg-secondary active:scale-[0.98]',
        state === 'selected' && 'border-primary bg-primary/10',
        state === 'correct' && 'animate-pop border-success bg-success/10',
        state === 'incorrect' && 'animate-shake border-error bg-error/10',
        state === 'dimmed' && 'border-border bg-card opacity-40',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 left-3 hidden size-6 -translate-y-1/2 items-center justify-center rounded-md border text-[11px] text-muted-foreground md:flex',
          state === 'selected' ? 'border-primary/50 text-primary' : 'border-border',
        )}
        aria-hidden="true"
      >
        {state === 'correct' ? <Check className="size-3.5 text-success" /> : state === 'incorrect' ? <X className="size-3.5 text-error" /> : index + 1}
      </span>
      <span
        lang={isJapanese ? 'ja' : undefined}
        className={cn(
          isJapanese ? 'font-jp' : 'font-medium',
          kind === 'kana' && 'text-[26px] md:text-[28px]',
          kind === 'vocab' && 'text-[28px]',
          kind === 'kanji' && 'text-[32px]',
          kind === 'meaning' && 'text-[20px] md:text-[22px]',
        )}
      >
        {label}
      </span>
    </button>
  )
}
