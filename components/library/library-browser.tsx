'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StarButton, useStarredWords } from '@/components/learning/star-button'
import { Check, Search } from 'lucide-react'
import { markWordsKnownAction, unmarkWordsKnownAction } from '@/app/learn/actions'
import { actionButton } from '@/components/action-button'
import { matchesKanji, matchesVocab } from '@/lib/library/search'
import type { KanjiListItem, VocabListItem, VocabProgress } from '@/lib/library/types'
import { cn } from '@/lib/utils'

type Tab = 'vocab' | 'kanji'

/** Hiển thị từng đợt để trang nhẹ trên điện thoại (912 từ). */
const PAGE_SIZE = 60

function progressStage(p: VocabProgress): number {
  if (p.kind === 'complete') return 5
  if (p.kind === 'learning') return p.stage
  return 0
}

function progressLabel(p: VocabProgress): string {
  if (p.kind === 'complete') return 'Learned'
  if (p.kind === 'learning') return `Stage ${p.stage}`
  return 'Not started'
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'not_started', label: 'Not started' },
  { id: 'learning', label: 'Learning' },
  { id: 'complete', label: 'Learned' },
  { id: 'starred', label: 'Starred' },
  { id: 'known', label: 'Already known' },
] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]['id']

function matchesStatus(v: VocabListItem, status: StatusFilter, starred: ReadonlySet<string>): boolean {
  if (status === 'all') return true
  if (status === 'starred') return starred.has(v.id)
  if (status === 'known') return v.known === true
  return v.known !== true && v.progress.kind === status
}

function StageDots({ progress }: { progress: VocabProgress }) {
  const filled = progressStage(progress)
  const label = progressLabel(progress)
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex gap-1" role="img" aria-label={`${label}, ${filled} of 5 stages`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'size-1.5 rounded-full',
              i < filled ? (progress.kind === 'complete' ? 'bg-success' : 'bg-primary') : 'bg-[#2e3440]',
            )}
          />
        ))}
      </span>
    </span>
  )
}

