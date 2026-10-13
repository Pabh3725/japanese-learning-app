'use client'

import { RotateCw } from 'lucide-react'
import { jpSizeClass } from '@/lib/learning-engine'
import type { VocabItem } from '@/lib/types'
import { cn } from '@/lib/utils'

interface JapaneseFlashcardProps {
  vocab: VocabItem
  flipped: boolean
  onFlip: () => void
}

export function JapaneseFlashcard({ vocab, flipped, onFlip }: JapaneseFlashcardProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={flipped ? 'Show front of card' : 'Reveal reading and meaning'}
      className="group w-full max-w-md perspective-[1400px] outline-none"
    >
      <div
        className={cn(
          'relative h-[380px] w-full transition-transform duration-500 ease-out transform-3d md:h-[440px]',
          flipped && 'rotate-y-180',
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-3xl border border-border bg-card backface-hidden group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
          <span className="rounded-full bg-cyan/12 px-3 py-1 text-xs font-medium text-cyan">New word · {vocab.jlpt}</span>
          <p lang="ja" className={cn('font-jp leading-none font-medium', jpSizeClass(vocab.word, 'vocab'))}>
            {vocab.word}
          </p>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <RotateCw className="size-4" aria-hidden="true" />
            Tap to reveal
          </span>
        </div>

        <div className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-5 rounded-3xl border border-primary/30 bg-card px-6 backface-hidden">
          <p lang="ja" className="font-jp text-[64px] leading-none font-medium md:text-[72px]">
            {vocab.word}
          </p>
          <p lang="ja" className="font-jp text-[32px] text-cyan md:text-[36px]">
            {vocab.kana}
          </p>
          <div className="h-px w-16 bg-border" />
          <p className="text-[24px] font-semibold md:text-[28px]">{vocab.meaning}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="rounded-full bg-yellow/12 px-3 py-1 font-medium tracking-wide text-yellow">{vocab.hanViet}</span>
            <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{vocab.romaji}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
