'use client'

import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { markWordsKnownAction, markWordsLearnedAction, undoWordsLearnedAction, unmarkWordsKnownAction } from '@/app/learn/actions'
import { setKanjiKnownAction } from '@/app/learn/kanji/actions'
import { actionButton } from '@/components/action-button'
import { KanjiStarButton, useStarredKanji } from '@/components/kanji/kanji-star-button'
import { StarButton, useStarredWords } from '@/components/learning/star-button'
import { GrammarLibrary, type LibraryGrammarItem } from '@/components/library/grammar-library'
import { KnownTick, LibraryCard } from '@/components/library/library-card'
import { Select, UndoBar, UnitActions, useSave } from '@/components/library/library-controls'
import { matchesKanji, matchesVocab } from '@/lib/library/search'
import { STATUS_LABELS, unitLabel, type LibraryStatus } from '@/lib/library/status'
import type { KanjiListItem, VocabListItem } from '@/lib/library/types'
import { cn } from '@/lib/utils'

type Tab = 'vocab' | 'kanji' | 'grammar'

/** Hiển thị từng đợt để trang nhẹ trên điện thoại. */
const PAGE_SIZE = 60

const UNDO_LEARNED_CONFIRM = 'Undo "Move to Reviewing"? Their progress goes back to how it was before. Review cards created by this, and their review history, are removed.'

type StatusFilter = 'all' | LibraryStatus | 'starred' | 'marked'

const VOCAB_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'not_started', label: 'Not started' },
  { id: 'learning', label: 'Learning' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'learned', label: 'Learned' },
  { id: 'starred', label: 'Starred' },
  { id: 'marked', label: 'Moved to Reviewing' },
]

const KANJI_FILTERS = VOCAB_FILTERS.filter((f) => f.id !== 'marked')

