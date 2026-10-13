import { RATING_INTERVALS } from '@/lib/learning-engine'
import type { ReviewRating } from '@/lib/types'
import { cn } from '@/lib/utils'

const ratings: { value: ReviewRating; label: string; className: string }[] = [
  { value: 'again', label: 'Again', className: 'text-error hover:border-error/60 hover:bg-error/8' },
  { value: 'hard', label: 'Hard', className: 'text-yellow hover:border-yellow/60 hover:bg-yellow/8' },
  { value: 'good', label: 'Good', className: 'text-success hover:border-success/60 hover:bg-success/8' },
  { value: 'easy', label: 'Easy', className: 'text-cyan hover:border-cyan/60 hover:bg-cyan/8' },
]

export function ReviewRatingButtons({ onRate }: { onRate: (rating: ReviewRating) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3" role="group" aria-label="How well did you remember?">
      {ratings.map((r, i) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onRate(r.value)}
          className={cn(
            'flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-border bg-card transition-all duration-150 active:scale-[0.97] md:h-[72px]',
            r.className,
          )}
        >
          <span className="text-sm font-semibold md:text-base">{r.label}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {RATING_INTERVALS[r.value]}
            <span className="sr-only"> until next review</span>
            <kbd className="ml-1.5 hidden font-sans opacity-60 md:inline">{i + 1}</kbd>
          </span>
        </button>
      ))}
    </div>
  )
}
