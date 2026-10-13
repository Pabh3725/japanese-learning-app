'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

function SettingSwitch({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(!!defaultChecked)
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p id={`${id}-label`} className="text-sm font-medium">{label}</p>
        <p id={`${id}-desc`} className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        onClick={() => setChecked((c) => !c)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-primary' : 'bg-[#2e3440]')}
      >
        <span className={cn('absolute top-1 left-1 size-5 rounded-full bg-white transition-transform duration-200', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

const goals = [10, 20, 30, 50]

export function SettingsForm() {
  const [goal, setGoal] = useState(30)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <section aria-labelledby="goal-title" className="rounded-3xl border border-border bg-card p-6">
        <h2 id="goal-title" className="font-semibold">Daily goal</h2>
        <p className="mt-1 text-sm text-muted-foreground">Number of cards to study each day.</p>
        <div role="radiogroup" aria-labelledby="goal-title" className="mt-4 grid grid-cols-4 gap-2">
          {goals.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={goal === g}
              onClick={() => setGoal(g)}
              className={cn(
                'h-12 rounded-2xl border-2 text-sm font-semibold tabular-nums transition-colors',
                goal === g ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]',
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="study-title" className="rounded-3xl border border-border bg-card px-6 pt-6 pb-2">
        <h2 id="study-title" className="font-semibold">Study</h2>
        <div className="divide-y divide-border">
          <SettingSwitch label="Show Sino-Vietnamese" description="Display Hán Việt readings on cards." defaultChecked />
          <SettingSwitch label="Show romaji" description="Helpful while you're still learning Kana." />
          <SettingSwitch label="Sound effects" description="Play sounds for correct and wrong answers." defaultChecked />
        </div>
      </section>

      <section aria-labelledby="notify-title" className="rounded-3xl border border-border bg-card px-6 pt-6 pb-2">
        <h2 id="notify-title" className="font-semibold">Reminders</h2>
        <div className="divide-y divide-border">
          <SettingSwitch label="Daily reminder" description="Get a nudge when reviews are due." defaultChecked />
          <SettingSwitch label="Streak protection" description="Remind me before my streak ends." defaultChecked />
        </div>
      </section>
    </div>
  )
}