export function LibraryBrowser({ vocabulary, kanji }: { vocabulary: VocabListItem[]; kanji: KanjiListItem[] }) {
  const [tab, setTab] = useState<Tab>('vocab')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [status, setStatus] = useState<StatusFilter>('all')
  const starred = useStarredWords()
  const [lesson, setLesson] = useState<number | 'all'>('all')
  const [level, setLevel] = useState<string>('all')
  const levels = useMemo(() => [...new Set(vocabulary.map((v) => v.jlpt))].sort().reverse(), [vocabulary])
  const lessons = useMemo(() => [...new Set(vocabulary.filter((v) => level === 'all' || v.jlpt === level).flatMap((v) => (v.lesson === null ? [] : [v.lesson])))].sort((a, b) => a - b), [vocabulary])
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const router = useRouter()

  const vocabResults = useMemo(() => vocabulary.filter((v) => matchesVocab(v, query) && matchesStatus(v, status, starred) && (level === 'all' || v.jlpt === level) && (lesson === 'all' || v.lesson === lesson)), [vocabulary, query, status, level, lesson, starred])
  const shown = vocabResults.slice(0, visible)
  const allShownSelected = shown.length > 0 && shown.every((v) => selected.has(v.id))

  function toggleWord(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function toggleAllShown() {
    setSelected((current) => {
      const next = new Set(current)
      for (const v of shown) {
        if (allShownSelected) next.delete(v.id)
        else next.add(v.id)
      }
      return next
    })
  }

  function saveSelection(save: (ids: string[]) => Promise<{ status: string }>) {
    setError(null)
    startSaving(async () => {
      try {
        const res = await save([...selected])
        if (res.status !== 'saved') throw new Error(res.status)
        setSelected(new Set())
        setSelecting(false)
        router.refresh()
      } catch {
        setError("Couldn't save. Check your connection and try again.")
      }
    })
  }

  function changeStatus(value: StatusFilter) {
    setStatus(value)
    setVisible(PAGE_SIZE)
  }
  const kanjiResults = useMemo(() => kanji.filter((k) => matchesKanji(k, query)), [kanji, query])
  const total = tab === 'vocab' ? vocabResults.length : kanjiResults.length

  function changeQuery(value: string) {
    setQuery(value)
    setVisible(PAGE_SIZE)
  }

  function changeTab(value: Tab) {
    setTab(value)
    setVisible(PAGE_SIZE)
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Library type" className="flex gap-1.5 rounded-2xl bg-secondary p-1.5">
          {(['vocab', 'kanji'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => changeTab(t)}
              className={cn(
                'h-10 flex-1 rounded-xl px-5 text-sm font-medium transition-colors sm:flex-none',
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-subtle',
              )}
            >
              {t === 'vocab' ? `Vocabulary (${vocabulary.length})` : `Kanji (${kanji.length})`}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <span className="sr-only">Search library</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Search by word, reading, meaning or Hán Việt"
            className="h-13 w-full rounded-2xl border border-border bg-card pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus:border-cyan"
          />
        </label>
      </div>

      {tab === 'vocab' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={status === filter.id}
                onClick={() => changeStatus(filter.id)}
                className={cn(
                  'h-9 rounded-full border px-3.5 text-sm transition-colors',
                  status === filter.id ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-subtle">
            Level
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value)
                setLesson('all')
                setVisible(PAGE_SIZE)
              }}
              className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground"
            >
              <option value="all">All</option>
              {levels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-subtle">
            Lesson
            <select
              value={lesson}
              onChange={(e) => {
                setLesson(e.target.value === 'all' ? 'all' : Number(e.target.value))
                setVisible(PAGE_SIZE)
              }}
              className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground"
            >
              <option value="all">All</option>
              {lessons.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => { setSelecting((on) => !on); setSelected(new Set()) }} className="text-sm font-medium text-primary">
            {selecting ? 'Cancel' : 'Select words'}
          </button>
        </div>
      )}

      {tab === 'vocab' && selecting && (
        <div className="sticky top-2 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card p-3 shadow-lg">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium tabular-nums">{selected.size} selected</span>
            <button type="button" onClick={toggleAllShown} className="text-primary">{allShownSelected ? 'Clear shown' : `Select ${shown.length} shown`}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === 'known' ? (
              <button type="button" disabled={selected.size === 0 || saving} onClick={() => saveSelection(unmarkWordsKnownAction)} className={actionButton({ size: 'sm' })}>
                Put back on my path
              </button>
            ) : (
              <button type="button" disabled={selected.size === 0 || saving} onClick={() => saveSelection(markWordsKnownAction)} className={actionButton({ size: 'sm' })}>
                I already know these
              </button>
            )}
          </div>
          {error && <p role="alert" className="w-full text-sm text-error">{error}</p>}
          <p className="w-full text-xs text-muted-foreground">
            {status === 'known' ? 'These words return to your path with their progress.' : 'These words leave your path and do not count toward your daily new words. You can put them back here.'}
          </p>
        </div>
      )}

      <div className="mt-6" role="tabpanel">
        {tab === 'vocab' ? (
          vocabResults.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((v) => (
                <li
                  key={v.id}
                  className={cn('relative flex flex-col gap-3 rounded-2xl border bg-card p-5', selecting && selected.has(v.id) ? 'border-primary' : 'border-border')}
                >
                  {selecting && (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected.has(v.id)}
                      aria-label={`Select ${v.expression}`}
                      onClick={() => toggleWord(v.id)}
                      className="absolute inset-0 z-10 rounded-2xl"
                    >
                      <span className={cn('absolute right-3 bottom-3 flex size-6 items-center justify-center rounded-md border-2', selected.has(v.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
                        {selected.has(v.id) && <Check className="size-4" aria-hidden="true" />}
                      </span>
                    </button>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/library/${v.code}`} lang="ja" className="font-jp text-3xl font-medium hover:text-primary">{v.expression}</Link>
                    <span className="flex items-center gap-1">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                        {v.jlpt} · {v.lesson === null ? `#${v.sortOrder}` : `Lesson ${v.lesson}`}
                      </span>
                      <StarButton vocabularyId={v.id} />
                    </span>
                  </div>
                  <div>
                    {v.reading !== v.expression && <p lang="ja" className="font-jp text-cyan">{v.reading}</p>}
                    {v.hanViet && <p className="text-xs tracking-wider text-yellow uppercase">{v.hanViet}</p>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
                    <p className="font-medium">{v.meaning}</p>
                    {v.known ? <span className="text-xs font-medium text-success">Already known</span> : <StageDots progress={v.progress} />}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState query={query} />
          )
        ) : kanjiResults.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kanjiResults.slice(0, visible).map((k) => (
              <li key={k.id} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center">
                <p lang="ja" className="font-jp text-5xl font-medium">{k.character}</p>
                <p className="mt-1 text-sm font-semibold tracking-wider text-yellow">{k.hanViet}</p>
                <p className="text-sm text-subtle">{k.meaning}</p>
                {(k.onyomi.length > 0 || k.kunyomi.length > 0) && (
                  <p lang="ja" className="font-jp text-xs text-muted-foreground">
                    {[...k.onyomi, ...k.kunyomi].join('・')}
                  </p>
                )}
                {k.strokes !== null && <p className="text-xs text-muted-foreground">{k.strokes} strokes</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState query={query} />
        )}

        {total > visible && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
              className="h-11 rounded-xl border border-border bg-secondary px-5 text-sm font-medium hover:bg-[#252a35]"
            >
              Show more ({total - visible} left)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{query ? <>No results for &ldquo;{query}&rdquo;</> : 'No words here yet'}</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a reading, a meaning without accents, or a Sino-Vietnamese word.</p>
    </div>
  )
}
