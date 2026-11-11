'use client'

// Library: phần Ngữ pháp. Mọi mẫu đã duyệt (kể cả chưa mở), lọc theo trình độ và bài Minna, tìm theo mẫu hoặc nghĩa.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LibraryGrammarItem {
  code: string
  lesson: number
  level: 'N5' | 'N4'
  pattern: string
  meaning: string
  status: 'locked' | 'new' | 'learning' | 'review'
}

const STATUS = {
  locked: { label: 'Not open', className: 'text-muted-foreground' },
  new: { label: 'Ready', className: 'text-cyan' },
  learning: { label: 'Learning', className: 'text-yellow' },
  review: { label: 'Learned', className: 'text-success' },
} as const

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()

export function GrammarLibrary({ items, query }: { items: LibraryGrammarItem[]; query: string }) {
  const [level, setLevel] = useState<'all' | 'N5' | 'N4'>('all')
  const [lesson, setLesson] = useState<number | 'all'>('all')
  const lessons = useMemo(() => [...new Set(items.filter((i) => level === 'all' || i.level === level).map((i) => i.lesson))].sort((a, b) => a - b), [items, level])
  const q = plain(query.trim())
  const shown = items.filter(
    (i) => (level === 'all' || i.level === level) && (lesson === 'all' || i.lesson === lesson) && (!q || plain(i.pattern).includes(q) || plain(i.meaning).includes(q) || String(i.lesson) === q),
  )

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-subtle">
          Level
          <select value={level} onChange={(e) => { setLevel(e.target.value as typeof level); setLesson('all') }} className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground">
            <option value="all">All</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-subtle">
          Lesson
          <select value={lesson} onChange={(e) => setLesson(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="h-9 rounded-xl border border-border bg-card px-2 text-sm text-foreground">
            <option value="all">All</option>
            {lessons.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span className="text-sm text-muted-foreground tabular-nums">{shown.length} patterns</span>
      </div>
      <div className="mt-6" role="tabpanel">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{items.length === 0 ? 'Grammar content is not available yet.' : 'No grammar pattern matches.'}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((i) => (
              <li key={i.code}>
                <Link href={`/grammar/${i.code}?from=library`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:border-[#3b4250]">
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{i.level} · Lesson {i.lesson}</span>
                    <span lang="ja" className="block font-jp text-lg">{i.pattern}</span>
                    <span className="block text-sm text-subtle">{i.meaning}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className={cn('text-xs font-medium', STATUS[i.status].className)}>{STATUS[i.status].label}</span>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
