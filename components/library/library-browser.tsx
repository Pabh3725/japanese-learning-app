'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
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

  const vocabResults = useMemo(() => vocabulary.filter((v) => matchesVocab(v, query)), [vocabulary, query])
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

      <div className="mt-6" role="tabpanel">
        {tab === 'vocab' ? (
          vocabResults.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vocabResults.slice(0, visible).map((v) => (
                <li key={v.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p lang="ja" className="font-jp text-3xl font-medium">{v.expression}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                      #{v.sortOrder}
                    </span>
                  </div>
                  <div>
                    {v.reading !== v.expression && <p lang="ja" className="font-jp text-cyan">{v.reading}</p>}
                    {v.hanViet && <p className="text-xs tracking-wider text-yellow uppercase">{v.hanViet}</p>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
                    <p className="font-medium">{v.meaning}</p>
                    <StageDots progress={v.progress} />
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
      <p className="font-medium">No results for &ldquo;{query}&rdquo;</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a reading, a meaning without accents, or a Sino-Vietnamese word.</p>
    </div>
  )
}
