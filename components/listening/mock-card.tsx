'use client'

// Tab JLPT · mảng 聴解: thi thử phần nghe (docs/listening-rules.md §4.2) và 5 đề gần nhất.
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Headphones } from 'lucide-react'
import { startMockListeningAction } from '@/app/listening/actions'
import { actionButton } from '@/components/action-button'
import type { MockHistoryItem } from '@/lib/dal/listening'
import type { JlptLevel } from '@/lib/jlpt/catalog'
import { LISTENING_V1, MOCK_SECTIONS } from '@/lib/listening/questions'

export function MockListeningCard({ level, history }: { level: JlptLevel; history: readonly MockHistoryItem[] }) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const mock = LISTENING_V1.mock[level]
  const total = mock.sections.reduce((a, b) => a + b, 0)
  const mine = history.filter((m) => m.level === level).slice(0, 5)
  return (
    <div className="my-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Mock listening test · {level}</p>
          <p className="text-sm text-muted-foreground">{total} questions · about {mock.minutes} minutes · each audio plays once, no going back</p>
          <p lang="ja" className="mt-1 text-xs text-subtle">{MOCK_SECTIONS.map((s, i) => `${s.nameJa} ${mock.sections[i]}`).join(' · ')}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              setError(null)
              try {
                const res = await startMockListeningAction({ level })
                if (res.status === 'saved') router.push(`/listening/session/${res.id}`)
                else setError("Couldn't start. Check your connection and try again.")
              } catch {
                setError("Couldn't start. Check your connection and try again.")
              }
            })
          }
          className={actionButton({ size: 'md' })}
        >
          <Headphones aria-hidden="true" />
          Start test
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      {mine.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
          {mine.map((m) => (
            <li key={m.id}>
              <Link href={`/listening/session/${m.id}`} className="flex flex-wrap justify-between gap-2 hover:text-primary">
                <span>{new Date(m.date).toLocaleDateString()}</span>
                <span className="text-subtle">
                  {m.correct}/{m.total} · {m.sections.map((s) => `${s.correct}/${s.total}`).join(' · ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
