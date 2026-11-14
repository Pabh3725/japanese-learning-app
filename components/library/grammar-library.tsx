'use client'

// Library: phần Ngữ pháp. Mọi mẫu đã duyệt (kể cả chưa mở), lọc theo cấp, unit (bài Minna) và trạng thái; V10 dùng chung
// mẫu thẻ với từ vựng, có dấu "đã biết" (học xong, không ôn) và thao tác cho cả unit, hoàn tác được.
import { useMemo, useState } from 'react'
import { markGrammarLearnedAction, undoGrammarLearnedAction } from '@/app/grammar/actions'
import { KnownTick, LibraryCard } from '@/components/library/library-card'
import { Select, UndoBar, UnitActions, useSave } from '@/components/library/library-controls'
import { cn } from '@/lib/utils'
import { unitLabel } from '@/lib/library/status'

export interface LibraryGrammarItem {
  code: string
  lesson: number
  level: 'N5' | 'N4'
  pattern: string
  meaning: string
  status: 'locked' | 'new' | 'learning' | 'review'
  /** Đã học xong nhưng không ôn. */
  archived: boolean
}

type GrammarStatus = 'not_started' | 'learning' | 'reviewing' | 'known'

const statusOf = (i: LibraryGrammarItem): GrammarStatus =>
  i.status === 'review' ? (i.archived ? 'known' : 'reviewing') : i.status === 'learning' ? 'learning' : 'not_started'

const LABELS: Record<GrammarStatus, string> = { not_started: 'Not started', learning: 'Learning', reviewing: 'Reviewing', known: 'Already known' }

const FILTERS: { id: 'all' | GrammarStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'not_started', label: 'Not started' },
  { id: 'learning', label: 'Learning' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'known', label: 'Already known' },
]

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()

const UNDO_CONFIRM = 'Undo "Mark as learned"? These patterns go back to how they were before.'

export function GrammarLibrary({ items, query }: { items: LibraryGrammarItem[]; query: string }) {
  const [level, setLevel] = useState<'all' | 'N5' | 'N4'>('all')
  const [unit, setUnit] = useState<string>('all')
  const [status, setStatus] = useState<'all' | GrammarStatus>('all')
  const save = useSave()
  const units = useMemo(() => [...new Set(items.filter((i) => level === 'all' || i.level === level).map((i) => i.lesson))].sort((a, b) => a - b), [items, level])
  const inUnit = items.filter((i) => (level === 'all' || i.level === level) && (unit === 'all' || i.lesson === Number(unit)))
  const q = plain(query.trim())
  const shown = inUnit.filter((i) => (status === 'all' || statusOf(i) === status) && (!q || plain(i.pattern).includes(q) || plain(i.meaning).includes(q) || String(i.lesson) === q))

  const patterns = (n: number) => `${n} ${n === 1 ? 'pattern' : 'patterns'}`
  const mark = (codes: string[], review: boolean) =>
    save.run(() => markGrammarLearnedAction({ codes, review }), {
      message: review ? `${patterns(codes.length)} marked as learned.` : `${patterns(codes.length)} marked as already known.`,
      undo: () => undoGrammarLearnedAction({ codes }),
      confirm: review ? UNDO_CONFIRM : undefined,
    })

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={status === f.id}
              onClick={() => setStatus(f.id)}
              className={cn('h-9 rounded-full border px-3.5 text-sm transition-colors', status === f.id ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select label="Level" value={level} onChange={(v) => { setLevel(v as typeof level); setUnit('all') }} options={[{ value: 'all', label: 'All' }, { value: 'N5', label: 'N5' }, { value: 'N4', label: 'N4' }]} />
          <Select label="Unit" value={unit} onChange={setUnit} options={[{ value: 'all', label: 'All' }, ...units.map((n) => ({ value: String(n), label: `U${n}` }))]} />
        </div>
      </div>

      {unit !== 'all' && (
        <UnitActions
          unit={unitLabel(inUnit[0]?.level ?? null, Number(unit))}
          count={inUnit.length}
          saving={save.saving}
          onLearned={() => mark(inUnit.map((i) => i.code), true)}
          onKnown={() => mark(inUnit.map((i) => i.code), false)}
        />
      )}
      {save.error && <p role="alert" className="mt-3 text-sm text-error">{save.error}</p>}

      <div className="mt-6" role="tabpanel">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{items.length === 0 ? 'Grammar content is not available yet.' : 'No grammar pattern matches.'}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((i) => (
              <LibraryCard
                key={i.code}
                title={i.pattern}
                titleClassName="text-xl"
                href={`/grammar/${i.code}?from=library`}
                meaning={i.meaning}
                unit={unitLabel(i.level, i.lesson)}
                status={LABELS[statusOf(i)]}
                actions={
                  <KnownTick
                    on={i.archived}
                    disabled={save.saving}
                    label="I already know this pattern (Not review)"
                    onToggle={() => (i.archived ? save.run(() => undoGrammarLearnedAction({ codes: [i.code] })) : mark([i.code], false))}
                  />
                }
              />
            ))}
          </ul>
        )}
      </div>
      <UndoBar notice={save.notice} onUndo={save.undo} onDismiss={save.dismiss} saving={save.saving} />
    </>
  )
}
