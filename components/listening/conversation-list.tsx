'use client'

// Practice · Conversation listening: hội thoại theo bài (ngắn / dài), lần làm tốt nhất.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { startConversationAction } from '@/app/listening/actions'
import { SAVE_ERROR, Tabs } from '@/components/listening/lesson-listening'
import type { ConversationOverview } from '@/lib/dal/listening'
import { JLPT_LEVELS, LESSONS_OF, type JlptLevel } from '@/lib/jlpt/catalog'

export function ConversationList({ overview }: { overview: ConversationOverview }) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [band, setBand] = useState<JlptLevel>('N5')
  const [first, last] = LESSONS_OF[band]
  const lessons = overview.lessons.filter((l) => l.lesson >= first && l.lesson <= last)
  const run = (code: string) => {
    setError(null)
    start(async () => {
      try {
        const res = await startConversationAction({ code })
        if (res.status === 'saved') router.push(`/listening/conversation/${res.id}`)
        else setError(SAVE_ERROR)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex justify-end">
        <Tabs value={band} options={JLPT_LEVELS} onChange={setBand} label="Level" />
      </div>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {lessons.length === 0 && <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Conversations for these lessons are coming soon.</p>}
      {lessons.map((l) => (
        <section key={l.lesson} className="rounded-3xl border border-border bg-card px-5 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Lesson {l.lesson}</h2>
          <ul className="divide-y divide-border">
            {l.items.map((c) => (
              <li key={c.code}>
                <button type="button" disabled={busy} onClick={() => run(c.code)} className="flex w-full items-center gap-3 py-3 text-left hover:text-primary disabled:opacity-60">
                  <Play className="size-4 shrink-0 fill-current text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      <span lang="ja" className="mr-2 font-jp">{c.title}</span>
                      <span className="text-xs font-normal text-muted-foreground">{c.kind === 'short' ? 'Short' : 'Long'} · {c.lines} lines · {c.blanks} blanks</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">{c.situation}</span>
                  </span>
                  <span className="shrink-0 text-xs text-subtle">{c.best ? `Best ${c.best.correct}/${c.best.total}` : 'New'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
