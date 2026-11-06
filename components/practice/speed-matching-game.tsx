'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Flame, Timer, X } from 'lucide-react'
import { SessionComplete } from '@/components/learning/session-complete'
import { ProgressBar } from '@/components/progress-bar'
import { createBoard, nextBoard, type MatchBoard, type SpeedTile, type SpeedWord } from '@/lib/speed-matching'
import { cn } from '@/lib/utils'

const DURATION = 60

type Flash = { keys: [string, string]; kind: 'correct' | 'wrong' } | null

function MatchTile({
  tile,
  selected,
  flash,
  onClick,
}: {
  tile: SpeedTile
  selected: boolean
  flash: 'correct' | 'wrong' | null
  onClick: () => void
}) {
  const isJapanese = tile.kind === 'word'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex h-24 w-full items-center justify-center rounded-2xl border-2 bg-card p-1.5 text-center break-words transition-all duration-150 active:scale-[0.97] md:h-28 md:p-2',
        isJapanese ? 'font-jp text-base md:text-2xl' : 'text-xs font-medium md:text-sm',
        !flash && !selected && 'border-border shadow-[0_3px_0_0_#2e3440] hover:border-[#3b4250]',
        !flash && selected && 'border-cyan bg-cyan/10 shadow-[0_3px_0_0_rgba(95,214,200,0.4)]',
        flash === 'correct' && 'scale-95 border-success bg-success/15 opacity-0 duration-300',
        flash === 'wrong' && 'animate-shake border-error bg-error/10',
      )}
    >
      <span lang={isJapanese ? 'ja' : 'vi'} className="min-w-0">{tile.label}</span>
    </button>
  )
}

export function SpeedMatchingGame({ words }: { words: SpeedWord[] }) {
  const [board, setBoard] = useState<MatchBoard>(() => createBoard(words))
  const [cleared, setCleared] = useState<ReadonlySet<string>>(() => new Set())
  const [selected, setSelected] = useState<SpeedTile | null>(null)
  const [flash, setFlash] = useState<Flash>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [game, setGame] = useState(0)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const over = timeLeft <= 0
  const seed = `g${game}`

  useEffect(() => {
    if (over) return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [over, game])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const pick = (tile: SpeedTile) => {
    if (flash || over) return
    if (!selected || selected.kind === tile.kind) {
      // Bấm lại ô đang chọn thì bỏ chọn; bấm ô cùng loại thì đổi ô chọn, không tính là sai
      setSelected(selected?.key === tile.key ? null : tile)
      return
    }
    const keys: [string, string] = [selected.key, tile.key]
    setSelected(null)
    if (selected.wordId === tile.wordId) {
      setFlash({ keys, kind: 'correct' })
      setScore((s) => s + 1)
      const nextCombo = combo + 1
      setCombo(nextCombo)
      setBestCombo((b) => Math.max(b, nextCombo))
      flashTimer.current = setTimeout(() => {
        const nowCleared = new Set([...cleared, ...keys])
        if (nowCleared.size === board.tiles.length) {
          setBoard(nextBoard(words, board, seed))
          setCleared(new Set())
        } else {
          setCleared(nowCleared)
        }
        setFlash(null)
      }, 280)
    } else {
      setFlash({ keys, kind: 'wrong' })
      setCombo(0)
      setMistakes((m) => m + 1)
      flashTimer.current = setTimeout(() => setFlash(null), 360)
    }
  }

  const restart = () => {
    clearTimeout(flashTimer.current)
    setBoard(createBoard(words, `g${game + 1}`))
    setCleared(new Set())
    setSelected(null)
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
        subtitle={`Best combo ×${bestCombo}. Practice results aren't saved yet.`}
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

      <p className="mb-4 text-center text-sm text-subtle">Round {board.round} · Tap a word and its meaning</p>

      <ul key={board.round} className="grid grid-cols-4 gap-2 pb-10 animate-in fade-in duration-300 md:gap-3" aria-label="Words and meanings">
        {board.tiles.map((tile) => (
          <li key={tile.key}>
            {cleared.has(tile.key) ? (
              <div className="h-24 md:h-28" aria-hidden="true" />
            ) : (
              <MatchTile
                tile={tile}
                selected={selected?.key === tile.key}
                flash={flash?.keys.includes(tile.key) ? flash.kind : null}
                onClick={() => pick(tile)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
