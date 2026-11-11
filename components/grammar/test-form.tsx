'use client'

// Grammar §9a: chọn bài Minna (chỉ bài đã học xong mọi mẫu) và số câu, rồi tạo bài kiểm tra.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startGrammarTestAction } from '@/app/grammar/actions'
import { actionButton } from '@/components/action-button'
import { CheckTile } from '@/components/check-tile'
import { cn } from '@/lib/utils'

const COUNTS = [10, 20, 30, 50]

export function GrammarTestForm({ lessons }: { lessons: { lesson: number; ready: boolean; missing: number; total: number }[] }) {
  const router = useRouter()
  const [chosen, setChosen] = useState<number[]>([])
  const [count, setCount] = useState(20)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()

  const go = () =>
    start(async () => {
      setError(null)
      const res = await startGrammarTestAction({ lessons: chosen, count })
      if ('status' in res) setError(res.status === 'not_ready' ? 'Some patterns in these lessons are not learned yet.' : 'Choose at least one lesson.')
      else router.push(`/grammar/test/${res.id}`)
    })

  return (
    <>
      <section aria-labelledby="lessons-title">
        <h2 id="lessons-title" className="mb-3 font-semibold">Lessons</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {lessons.map((l) =>
            l.ready ? (
              <CheckTile key={l.lesson} checked={chosen.includes(l.lesson)} onToggle={() => setChosen((c) => (c.includes(l.lesson) ? c.filter((x) => x !== l.lesson) : [...c, l.lesson]))} title={`Lesson ${l.lesson}`} subtitle={`${l.total} patterns`} />
            ) : (
              <div key={l.lesson} className="rounded-2xl border-2 border-border p-4 opacity-50">
                <p className="font-medium">Lesson {l.lesson}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{l.missing} of {l.total} patterns still to learn</p>
              </div>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="count-title" className="mt-8">
        <h2 id="count-title" className="mb-3 font-semibold">Number of questions</h2>
        <div role="radiogroup" aria-labelledby="count-title" className="grid max-w-md grid-cols-4 gap-2">
          {COUNTS.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={count === value} onClick={() => setCount(value)}
              className={cn('h-12 rounded-2xl border-2 text-sm font-semibold tabular-nums transition-colors', count === value ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle hover:border-[#3b4250]')}>
              {value}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Only the hardest example sentences are used. Your points and review schedule do not change.</p>
      </section>

      {error && <p role="alert" className="mt-6 text-sm text-error">{error}</p>}
      <button type="button" onClick={go} disabled={chosen.length === 0 || busy} className={cn(actionButton({ size: 'lg' }), 'mt-8 w-full md:w-auto md:px-10')}>
        {busy ? 'Preparing…' : 'Start the test'}
      </button>
    </>
  )
}
