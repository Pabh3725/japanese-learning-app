'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-secondary p-1.5">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              'flex h-10 min-w-12 flex-1 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-ring',
              value === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-subtle',
            )}
          >
            <input type="radio" name={label} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const levels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
const types = ['Meaning', 'Reading', 'Kanji'] as const
const times = ['30s', '60s', '90s', '∞'] as const

export function GameSettings() {
  const [level, setLevel] = useState<(typeof levels)[number]>('N5')
  const [type, setType] = useState<(typeof types)[number]>('Meaning')
  const [time, setTime] = useState<(typeof times)[number]>('60s')

  return (
    <section aria-labelledby="settings-title" className="rounded-3xl border border-border bg-card p-6">
      <h2 id="settings-title" className="font-semibold">Game settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Applies to every mini-game.</p>
      <div className="mt-6 flex flex-col gap-5">
        <Segmented label="JLPT level" options={levels} value={level} onChange={setLevel} />
        <Segmented label="Question type" options={types} value={type} onChange={setType} />
        <Segmented label="Time limit" options={times} value={time} onChange={setTime} />
      </div>
    </section>
  )
}
