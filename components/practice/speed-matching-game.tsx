'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Flame, Timer, X } from 'lucide-react'
import { SessionComplete } from '@/components/learning/session-complete'
import { ProgressBar } from '@/components/progress-bar'
import { createBoard, getVocab, replacePair, type MatchBoard } from '@/lib/speed-matching'
import { cn } from '@/lib/utils'

const DURATION = 60

type Side = 'left' | 'right'
type Flash = { ids: [string, string]; kind: 'correct' | 'wrong' } | null

function MatchTile({
  label,
  isJapanese,
  selected,
  flash,
  onClick,
}: {
  label: string
  isJapanese: boolean
  selected: boolean
  flash: 'correct' | 'wrong' | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex h-16 w-full items-center justify-center rounded-2xl border-2 bg-card px-3 text-center transition-all duration-150 active:scale-[0.97] md:h-20',
        isJapanese ? 'font-jp text-[26px] md:text-[30px]' : 'text-base font-medium md:text-lg',
        !flash && !selected && 'border-border shadow-[0_3px_0_0_#2e3440] hover:border-[#3b4250]',
        !flash && selected && 'border-cyan bg-cyan/10 shadow-[0_3px_0_0_rgba(95,214,200,0.4)]',
        flash === 'correct' && 'scale-95 border-success bg-success/15 opacity-0 duration-300',
        flash === 'wrong' && 'animate-shake border-error bg-error/10',
      )}
    >
      <span lang={isJapanese ? 'ja' : 'vi'}>{label}</span>
    </button>
  )
}

export function SpeedMatchingGame() {
  const [board, setBoard] = useState<MatchBoard>(() => createBoard())
  const [selection, setSelection] = useState<{ left: string | null; right: string | null }>({ left: null, right: null })
  const [flash, setFlash] = useState<Flash>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [game, setGame] = useState(0)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const over = timeLeft <= 0

  useEffect(() => {
    if (over) return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [over, game])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const pick = (side: Side, id: string) => {
    if (flash || over) return
    const next = { ...selection, [side]: selection[side] === id ? null : id }
    if (!next.left || !next.right) {
      setSelection(next)
      return
    }
    const pair: [string, string] = [next.left, next.right]
    if (next.left === next.right) {
      setFlash({ ids: pair, kind: 'correct' })
      setScore((s) => s + 1)
      const nextCombo = combo + 1
      setCombo(nextCombo)
      setBestCombo((b) => Math.max(b, nextCombo))
      flashTimer.current = setTimeout(() => {
        setBoard((b) => replacePair(b, pair[0]))
        setFlash(null)
      }, 280)
    } else {
      setFlash({ ids: pair, kind: 'wrong' })
      setCombo(0)
      setMistakes((m) => m + 1)
      flashTimer.current = setTimeout(() => setFlash(null), 360)
    }
    setSelection({ left: null, right: null })
  }

  const flashFor = (side: Side, id: string) => {
    if (!flash) return null
    return flash.ids[side === 'left' ? 0 : 1] === id ? flash.kind : null
  }

  const restart = () => {
    setBoard(createBoard(`g${game + 1}`))
    setSelection({ left: null, right: null })
    setFlash(null)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setMistakes(0)
    setTimeLeft(DURATION)
    setGame((g) => g + 1)
  }

  if (over) {
    const accuracy = score + mistakes ? Math.round((score / (score + mistakes)) * 100) : 0
    return (
      <SessionComplete
        title={`${score} pairs matched!`}
        subtitle={`Best combo ×${bestCombo}. Keep going to unlock Lightning Hands.`}
        stats={[
          { label: 'Pairs', value: String(score), tone: 'text-cyan' },
          { label: 'Accuracy', value: `${accuracy}%`, tone: 'text-success' },
          { label: 'Combo', value: `×${bestCombo}`, tone: 'text-yellow' },
        ]}
        primary={{ href: '/practice', label: 'Back to Arena' }}
        secondary={{ href: '/', label: 'Home' }}
        onRestart={restart}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
      <header className="flex items-center gap-4 py-4">
        <Link
          href="/practice"
          aria-label="Exit game"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
        <ProgressBar value={timeLeft} max={DURATION} tone={timeLeft <= 10 ? 'pink' : 'cyan'} label="Time remaining" />
        <span className={cn('flex w-14 shrink-0 items-center justify-end gap-1 text-sm font-semibold tabular-nums', timeLeft <= 10 ? 'text-pink' : 'text-subtle')}>
          <Timer className="size-4" aria-hidden="true" />
          {timeLeft}s
        </span>
      </header>

      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-xs text-muted-foreground">Score</p>
          <p className="text-3xl font-semibold tabular-nums" aria-live="polite">{score}</p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-200',
            combo >= 3 ? 'bg-yellow/15 text-yellow' : 'bg-secondary text-muted-foreground',
          )}
        >
          <Flame className="size-4" aria-hidden="true" />
          Combo ×{combo}
        </div>
      </div>

      <p className="mb-4 text-center text-sm text-subtle">Tap a word, then its meaning</p>

      <div className="grid grid-cols-2 gap-3 pb-10 md:gap-4">
        <ul className="flex flex-col gap-3" aria-label="Japanese words">
          {board.left.map((id) => (
            <li key={`l-${id}`}>
              <MatchTile
                label={getVocab(id).word}
                isJapanese
                selected={selection.left === id}
                flash={flashFor('left', id)}
                onClick={() => pick('left', id)}
              />
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-3" aria-label="Vietnamese meanings">
          {board.right.map((id) => (
            <li key={`r-${id}`}>
              <MatchTile
                label={getVocab(id).meaning}
                isJapanese={false}
                selected={selection.right === id}
                flash={flashFor('right', id)}
                onClick={() => pick('right', id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
