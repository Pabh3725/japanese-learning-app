'use client'

import { useId, useState, useTransition } from 'react'
import { saveNewPerDayAction, saveStudyLimitAction } from '@/app/(main)/settings/actions'
import { NEW_PER_DAY_OPTIONS, STUDY_LIMITS, type StudyLimitKey } from '@/lib/learning/new-words'
import { cn } from '@/lib/utils'

/** Lưu ngay khi chọn. Lưu lỗi thì quay về giá trị cũ, để màn hình luôn khớp với dữ liệu thật. */
function NewPerDaySetting({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState(false)
  const [saving, startSaving] = useTransition()
  // Giá trị cũ ngoài các lựa chọn (ví dụ 7) vẫn hiện để người học thấy đúng mức đang dùng
  const options = (NEW_PER_DAY_OPTIONS as readonly number[]).includes(initial)
    ? NEW_PER_DAY_OPTIONS
    : [...NEW_PER_DAY_OPTIONS, initial].sort((a, b) => a - b)

  const choose = (next: number) => {
    const previous = value
    setValue(next)
    setError(false)
    startSaving(async () => {
      try {
        const { status } = await saveNewPerDayAction(next)
        if (status !== 'saved') throw new Error(status)
      } catch {
        setValue(previous)
        setError(true)
      }
    })
  }

  return (
    <section aria-labelledby="new-words-title" className="rounded-3xl border border-border bg-card p-6">
      <h2 id="new-words-title" className="font-semibold">New words per day</h2>
      <p className="mt-1 text-sm text-muted-foreground">Fewer words means fewer questions each day and more time to remember them.</p>
      <div role="radiogroup" aria-labelledby="new-words-title" className="mt-4 grid grid-cols-5 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            disabled={saving}
            onClick={() => choose(option)}
            className={cn(
              'h-12 rounded-2xl border-2 text-sm font-semibold tabular-nums transition-colors',
              value === option ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]',
            )}
          >
            {option}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-error">Couldn&apos;t save. Check your connection and try again.</p>}
    </section>
  )
}

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

/** Lưu khi rời ô. Số ngoài khoảng cho phép thì báo lỗi và trả về giá trị cũ. */
function StudyLimitField({ limitKey, initial }: { limitKey: StudyLimitKey; initial: number }) {
  const { label, hint, min, max } = STUDY_LIMITS[limitKey]
  const id = useId()
  const [text, setText] = useState(String(initial))
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [, startSaving] = useTransition()

  const commit = () => {
    const value = Number(text)
    if (value === saved) return
    if (!Number.isInteger(value) || value < min || value > max) {
      setError(`Enter a whole number from ${min} to ${max}.`)
      setText(String(saved))
      return
    }
    setError(null)
    startSaving(async () => {
      try {
        const { status } = await saveStudyLimitAction(limitKey, value)
        if (status !== 'saved') throw new Error(status)
        setSaved(value)
      } catch {
        setText(String(saved))
        setError("Couldn't save. Check your connection and try again.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted-foreground">{hint}</p>
        {error && <p role="alert" className="mt-1 text-sm text-error">{error}</p>}
      </div>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="h-11 w-full rounded-xl border-2 border-border bg-background px-3 text-right tabular-nums outline-none focus:border-primary sm:w-28"
      />
    </div>
  )
}

export function SettingsForm({ newPerDay, limits }: { newPerDay: number; limits: Record<StudyLimitKey, number> }) {
  const [goal, setGoal] = useState(30)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <NewPerDaySetting initial={newPerDay} />

      <section aria-labelledby="limits-title" className="rounded-3xl border border-border bg-card px-6 pt-6 pb-2">
        <h2 id="limits-title" className="font-semibold">Daily limits</h2>
        <div className="divide-y divide-border">
          {(Object.keys(STUDY_LIMITS) as StudyLimitKey[]).map((key) => (
            <StudyLimitField key={key} limitKey={key} initial={limits[key]} />
          ))}
        </div>
      </section>
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
