'use client'

import { useId, useState, useTransition } from 'react'
import { saveGrammarFuriganaAction, saveNewPerDayAction, saveReviewAllAtOnceAction, saveStudyLimitAction } from '@/app/(main)/settings/actions'
import { GRAMMAR_V1 } from '@/lib/grammar/rules'
import { MAX_NEW_PER_DAY, MIN_NEW_PER_DAY, STUDY_LIMITS, type StudyLimitKey } from '@/lib/learning/new-words'
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

/** Từ mới mỗi ngày: lưu riêng (có quota mượn ngày mai), nhưng hiện như một dòng trong nhóm Vocabulary. */
function NewPerDayField({ initial }: { initial: number }) {
  const id = useId()
  const field = useNumberField(initial, MIN_NEW_PER_DAY, MAX_NEW_PER_DAY, saveNewPerDayAction)
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-medium">New words per day</label>
        <p className="text-sm text-muted-foreground">Fewer words means fewer questions each day and more time to remember them.</p>
        {field.error && <p role="alert" className="mt-1 text-sm text-error">{field.error}</p>}
      </div>
      <NumberBox id={id} min={MIN_NEW_PER_DAY} max={MAX_NEW_PER_DAY} field={field} className="w-full sm:w-28" />
    </div>
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

/** Mục hay chỉnh hiện sẵn; trần mỗi ngày nằm trong Advanced, đóng sẵn (chủ dự án chốt 2026-11-15). */
const ADVANCED: readonly StudyLimitKey[] = ['learn_cap', 'review_cap', 'word_kanji_review_cap', 'unlock_threshold', 'kanji_cap', 'kanji_review_cap', 'grammar_review_cap']

export function Group({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-3xl border border-border bg-card px-6 pt-6 pb-2">
      <h2 id={`${id}-title`} className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

export function SettingsForm({ newPerDay, limits, furigana = true, reviewAllAtOnce = false, v12Slot }: { newPerDay: number; limits: Record<StudyLimitKey, number>; furigana?: boolean; reviewAllAtOnce?: boolean; v12Slot?: React.ReactNode }) {
  // V12 gói 3: đã bật V12 thì phần học dùng cài đặt V12; Grammar và hiển thị giữ như cũ
  if (v12Slot) return <div className="flex max-w-2xl flex-col gap-6">{v12Slot}<Group id="grammar" title="Grammar" description="Patterns by Minna lesson.">{(['grammar_new_per_day', 'grammar_review_cap'] as const).map((key) => <StudyLimitField key={key} limitKey={key} initial={limits[key]} />)}<SettingSwitch label="Furigana in Grammar" description="Show readings above Kanji in grammar sentences." defaultChecked={furigana} onSave={saveGrammarFuriganaAction} /></Group></div>

  const field = (key: StudyLimitKey) => <StudyLimitField key={key} limitKey={key} initial={limits[key]} />
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Group id="pace" title="Daily pace" description="How much new material opens each day.">
        <NewPerDayField initial={newPerDay} />
        {field('kanji_new_per_day')}
        {field('grammar_new_per_day')}
      </Group>
      <Group id="sessions" title="Sessions" description="How long each Learn lesson and Review session is.">
        {field('lesson_size')}
        {field('review_session_size')}
        <SettingSwitch label="Review all due cards at once" description="One Review session takes every card due, up to the daily limit. Cards per review session is then ignored." defaultChecked={reviewAllAtOnce} onSave={saveReviewAllAtOnceAction} />
      </Group>
      <Group id="display" title="Display" description="How sentences are shown.">
        <SettingSwitch label="Furigana in Grammar" description="Show readings above Kanji in grammar sentences." defaultChecked={furigana} onSave={saveGrammarFuriganaAction} />
      </Group>
      <details className="group rounded-3xl border border-border bg-card px-6 py-5">
        <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
          Advanced
          <span className="mt-1 block text-sm font-normal text-muted-foreground">Daily limits. The defaults suit most learners; extra items move to the next day.</span>
        </summary>
        <div className="mt-2 divide-y divide-border">{ADVANCED.map(field)}</div>
      </details>
    </div>
  )
}
