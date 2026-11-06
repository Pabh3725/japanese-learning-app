'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import type { MatchPairType, MatchPenalty, MatchRoundData } from '@/lib/exercise/match-round'
import { isShortcutEvent, matchRightIndexForKey, matchRightKeyLabel, pieceIndexForKey, pieceKeyLabel } from '@/lib/keyboard'
import { speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

const BOSS_SECONDS = 30

const TITLES: Record<MatchPairType, string> = {
  kana_meaning: 'Match each word with its meaning',
  kanji_meaning: 'Match each Kanji word with its meaning',
  kanji_kana: 'Match each Kanji word with its reading',
  kanji_hanviet: 'Match each Kanji word with its Sino-Vietnamese reading',
}

const RIGHT_IS_JAPANESE: Record<MatchPairType, boolean> = {
  kana_meaning: false,
  kanji_meaning: false,
  kanji_kana: true,
  kanji_hanviet: false,
}

function Tile({
  shortcut,
  label,
  japanese,
  selected,
  done,
  wrong,
  onClick,
}: {
  shortcut: string | null
  label: string
  japanese: boolean
  selected: boolean
  done: boolean
  wrong: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      aria-pressed={selected}
      className={cn(
        'relative flex min-h-16 w-full items-center justify-center rounded-2xl border-2 bg-card px-2 py-2 text-center transition-all duration-150 active:scale-[0.97]',
        japanese ? 'font-jp text-xl md:text-2xl' : 'text-sm font-medium md:text-base',
        !done && !selected && !wrong && 'border-border shadow-[0_3px_0_0_#2e3440] hover:border-[#3b4250]',
        !done && selected && !wrong && 'border-cyan bg-cyan/10',
        done && 'border-success/40 bg-success/10 opacity-50',
        wrong && 'animate-shake border-error bg-error/10',
      )}
    >
      <span className="absolute top-1 left-2 hidden font-sans text-[10px] font-medium text-muted-foreground md:block" aria-hidden="true">
        {shortcut}
      </span>
      <span lang={japanese ? 'ja' : undefined} className="wrap-anywhere">{label}</span>
    </button>
  )
}

interface MatchRoundExerciseProps {
  round: MatchRoundData
  /** Gọi một lần khi bấm Continue, với các từ ở cột trái đã bị ghép sai. */
  onDone: (penalties: MatchPenalty[]) => void
}

export function MatchRoundExercise({ round, onDone }: MatchRoundExerciseProps) {
  const [left, setLeft] = useState<number | null>(null)
  const [right, setRight] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(() => new Set())
  const [missed, setMissed] = useState<Set<number>>(() => new Set())
  const [flash, setFlash] = useState<{ left: number; right: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const allMatched = matched.size === round.pairs.length
  const [secondsLeft, setSecondsLeft] = useState(BOSS_SECONDS)
  const timedOut = round.boss === true && secondsLeft === 0
  const finished = allMatched || timedOut

  useEffect(() => {
    if (!round.boss || finished) return
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [round.boss, finished])

  const attempt = (l: number, r: number) => {
    setLeft(null)
    setRight(null)
    if (l === r) {
      setMatched((set) => new Set(set).add(l))
      speak(round.pairs[l].reading)
      return
    }
    // Mỗi từ chỉ bị tính một lần trong vòng, dù ghép sai nhiều lần
    setMissed((set) => new Set(set).add(l))
    setFlash({ left: l, right: r })
    timer.current = setTimeout(() => setFlash(null), 400)
  }

  const pickLeft = (i: number) => {
    if (flash || finished) return
    if (right !== null) attempt(i, right)
    else setLeft(left === i ? null : i)
  }

  const pickRight = (i: number) => {
    if (flash || finished) return
    if (left !== null) attempt(left, i)
    else setRight(right === i ? null : i)
  }

  // Cột trái: phím 1–6. Cột phải: phím A S D F G H, theo vị trí hiện trên màn hình.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!isShortcutEvent(e)) return
    if (e.key === 'Escape') {
      setLeft(null)
      setRight(null)
      return
    }
    const leftIndex = pieceIndexForKey(e.key)
    if (leftIndex >= 0 && leftIndex < round.pairs.length) {
      if (!matched.has(leftIndex)) pickLeft(leftIndex)
      return
    }
    const position = matchRightIndexForKey(e.key)
    if (position >= 0 && position < round.rightOrder.length) {
      const pairIndex = round.rightOrder[position]
      if (!matched.has(pairIndex)) pickRight(pairIndex)
    }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const finish = () => {
    onDone([...missed].map((i) => ({
      learnerVocabularyId: round.pairs[i].learnerVocabularyId,
      clientEventId: round.pairs[i].clientEventId,
    })))
  }

  return (
    <ExercisePanel
      stage={round.boss ? `Boss round · ${secondsLeft}s` : 'Stage 5 · Matching round'}
      question={TITLES[round.pairType]}
      footer={
        <ContinueFooter
          label="Continue"
          onClick={finish}
          disabled={!finished}
          hint={
            timedOut && !allMatched
              ? `Time's up! You matched ${matched.size} of ${round.pairs.length} pairs.`
              : finished
                ? `${round.pairs.length - missed.size}/${round.pairs.length} correct on the first try.`
                : round.boss
                  ? 'Match as many pairs as you can. This round does not change your points.'
                  : 'Match all the pairs to continue.'
          }
        />
      }
    >
      <div className="grid w-full grid-cols-2 gap-3">
        <ul className="flex flex-col gap-3" aria-label="Words">
          {round.pairs.map((pair, i) => (
            <li key={pair.learnerVocabularyId}>
              <Tile
                shortcut={pieceKeyLabel(i)}
                label={pair.left}
                japanese
                selected={left === i}
                done={matched.has(i)}
                wrong={flash?.left === i}
                onClick={() => pickLeft(i)}
              />
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-3" aria-label="Matches">
          {round.rightOrder.map((i, position) => (
            <li key={round.pairs[i].learnerVocabularyId}>
              <Tile
                shortcut={matchRightKeyLabel(position)}
                label={round.pairs[i].right}
                japanese={RIGHT_IS_JAPANESE[round.pairType]}
                selected={right === i}
                done={matched.has(i)}
                wrong={flash?.right === i}
                onClick={() => pickRight(i)}
              />
            </li>
          ))}
        </ul>
      </div>
    </ExercisePanel>
  )
}
