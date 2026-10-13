import { jpSizeClass } from '@/lib/learning-engine'
import type { ReviewCard } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ReviewCardView({ card, revealed }: { card: ReviewCard; revealed: boolean }) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p lang="ja" className={cn('font-jp leading-none font-medium transition-transform duration-300', jpSizeClass(card.front, card.kind), revealed && 'scale-90')}>
        {card.front}
      </p>

      {!revealed ? (
        <p className="mt-10 max-w-xs text-pretty text-subtle">{card.question}</p>
      ) : (
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300" aria-live="polite">
          <div className="h-px w-16 bg-border" />
          <p
            lang={card.kind === 'vocab' ? 'ja' : undefined}
            className={cn(
              'font-semibold',
              card.kind === 'vocab' ? 'font-jp text-[32px] text-cyan md:text-[36px]' : 'text-[28px] tracking-wider text-yellow',
            )}
          >
            {card.answer}
          </p>
          <p className="text-[22px] font-medium">{card.detail}</p>
          {card.reading && (
            <p lang="ja" className="font-jp text-sm text-muted-foreground">
              {card.reading}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
