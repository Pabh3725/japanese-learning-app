'use client'

// V12 §2, §8: Settings — cân bằng theo thời gian (hoặc số mục mới thủ công), kích thước set, trần từng khu.
import { useId, useState } from 'react'
import { saveV12SettingAction } from '@/app/learn/v12/actions'
import { Group, NumberBox, SettingSwitch, useNumberField } from '@/components/settings/settings-form'
import type { V12Settings } from '@/lib/dal/v12/settings'
import { RULES_V12 } from '@/lib/v12/rules'
import { cn } from '@/lib/utils'

function Field({ name, label, hint, initial, min, max }: { name: string; label: string; hint: string; initial: number; min: number; max: number }) {
  const id = useId()
  const field = useNumberField(initial, min, max, (value) => saveV12SettingAction(name, value))
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted-foreground">{hint}</p>
        {field.error && <p role="alert" className="mt-1 text-sm text-error">{field.error}</p>}
      </div>
      <NumberBox id={id} min={min} max={max} field={field} className="w-full sm:w-28" />
    </div>
  )
}

/** `minDate`: ngày học mai (YYYY-MM-DD) — ngày hoàn thành sớm nhất được chọn. */
export function V12SettingsFields({ s, minDate }: { s: V12Settings; minDate: string }) {
  const [balanceOn, setBalanceOn] = useState(s.balanceOn)
  const [target, setTarget] = useState(s.balanceTarget)
  const [date, setDate] = useState(s.balanceDate ?? '')
  const [dateError, setDateError] = useState<string | null>(null)
  // Chưa chọn ngày, hoặc ngày đã qua: lõi cân bằng dùng số phút mỗi ngày
  const dateNote = date === '' ? 'Pick a date — using minutes a day until then.' : date < minDate ? 'This date has passed — using minutes a day. Pick a new date.' : null
  return (
    <>
      <p className="rounded-2xl border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
        Vocab changes apply to today&apos;s cards in areas you haven&apos;t started yet, and fully from tomorrow.
      </p>
      <Group id="pace" title="Vocab · Daily pace" description="How many new items open each day in Kana vocabulary, Kanji and Kanji words. Grammar has its own settings below.">
        <SettingSwitch
          label="Balance new items"
          description="Split new items by study time so all three areas finish the level on the same day."
          defaultChecked={balanceOn}
          onSave={async (v) => {
            setBalanceOn(v)
            await saveV12SettingAction('balance_on', v)
          }}
        />
        {balanceOn ? (
          <div className="flex flex-col gap-3 py-4">
            <div role="radiogroup" aria-label="Goal" className="flex gap-2">
              {(['minutes', 'date'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={target === t}
                  onClick={() => {
                    setTarget(t)
                    void saveV12SettingAction('balance_target', t)
                  }}
                  className={cn('h-9 rounded-full border px-3.5 text-sm', target === t ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle')}
                >
                  {t === 'minutes' ? 'Minutes a day' : 'Finish by a date'}
                </button>
              ))}
            </div>
            {target === 'minutes' ? (
              <Field name="balance_minutes" label="Minutes of new items a day" hint="Time spent on new items, including their stages and first reviews." initial={s.balanceMinutes} min={5} max={240} />
            ) : (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Finish this level by</span>
                <input
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value !== '' && value < minDate) {
                      setDateError('Pick a date from tomorrow on.')
                      return
                    }
                    setDateError(null)
                    setDate(value)
                    saveV12SettingAction('balance_date', value || null)
                      .then(({ status }) => {
                        if (status !== 'saved') throw new Error(status)
                      })
                      .catch(() => setDateError("Couldn't save. Pick a date from tomorrow on and try again."))
                  }}
                  className="h-10 w-48 rounded-xl border border-border bg-card px-3"
                />
                {dateError ? <span role="alert" className="text-error">{dateError}</span> : dateNote && <span className="text-yellow">{dateNote}</span>}
              </label>
            )}
          </div>
        ) : (
          <>
            <Field name="v12_new_kana" label="New Kana words a day" hint="Kana vocabulary." initial={s.newPerDay.kana} min={0} max={50} />
            <Field name="v12_new_kanji" label="New radicals and Kanji a day" hint="Radicals come first, then characters." initial={s.newPerDay.kanji} min={0} max={50} />
            <Field name="v12_new_word_kanji" label="New Kanji words a day" hint="Opens when the word's kana and characters have reached Intro 2." initial={s.newPerDay.word_kanji} min={0} max={50} />
          </>
        )}
      </Group>
      <Group id="sessions" title="Vocab · Sessions" description="Today's Vocab cards are shuffled and split into sets.">
        <Field name="set_size" label="Cards per set" hint="After each set you can take a break or keep going." initial={s.setSize} min={RULES_V12.set.min} max={RULES_V12.set.max} />
      </Group>
      <details id="advanced" className="group rounded-3xl border border-border bg-card px-6 py-5">
        <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
          Vocab · Advanced
          <span className="mt-1 block text-sm font-normal text-muted-foreground">Daily limits per area. Extra cards move to the next day; you are warned before a day goes over.</span>
        </summary>
        <div className="mt-2 divide-y divide-border">
          <Field name="v12_kana_cap" label="Kana vocabulary cards a day" hint="Intro questions and review cards." initial={s.caps.kana} min={RULES_V12.caps.min} max={RULES_V12.caps.max} />
          <Field name="v12_kanji_cap" label="Kanji cards a day" hint="Radicals and characters." initial={s.caps.kanji} min={RULES_V12.caps.min} max={RULES_V12.caps.max} />
          <Field name="v12_word_kanji_cap" label="Kanji word cards a day" hint="Intro questions and review cards." initial={s.caps.word_kanji} min={RULES_V12.caps.min} max={RULES_V12.caps.max} />
        </div>
      </details>
    </>
  )
}
