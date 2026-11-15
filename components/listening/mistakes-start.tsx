'use client'

// Practice · Listening mistakes (docs/listening-rules.md §V2.6).
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { startMistakesListeningAction } from '@/app/listening/actions'
import { actionButton } from '@/components/action-button'
import { CountSelect, SAVE_ERROR } from '@/components/listening/lesson-listening'
import { LISTENING_V1 } from '@/lib/listening/questions'

export function MistakesStart({ open }: { open: number }) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState<number>(10)
  return (
    <section className="flex max-w-2xl flex-col gap-4 rounded-3xl border border-border bg-card p-6">
      <p className="text-3xl font-bold">{open}</p>
      <p className="text-sm text-subtle">
        {open === 0
          ? 'No listening mistakes right now. Questions you get wrong in Grammar listening, Dictation and Numbers listening show up here.'
          : `Listening questions you got wrong. Each one leaves the list after ${LISTENING_V1.mistakeClearStreak} correct answers in a row. Oldest first.`}
      </p>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {open > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CountSelect value={count} options={LISTENING_V1.sessionSizes} onChange={setCount} />
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                setError(null)
                try {
                  const res = await startMistakesListeningAction({ count })
                  if (res.status === 'saved') router.push(`/listening/session/${res.id}`)
                  else setError(SAVE_ERROR)
                } catch {
                  setError(SAVE_ERROR)
                }
              })
            }
            className={actionButton({ size: 'md' })}
          >
            <Play className="fill-current" aria-hidden="true" />
            Practice mistakes
          </button>
        </div>
      )}
    </section>
  )
}
