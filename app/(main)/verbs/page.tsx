'use client'

import { useState } from 'react'
import Link from 'next/link'
import { actionButton } from '@/components/action-button'
import { PageHeader } from '@/components/page-header'
import { CheckTile } from '@/components/preview/check-tile'
import { PreviewBanner } from '@/components/preview/preview-banner'
import { PREVIEW_VERBS, VERB_FORMS, type VerbForm } from '@/lib/preview/grammar'
import { cn } from '@/lib/utils'

const GROUPS = [
  { id: 1, title: 'Group 1', subtitle: 'のみます, かきます, かえります' },
  { id: 2, title: 'Group 2', subtitle: 'たべます, みます' },
  { id: 3, title: 'Group 3', subtitle: 'します, きます' },
]
const MODES = [
  { id: 'choice', label: 'Choose' },
  { id: 'typing', label: 'Type' },
]

function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

export default function VerbsPage() {
  const [forms, setForms] = useState<VerbForm[]>(['te'])
  const [groups, setGroups] = useState<number[]>([1, 2, 3])
  const [mode, setMode] = useState('choice')
  const ready = forms.length > 0 && groups.length > 0

  return (
    <>
      <PageHeader eyebrow="動詞" title="Verb forms" description="Practice conjugation with verbs you've already learned." />
      <PreviewBanner>This is a design preview with {PREVIEW_VERBS.length} sample verbs. Your answers are not saved yet.</PreviewBanner>

      <section aria-labelledby="forms-title">
        <h2 id="forms-title" className="mb-3 font-semibold">Forms to practice</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VERB_FORMS.map((form) => (
            <CheckTile key={form.id} checked={forms.includes(form.id)} onToggle={() => setForms((f) => toggled(f, form.id))} title={form.label} subtitle={`たべます → ${form.example}`} />
          ))}
        </div>
      </section>

      <section aria-labelledby="groups-title" className="mt-8">
        <h2 id="groups-title" className="mb-3 font-semibold">Verb groups</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {GROUPS.map((group) => (
            <CheckTile key={group.id} checked={groups.includes(group.id)} onToggle={() => setGroups((g) => toggled(g, group.id))} title={group.title} subtitle={group.subtitle} />
          ))}
        </div>
      </section>

      <section aria-labelledby="mode-title" className="mt-8">
        <h2 id="mode-title" className="mb-3 font-semibold">How to answer</h2>
        <div role="radiogroup" aria-labelledby="mode-title" className="grid max-w-sm grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={cn('h-12 rounded-2xl border-2 text-sm font-semibold transition-colors', mode === m.id ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {ready ? (
        <Link href={`/verbs/session?forms=${forms.join(',')}&groups=${groups.join(',')}&mode=${mode}`} className={cn(actionButton({ size: 'lg' }), 'mt-8 w-full md:w-auto md:px-10')}>Start practice</Link>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">Tick at least one form and one group to start.</p>
      )}
    </>
  )
}
