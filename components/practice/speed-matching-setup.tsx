'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { SpeedMatchingGame } from '@/components/practice/speed-matching-game'
import { CARD_LABELS } from '@/lib/learning/card-labels'
import { RULES_V4 } from '@/lib/learning/rules'
import { MIN_SPEED_WORDS, type SpeedMode, type SpeedModeData } from '@/lib/speed-matching'
import { cn } from '@/lib/utils'

const SECONDS = 60

const MODE_NOTES: Record<SpeedMode, string> = {
  mixed: 'Every word you have met, in Kana or Kanji depending on how far you have learned it.',
  'vocab.meaning_kana': 'Match each Kana word with its meaning.',
  'vocab.meaning_kanji': 'Match each Kanji word with its meaning.',
  'vocab.kana_hanviet': 'Match each Kana word with its Sino-Vietnamese reading.',
  'vocab.meaning_hanviet': 'Match each Sino-Vietnamese reading with its meaning.',
  'vocab.kanji_meaning_hanviet': 'Match each Kanji word with its meaning and Sino-Vietnamese reading.',
}

/** Chọn loại Card trước khi chơi. Chỉ loại Card đó nhận điểm. */
export function SpeedMatchingSetup({ modes }: { modes: SpeedModeData[] }) {
  const [choice, setChoice] = useState<SpeedMode>('mixed')
  const [playing, setPlaying] = useState(false)
  const chosen = modes.find((m) => m.mode === choice)!

  if (playing) {
    return <SpeedMatchingGame key={choice} words={chosen.words} mode={choice} seconds={SECONDS} onChangeMode={() => setPlaying(false)} />
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <Link href="/practice" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Arena
      </Link>
      <div>
        <h1 className="text-3xl font-semibold">Speed Matching</h1>
        <p className="mt-2 text-subtle">
          Clear as many 4×4 boards as you can in {SECONDS} seconds. Correct pairs add a point to that word&apos;s review card, up to {RULES_V4.practice.maxPositivePerCardPerDay} a day; wrong pairs take one from both words. Your review schedule and stage points don&apos;t change.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Choose what to practice</legend>
        {modes.map(({ mode, total }) => {
          const locked = total < MIN_SPEED_WORDS
          return (
            <label
              key={mode}
              className={cn(
                'flex items-start gap-3 rounded-2xl border bg-card p-4 transition-colors',
                locked ? 'cursor-not-allowed border-border opacity-60' : 'cursor-pointer hover:border-[#3b4250]',
                choice === mode ? 'border-primary' : 'border-border',
              )}
            >
              <input type="radio" name="speed-mode" value={mode} checked={choice === mode} disabled={locked} onChange={() => setChoice(mode)} className="mt-1 accent-[var(--primary)]" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium">{mode === 'mixed' ? 'Mixed (recommended)' : CARD_LABELS[mode]}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{locked ? `${total} of ${MIN_SPEED_WORDS} words needed` : `${total} words`}</span>
                </span>
                <span className="mt-1 block text-sm text-subtle">{MODE_NOTES[mode]}</span>
              </span>
            </label>
          )
        })}
      </fieldset>

      <p className="text-sm text-muted-foreground">Cards you haven&apos;t reviewed for the longest time come first.</p>
      <button type="button" onClick={() => setPlaying(true)} className={actionButton({ size: 'lg' })}>
        Start
      </button>
    </div>
  )
}
