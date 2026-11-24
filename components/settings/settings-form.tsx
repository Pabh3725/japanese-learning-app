'use client'

import { useId, useState, useTransition } from 'react'
import { saveGrammarFuriganaAction, saveStudyLimitAction } from '@/app/(main)/settings/actions'
import { GRAMMAR_V1 } from '@/lib/grammar/rules'
import { STUDY_LIMITS, type StudyLimitKey } from '@/lib/learning/new-words'
import { cn } from '@/lib/utils'

/** Ô nhập số: lưu khi rời ô hoặc nhấn Enter. Sai khoảng hoặc lưu lỗi thì quay về giá trị cũ, để màn hình luôn khớp với dữ liệu thật. */
export function useNumberField(initial: number, min: number, max: number, save: (value: number) => Promise<{ status: string }>) {
  const [text, setText] = useState(String(initial))
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [, startSaving] = useTransition()

  const commit = () => {
    const value = Number(text)
    if (text.trim() !== '' && value === saved) {
      setError(null)
      return
    }
    if (text.trim() === '' || !Number.isInteger(value) || value < min || value > max) {
      setError(`Enter a whole number from ${min} to ${max}.`)
      setText(String(saved))
      return
    }
    setError(null)
    startSaving(async () => {
      try {
        const { status } = await save(value)
        if (status !== 'saved') throw new Error(status)
        setSaved(value)
      } catch {
        setText(String(saved))
        setError("Couldn't save. Check your connection and try again.")
      }
    })
  }

  return { text, setText, commit, error }
}

export function NumberBox({ id, labelledBy, min, max, field, className }: { id?: string; labelledBy?: string; min: number; max: number; field: ReturnType<typeof useNumberField>; className?: string }) {
  return (
    <input
      id={id}
      aria-labelledby={labelledBy}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={field.text}
      onChange={(e) => field.setText(e.target.value)}
      onBlur={field.commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={cn('h-11 rounded-xl border-2 border-border bg-background px-3 text-right tabular-nums outline-none focus:border-primary', className)}
    />
  )
}

export function SettingSwitch({ label, description, defaultChecked, onSave }: { label: string; description: string; defaultChecked?: boolean; onSave: (value: boolean) => Promise<unknown> }) {
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
        onClick={() => {
          const value = !checked
          setChecked(value)
          void onSave(value)
        }}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-primary' : 'bg-[#2e3440]')}
      >
        <span className={cn('absolute top-1 left-1 size-5 rounded-full bg-white transition-transform duration-200', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

/** Lưu khi rời ô. Số ngoài khoảng cho phép thì báo lỗi và trả về giá trị cũ. */
function StudyLimitField({ limitKey, initial }: { limitKey: StudyLimitKey; initial: number }) {
  const { label, hint, min, max } = STUDY_LIMITS[limitKey]
  const id = useId()
  const field = useNumberField(initial, min, max, (value) => saveStudyLimitAction(limitKey, value))
  const value = Number(field.text)
  // Mỗi mẫu mới học 5 buổi × 8 câu, nên sau tuần đầu mỗi ngày có khoảng 40 câu cho mỗi mẫu mới/ngày
  const { questionsPerSitting, sittingGaps } = GRAMMAR_V1.learning
  const grammarLoad = limitKey === 'grammar_new_per_day' && Number.isInteger(value) && value > 3 ? value * questionsPerSitting * (sittingGaps.length + 1) : null

  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted-foreground">{hint}</p>
        {grammarLoad !== null && <p className="mt-1 text-sm text-yellow">About {grammarLoad} grammar learning questions a day after the first week.</p>}
        {field.error && <p role="alert" className="mt-1 text-sm text-error">{field.error}</p>}
      </div>
      <NumberBox id={id} min={min} max={max} field={field} className="w-full sm:w-28" />
    </div>
  )
}

export function Group({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-3xl border border-border bg-card px-6 pt-6 pb-2">
      <h2 id={`${id}-title`} className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

/** Ngữ pháp còn lại của cấp đang học (mẫu chưa mở), để ước tính bao lâu nữa xong. */
export interface GrammarPlan {
  level: 'N5' | 'N4'
  remaining: number
}

/** Mỗi mẫu học 5 buổi trong 8 ngày: mẫu cuối cùng xong Học sau chừng này ngày kể từ khi mở. */
const GRAMMAR_LEARNING_DAYS = 7

const fmtDays = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${days} days (around ${d})`
}

/** Số mẫu ngữ pháp mới mỗi ngày (chủ dự án chốt 2026-11-24: tự nhập, bỏ cân bằng) và bao lâu nữa xong ngữ pháp của cấp. */
function GrammarPace({ plan, newPerDay }: { plan: GrammarPlan; newPerDay: number }) {
  const id = useId()
  const { min, max } = STUDY_LIMITS.grammar_new_per_day
  const field = useNumberField(newPerDay, min, max, (value) => saveStudyLimitAction('grammar_new_per_day', value))
  const perDay = Math.max(1, Number(field.text) || 1)
  const days = plan.remaining > 0 ? Math.ceil(plan.remaining / perDay) + GRAMMAR_LEARNING_DAYS : 0
  const { questionsPerSitting, sittingGaps } = GRAMMAR_V1.learning
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-medium">New grammar patterns a day</label>
        <p className="text-sm text-muted-foreground">Each new pattern is practiced in {sittingGaps.length + 1} sittings over 8 days, {questionsPerSitting} questions each.</p>
        <p className="mt-1 text-sm text-cyan">
          {plan.remaining === 0 ? `All ${plan.level} patterns are open.` : `${plan.remaining} ${plan.level} patterns left · finishes in about ${fmtDays(days)}.`}
        </p>
        {field.error && <p role="alert" className="mt-1 text-sm text-error">{field.error}</p>}
      </div>
      <NumberBox id={id} min={min} max={max} field={field} className="w-full sm:w-28" />
    </div>
  )
}

/** Phần Vocab dùng cài đặt V12 (`v12Slot`); Grammar: số mẫu mới mỗi ngày, furigana; trần ôn ở Nâng cao. */
export function SettingsForm({ limits, furigana = true, v12Slot, grammar }: { limits: Record<StudyLimitKey, number>; furigana?: boolean; v12Slot: React.ReactNode; grammar: GrammarPlan }) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {v12Slot}
      <Group id="grammar" title="Grammar" description="Patterns by Minna lesson, at their own pace separate from Vocab.">
        <GrammarPace plan={grammar} newPerDay={limits.grammar_new_per_day} />
        <SettingSwitch label="Furigana in Grammar" description="Show readings above Kanji in grammar sentences." defaultChecked={furigana} onSave={saveGrammarFuriganaAction} />
      </Group>
      <details className="group rounded-3xl border border-border bg-card px-6 py-5">
        <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
          Grammar · Advanced
          <span className="mt-1 block text-sm font-normal text-muted-foreground">Daily review limit. Extra patterns move to the next day.</span>
        </summary>
        <div className="mt-2 divide-y divide-border">
          <StudyLimitField limitKey="grammar_review_cap" initial={limits.grammar_review_cap} />
        </div>
      </details>
    </div>
  )
}
