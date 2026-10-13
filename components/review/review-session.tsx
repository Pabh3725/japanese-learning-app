'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { actionButton } from '@/components/action-button'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { ReviewCardView } from '@/components/review/review-card-view'
import { ReviewRatingButtons } from '@/components/review/review-rating-buttons'
import type { ReviewCard, ReviewRating } from '@/lib/types'
import { cn } from '@/lib/utils'

const ratingKeys: Record<string, ReviewRating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }

export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [ratings, setRatings] = useState<ReviewRating[]>([])

  const done = index >= cards.length

  const rate = (rating: ReviewRating) => {
    setRatings((r) => [...r, rating])
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (done) return
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      setRevealed(true)
    } else if (revealed && ratingKeys[e.key]) {
      rate(ratingKeys[e.key])
    }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (done) {
    const remembered = ratings.filter((r) => r !== 'again').length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="Review done!"
          subtitle="Your memory is getting stronger every day."
          stats={[
            { label: 'Cards', value: String(cards.length), tone: 'text-cyan' },
            { label: 'Recalled', value: `${Math.round((remembered / cards.length) * 100)}%`, tone: 'text-success' },
            { label: 'Again', value: String(cards.length - remembered), tone: 'text-pink' },
          ]}
          primary={{ href: '/practice', label: 'Play a quick game' }}
          secondary={{ href: '/', label: 'Back to Home' }}
          onRestart={() => {
            setIndex(0)
            setRatings([])
          }}
        />
      </div>
    )
  }

  const card = cards[index]

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/review" label="Daily Review" sublabel={`${index + 1} / ${cards.length}`} current={index} total={cards.length} />

      <div key={card.id} className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 animate-in fade-in duration-200">
        <span className="mb-8 rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {card.kind === 'kanji' ? 'Kanji' : 'Vocabulary'}
        </span>
        <ReviewCardView card={card} revealed={revealed} />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-2xl px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:py-6">
          {revealed ? (
            <div className="animate-in fade-in duration-200">
              <ReviewRatingButtons onRate={rate} />
            </div>
          ) : (
            <button type="button" onClick={() => setRevealed(true)} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
              Show Answer
              <kbd className="hidden rounded-md bg-black/15 px-1.5 py-0.5 font-sans text-xs md:inline">Space</kbd>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
