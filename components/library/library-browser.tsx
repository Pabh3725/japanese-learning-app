'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { kanjiList, vocabulary } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type Tab = 'vocab' | 'kanji'

function StrengthDots({ value }: { value: number }) {
  const filled = Math.round(value * 5)
  return (
    <span className="flex gap-1" role="img" aria-label={`Memory strength ${filled} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cn('size-1.5 rounded-full', i < filled ? 'bg-success' : 'bg-[#2e3440]')} />
      ))}
    </span>
  )
}

export function LibraryBrowser() {
  const [tab, setTab] = useState<Tab>('vocab')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const vocabResults = vocabulary.filter((v) =>
    [v.word, v.kana, v.romaji, v.meaning, v.hanViet].some((f) => f.toLowerCase().includes(q)),
  )
  const kanjiResults = kanjiList.filter((k) =>
    [k.char, k.hanViet, k.meaning, k.onyomi, k.kunyomi].some((f) => f.toLowerCase().includes(q)),
  )

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
              onClick={() => setTab(t)}
              className={cn(
                'h-10 flex-1 rounded-xl px-5 text-sm font-medium transition-colors sm:flex-none',
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-subtle',
              )}
            >
              {t === 'vocab' ? `Vocabulary (${vocabulary.length})` : `Kanji (${kanjiList.length})`}
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
            placeholder="Search by word, reading, or meaning"
            className="h-13 w-full rounded-2xl border border-border bg-card pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus:border-cyan"
          />
        </label>
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === 'vocab' ? (
          vocabResults.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vocabResults.map((v) => (
                <li key={v.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p lang="ja" className="font-jp text-3xl font-medium">{v.word}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{v.jlpt}</span>
                  </div>
                  <div>
                    <p lang="ja" className="font-jp text-cyan">{v.kana}</p>
                    <p className="text-xs tracking-wider text-yellow uppercase">{v.hanViet}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <p className="font-medium">{v.meaning}</p>
                    <StrengthDots value={v.strength} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState query={query} />
          )
        ) : kanjiResults.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kanjiResults.map((k) => (
              <li key={k.id} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center">
                <p lang="ja" className="font-jp text-5xl font-medium">{k.char}</p>
                <p className="mt-1 text-sm font-semibold tracking-wider text-yellow">{k.hanViet}</p>
                <p className="text-sm text-subtle">{k.meaning}</p>
                <p className="text-xs text-muted-foreground">{k.strokes} strokes</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState query={query} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">No results for &ldquo;{query}&rdquo;</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a reading, romaji, or Sino-Vietnamese word.</p>
    </div>
  )
}