function Chips<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn('h-9 rounded-full border px-3.5 text-sm transition-colors', value === o.id ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ShowMore({ total, visible, onMore }: { total: number; visible: number; onMore: () => void }) {
  if (total <= visible) return null
  return (
    <div className="mt-6 flex justify-center">
      <button type="button" onClick={onMore} className="h-11 rounded-xl border border-border bg-secondary px-5 text-sm font-medium hover:bg-[#252a35]">
        Show more ({total - visible} left)
      </button>
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{query ? <>No results for &ldquo;{query}&rdquo;</> : 'Nothing here yet'}</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a reading, a meaning without accents, or a Sino-Vietnamese word.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Từ vựng
// ---------------------------------------------------------------------------

function matchesStatus(item: { id: string; status: LibraryStatus; known?: boolean; marked?: boolean }, status: StatusFilter, starred: ReadonlySet<string>): boolean {
  if (status === 'all') return true
  if (status === 'starred') return starred.has(item.id)
  if (status === 'marked') return item.marked === true
  // Learned = không cần ôn: đã đánh dấu (✓) hoặc mọi Card đã lưu trữ
  if (status === 'learned') return item.known === true || item.status === 'learned'
  return item.known !== true && item.status === status
}

function VocabTab({ vocabulary, query }: { vocabulary: VocabListItem[]; query: string }) {
  const starred = useStarredWords()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [level, setLevel] = useState('all')
  const [unit, setUnit] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const save = useSave()

  const levels = useMemo(() => [...new Set(vocabulary.map((v) => v.jlpt))].sort().reverse(), [vocabulary])
  const units = useMemo(() => [...new Set(vocabulary.filter((v) => level === 'all' || v.jlpt === level).flatMap((v) => (v.lesson === null ? [] : [v.lesson])))].sort((a, b) => a - b), [vocabulary, level])
  const inUnit = useMemo(() => vocabulary.filter((v) => (level === 'all' || v.jlpt === level) && (unit === 'all' || v.lesson === Number(unit))), [vocabulary, level, unit])
  const results = useMemo(() => inUnit.filter((v) => matchesVocab(v, query) && matchesStatus(v, status, starred)), [inUnit, query, status, starred])
  const shown = results.slice(0, visible)
  const allShownSelected = shown.length > 0 && shown.every((v) => selected.has(v.id))

  const reset = () => setVisible(PAGE_SIZE)
  const toggleWord = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const toggleAllShown = () =>
    setSelected((current) => {
      const next = new Set(current)
      for (const v of shown) {
        if (allShownSelected) next.delete(v.id)
        else next.add(v.id)
      }
      return next
    })

  const words = (n: number) => `${n} ${n === 1 ? 'word' : 'words'}`
  const markLearned = (ids: string[]) =>
    save.run(() => markWordsLearnedAction(ids), { message: `${words(ids.length)} moved to Reviewing.`, undo: () => undoWordsLearnedAction(ids), confirm: UNDO_LEARNED_CONFIRM })
  // Chỉ đánh dấu (và hoàn tác) những từ chưa đánh dấu từ trước, để Undo không đưa nhầm từ cũ trở lại
  const markKnown = (all: string[]) => {
    const known = new Set(vocabulary.filter((v) => v.known).map((v) => v.id))
    const ids = all.filter((id) => !known.has(id))
    save.run(() => markWordsKnownAction(ids), { message: `${words(ids.length)} marked as learned. No review needed.`, undo: () => unmarkWordsKnownAction(ids) })
  }
  const finishSelection = (action: () => void) => {
    action()
    setSelected(new Set())
    setSelecting(false)
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Chips label="Filter by status" options={VOCAB_FILTERS} value={status} onChange={(v) => { setStatus(v); reset() }} />
        <div className="flex flex-wrap items-center gap-3">
          <Select label="Level" value={level} onChange={(v) => { setLevel(v); setUnit('all'); reset() }} options={[{ value: 'all', label: 'All' }, ...levels.map((l) => ({ value: l, label: l }))]} />
          <Select label="Unit" value={unit} onChange={(v) => { setUnit(v); reset() }} options={[{ value: 'all', label: 'All' }, ...units.map((n) => ({ value: String(n), label: `U${n}` }))]} />
          <button type="button" onClick={() => { setSelecting((on) => !on); setSelected(new Set()) }} className="text-sm font-medium text-primary">
            {selecting ? 'Cancel' : 'Select words'}
          </button>
        </div>
      </div>

      {unit !== 'all' && !selecting && (
        <UnitActions
          unit={unitLabel(level === 'all' ? null : level, Number(unit))}
          count={inUnit.length}
          saving={save.saving}
          onLearned={() => markLearned(inUnit.map((v) => v.id))}
          onKnown={() => markKnown(inUnit.map((v) => v.id))}
        />
      )}

      {selecting && (
        <div className="sticky top-2 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card p-3 shadow-lg">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium tabular-nums">{selected.size} selected</span>
            <button type="button" onClick={toggleAllShown} className="text-primary">{allShownSelected ? 'Clear shown' : `Select ${shown.length} shown`}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === 'learned' ? (
              <button type="button" disabled={selected.size === 0 || save.saving} onClick={() => finishSelection(() => save.run(() => unmarkWordsKnownAction([...selected])))} className={actionButton({ size: 'sm' })}>
                Put back on my path
              </button>
            ) : status === 'marked' ? (
              <button
                type="button"
                disabled={selected.size === 0 || save.saving}
                onClick={() => {
                  if (window.confirm(UNDO_LEARNED_CONFIRM)) finishSelection(() => save.run(() => undoWordsLearnedAction([...selected])))
                }}
                className={actionButton({ size: 'sm' })}
              >
                Undo move to Reviewing
              </button>
            ) : (
              <>
                <button type="button" disabled={selected.size === 0 || save.saving} onClick={() => finishSelection(() => markLearned([...selected]))} className={actionButton({ size: 'sm' })}>
                  Move to Reviewing (It still can be reviewed)
                </button>
                <button type="button" disabled={selected.size === 0 || save.saving} onClick={() => finishSelection(() => markKnown([...selected]))} className={actionButton({ size: 'sm', variant: 'secondary' })}>
                  Mark as learned (Not review)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {save.error && <p role="alert" className="mt-3 text-sm text-error">{save.error}</p>}

      <div className="mt-6" role="tabpanel">
        {results.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((v) => (
              <LibraryCard
                key={v.id}
                title={v.expression}
                href={`/library/${v.code}`}
                reading={v.reading !== v.expression ? v.reading : null}
                hanViet={v.hanViet}
                meaning={v.meaning}
                unit={unitLabel(v.jlpt, v.lesson)}
                status={v.known ? STATUS_LABELS.learned : STATUS_LABELS[v.status]}
                selected={selecting && selected.has(v.id)}
                actions={
                  <>
                    <StarButton vocabularyId={v.id} />
                    <KnownTick
                      on={v.known === true}
                      disabled={save.saving}
                      label="Mark as learned (Not review)"
                      onToggle={() => save.run(() => (v.known ? unmarkWordsKnownAction([v.id]) : markWordsKnownAction([v.id])))}
                    />
                  </>
                }
                overlay={
                  selecting && (
                    <button type="button" role="checkbox" aria-checked={selected.has(v.id)} aria-label={`Select ${v.expression}`} onClick={() => toggleWord(v.id)} className="absolute inset-0 z-10 rounded-2xl">
                      <span className={cn('absolute right-3 bottom-3 flex size-6 items-center justify-center rounded-md border-2', selected.has(v.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
                        {selected.has(v.id) && <Check className="size-4" aria-hidden="true" />}
                      </span>
                    </button>
                  )
                }
              />
            ))}
          </ul>
        ) : (
          <EmptyState query={query} />
        )}
        <ShowMore total={results.length} visible={visible} onMore={() => setVisible((n) => n + PAGE_SIZE)} />
      </div>
      <UndoBar notice={save.notice} onUndo={save.undo} onDismiss={save.dismiss} saving={save.saving} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Kanji: chia theo cấp
// ---------------------------------------------------------------------------

function KanjiTab({ kanji, query }: { kanji: KanjiListItem[]; query: string }) {
  const starred = useStarredKanji()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [level, setLevel] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const save = useSave()
  const levelOf = (k: KanjiListItem) => k.jlpt ?? 'Other'
  const levels = useMemo(() => [...new Set(kanji.map(levelOf))], [kanji])
  const results = useMemo(() => kanji.filter((k) => matchesKanji(k, query) && (level === 'all' || levelOf(k) === level) && matchesStatus(k, status, starred)), [kanji, query, level, status, starred])
  const shown = results.slice(0, visible)
  // Nhóm theo cấp, giữ thứ tự cấp của dữ liệu (N5 trước)
  const groups = levels.map((l) => ({ level: l, items: shown.filter((k) => levelOf(k) === l), total: results.filter((k) => levelOf(k) === l).length })).filter((g) => g.items.length > 0)

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Chips label="Filter by status" options={KANJI_FILTERS} value={status} onChange={(v) => { setStatus(v); setVisible(PAGE_SIZE) }} />
        <Select label="Level" value={level} onChange={(v) => { setLevel(v); setVisible(PAGE_SIZE) }} options={[{ value: 'all', label: 'All' }, ...levels.map((l) => ({ value: l, label: l }))]} />
      </div>
      {save.error && <p role="alert" className="mt-3 text-sm text-error">{save.error}</p>}
      <div className="mt-6 flex flex-col gap-8" role="tabpanel">
        {groups.length ? (
          groups.map((g) => (
            <section key={g.level} aria-labelledby={`kanji-${g.level}`}>
              <h2 id={`kanji-${g.level}`} className="mb-3 text-sm font-semibold text-subtle">
                {g.level} <span className="font-normal text-muted-foreground tabular-nums">· {g.total}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((k) => (
                  <LibraryCard
                    key={k.id}
                    title={k.character}
                    titleClassName="text-4xl"
                    href={`/library/kanji/${encodeURIComponent(k.character)}`}
                    reading={[...k.onyomi, ...k.kunyomi].join('・') || null}
                    hanViet={k.hanViet}
                    meaning={k.meaning}
                    unit={k.jlpt ?? ''}
                    status={k.known ? STATUS_LABELS.learned : STATUS_LABELS[k.status]}
                    actions={
                      <>
                        <KanjiStarButton kanjiId={k.id} />
                        <KnownTick on={k.known === true} disabled={save.saving} label="Mark as learned (Not review)" onToggle={() => save.run(() => setKanjiKnownAction(k.id, !k.known))} />
                      </>
                    }
                  />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <EmptyState query={query} />
        )}
        <ShowMore total={results.length} visible={visible} onMore={() => setVisible((n) => n + PAGE_SIZE)} />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------

export function LibraryBrowser({ vocabulary, kanji, grammar = [], initialTab = 'vocab' }: { vocabulary: VocabListItem[]; kanji: KanjiListItem[]; grammar?: LibraryGrammarItem[]; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [query, setQuery] = useState('')

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Library type" className="flex gap-1.5 rounded-2xl bg-secondary p-1.5">
          {(['vocab', 'kanji', 'grammar'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn('h-10 flex-1 rounded-xl px-5 text-sm font-medium transition-colors sm:flex-none', tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-subtle')}
            >
              {t === 'vocab' ? `Vocabulary (${vocabulary.length})` : t === 'kanji' ? `Kanji (${kanji.length})` : `Grammar (${grammar.length})`}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <span className="sr-only">Search library</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'grammar' ? 'Search by pattern or meaning' : 'Search by word, reading, meaning or Hán Việt'}
            className="h-13 w-full rounded-2xl border border-border bg-card pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus:border-cyan"
          />
        </label>
      </div>

      {tab === 'vocab' && <VocabTab vocabulary={vocabulary} query={query} />}
      {tab === 'kanji' && <KanjiTab kanji={kanji} query={query} />}
      {tab === 'grammar' && <GrammarLibrary items={grammar} query={query} />}
    </div>
  )
}
