import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StageTrackProps {
  stages: string[]
  current: number
  completed: Set<number>
  onSelect: (stage: number) => void
}

/** Lets the learner jump between the stages of the current item. */
export function StageTrack({ stages, current, completed, onSelect }: StageTrackProps) {
  return (
    <nav aria-label="Learning stages" className="mx-auto w-full max-w-2xl px-4 pt-3">
      <ol className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {stages.map((stage, i) => {
          const isCurrent = i === current
          const isDone = completed.has(i)
          return (
            <li key={stage} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-150',
                  isCurrent && 'bg-primary/15 text-primary',
                  !isCurrent && isDone && 'text-success hover:bg-secondary',
                  !isCurrent && !isDone && 'text-muted-foreground hover:bg-secondary hover:text-subtle',
                )}
              >
                {isDone && !isCurrent ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
                <span className={cn(!isCurrent && 'hidden md:inline')}>{stage}</span>
                {!isCurrent && <span className="sr-only md:hidden">{stage}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
