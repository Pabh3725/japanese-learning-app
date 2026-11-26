'use client'

// V12 Settings (chủ dự án chốt 2026-11-24): người học tự nhập số mục mới mỗi ngày của từng khu; cạnh ô Kanji và Từ Kanji
// có đề xuất để xong cùng lúc với Kana; khối ước tính cho biết bao lâu nữa xong từ vựng của cấp. Kích thước set, trần từng khu.
import { useId } from 'react'
import { useRouter } from 'next/navigation'
import { saveV12SettingAction } from '@/app/learn/v12/actions'
import { Group, NumberBox, useNumberField } from '@/components/settings/settings-form'
import type { V12Settings } from '@/lib/dal/v12/settings'
import type { Zone } from '@/lib/v12/card-types'
import { paceEstimate, type WordKanjiPace } from '@/lib/v12/pace'
import { RULES_V12 } from '@/lib/v12/rules'
import { addStudyDays, studyDate } from '@/lib/learning/time'

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

/** Dữ liệu cho phần xem trước: cấp đang học và số mục chưa mở của cấp đó (từng khu), thời gian một mục (giây), từ Kanji chưa mở. */
export interface VocabPlan {
  levels: Record<Zone, number | null>
  remaining: Record<Zone, number>
  seconds: Record<Zone, number>
  wordKanji: WordKanjiPace[]
}

const fmtDays = (days: number) => {
  const date = new Date(`${addStudyDays(studyDate(new Date()), days)}T00:00:00+07:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${days} days (around ${date})`
}

/** Ô số mục mới mỗi ngày của một khu, có dòng đề xuất bên cạnh. */
function PaceRow({ id, label, hint, field, suggest }: { id: string; label: string; hint: string; field: ReturnType<typeof useNumberField>; suggest?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted-foreground">{hint}</p>
        {suggest && <p className="mt-1 text-sm text-cyan">{suggest}</p>}
        {field.error && <p role="alert" className="mt-1 text-sm text-error">{field.error}</p>}
      </div>
      <NumberBox id={id} min={0} max={50} field={field} className="w-full sm:w-28" />
    </div>
  )
}

export function V12SettingsFields({ s, plan, radicalsPerDay }: { s: V12Settings; plan: VocabPlan; radicalsPerDay: number }) {
  const router = useRouter()
  const save = (key: string) => async (value: number) => {
    const res = await saveV12SettingAction(key, value)
    router.refresh()
    return res
  }
  const ids = { kana: useId(), kanji: useId(), word_kanji: useId(), radical: useId() }
  const kana = useNumberField(s.newPerDay.kana, 0, 50, save('v12_new_kana'))
  const kanji = useNumberField(s.newPerDay.kanji, 0, 50, save('v12_new_kanji'))
  const word = useNumberField(s.newPerDay.word_kanji, 0, 50, save('v12_new_word_kanji'))
  const radical = useNumberField(radicalsPerDay, 0, 30, save('v12_new_radical'))
  // Xem trước theo số đang gõ (chưa cần lưu)
  const num = (f: ReturnType<typeof useNumberField>) => Math.max(0, Number(f.text) || 0)
  const perDay = { kana: num(kana), kanji: num(kanji), word_kanji: num(word) }
  const pace = paceEstimate({ remaining: plan.remaining, perDay, seconds: plan.seconds, wordKanji: plan.wordKanji })
  // Mỗi khu có cấp riêng (2026-11-26): khu mở hết cấp thì sang cấp sau
  const levelOf = (z: Zone) => (plan.levels[z] ? `N${plan.levels[z]}` : 'N5–N4')
  const suggestion = (z: 'kanji' | 'word_kanji', unit: string) => {
    const v = pace.suggest[z]
    if (plan.remaining[z] === 0) return `All ${levelOf(z)} ${unit} are already open.`
    if (v === null) return z === 'word_kanji' && pace.days.kana ? 'Kanji words wait for their characters, so they finish after Kana even at 50 a day.' : null
    return v === perDay[z] ? `✓ Finishes together with Kana (${v} a day).` : `Suggested: ${v} a day to finish together with Kana.`
  }
  const areaLine = (z: Zone, label: string) => {
    const d = pace.days[z]
    return (
      <li key={z} className="flex justify-between gap-3">
        <span className="text-subtle">
          {label} {levelOf(z)}
        </span>
        <span className="tabular-nums">{plan.remaining[z] === 0 ? 'all open' : d === null ? 'paused (0 a day)' : `${plan.remaining[z]} left · ${fmtDays(d)}`}</span>
      </li>
    )
  }

  return (
    <>
      <Group id="pace" title="Vocab · New items a day" description="How many new items open each day in each area. 0 pauses that area. Changes apply from tomorrow (or today in areas you haven't started).">
        <PaceRow id={ids.kana} label="New Kana words a day" hint="Words in Minna lesson order, learned in kana. Each area moves on to the next level as soon as it has started every item of its level." field={kana} />
        <PaceRow id={ids.kanji} label="New Kanji a day" hint="Characters from easy to hard." field={kanji} suggest={suggestion('kanji', 'Kanji')} />
        <PaceRow id={ids.word_kanji} label="New Kanji words a day" hint="Opens when the word's kana has reached Intro 2 and all its characters are learned. Days with too few ready words open fewer." field={word} suggest={suggestion('word_kanji', 'Kanji words')} />
        <div className="flex flex-col gap-3 py-4">
          <p className="text-sm font-medium">
            {pace.total === null ? "An area is paused, so its current level won't finish yet." : `Current levels finish in about ${fmtDays(pace.total)}.`}
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {areaLine('kana', 'Kana words')}
            {areaLine('kanji', 'Kanji')}
            {areaLine('word_kanji', 'Kanji words')}
          </ul>
          <p className="text-xs text-muted-foreground">About {pace.minutes} min of study a day once reviews settle in. Estimates; wrong answers add a few questions.</p>
        </div>
        <PaceRow id={ids.radical} label="New radicals a day (optional)" hint="Learned separately under Vocab → More → Radicals. Not counted above." field={radical} />
      </Group>
      <Group id="sessions" title="Vocab · Sessions" description="Today's Vocab cards are shuffled and split into sets.">
        <Field name="set_size" label="Cards per set" hint="After each set you can take a break or keep going." initial={s.setSize} min={RULES_V12.set.min} max={RULES_V12.set.max} />
      </Group>
      <details id="advanced" className="group rounded-3xl border border-border bg-card px-6 py-5">
        <summary className="cursor-pointer list-none font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
          Vocab · Advanced
          <span className="mt-1 block text-sm font-normal text-muted-foreground">Daily limits per area. Extra cards move to the next day; new items pause while an area is over its limit.</span>
        </summary>
        <div className="mt-2 divide-y divide-border">
          <Field name="v12_kana_cap" label="Kana vocabulary cards a day" hint="Intro questions and review cards." initial={s.caps.kana} min={RULES_V12.caps.min} max={RULES_V12.caps.max} />
          <Field name="v12_kanji_cap" label="Kanji cards a day" hint="Intro questions and review cards." initial={s.caps.kanji} min={RULES_V12.caps.min} max={RULES_V12.caps.max} />
          <Field name="v12_word_kanji_cap" label="Kanji word cards a day" hint="Intro questions and review cards." initial={s.caps.word_kanji} min={RULES_V12.caps.min} max={RULES_V12.caps.max} />
        </div>
      </details>
    </>
  )
}
