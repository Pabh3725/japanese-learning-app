'use client'

// Grammar · Listening theo từng mẫu (docs/listening-rules.md §V2.2b): mỗi mẫu 3 chặng × 10 câu, cơ bản → khó dần.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lock, Play } from 'lucide-react'
import { startPointListeningAction } from '@/app/listening/actions'
import { SAVE_ERROR, Tabs } from '@/components/listening/lesson-listening'
import type { PointListeningOverview } from '@/lib/dal/listening'
import { JLPT_LEVELS, LESSONS_OF, type JlptLevel } from '@/lib/jlpt/catalog'
import { POINT_LISTENING } from '@/lib/listening/points'
import { cn } from '@/lib/utils'

const STAGE_NAME = ['Basic', 'Harder', 'Hardest'] as const

export function PointListening({ overview }: { overview: PointListeningOverview }) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [band, setBand] = useState<JlptLevel>('N5')
  const [first, last] = LESSONS_OF[band]
  const lessons = overview.lessons.filter((l) => l.lesson >= first && l.lesson <= last)

  const run = (point: string, stage: number) => {
    setError(null)
    start(async () => {
      try {
        const res = await startPointListeningAction({ point, stage })
        if (res.status === 'saved') router.push(`/listening/session/${res.id}`)
        else setError(SAVE_ERROR)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-subtle">
          Each pattern has {POINT_LISTENING.stages * POINT_LISTENING.perStage} listening questions in {POINT_LISTENING.stages} stages. Get {Math.round(POINT_LISTENING.passRatio * POINT_LISTENING.perStage)}/{POINT_LISTENING.perStage} to open the next stage.
        </p>
        <Tabs value={band} options={JLPT_LEVELS} onChange={setBand} label="Level" />
      </div>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {lessons.map((l) => (
        <section key={l.lesson} aria-labelledby={`l-${l.lesson}`} className="rounded-3xl border border-border bg-card px-5 pt-4 pb-2">
          <h2 id={`l-${l.lesson}`} className="text-sm font-semibold text-muted-foreground">Lesson {l.lesson}</h2>
          <ul className="divide-y divide-border">
            {l.points.map((p) => (
              <li key={p.code} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p lang="ja" className="font-jp text-base">{p.pattern}</p>
                  <p className="text-xs text-muted-foreground">{p.meaning}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {p.stages.map((s) => (
                    <button
                      key={s.stage}
                      type="button"
                      disabled={busy || !s.unlocked}
                      onClick={() => run(p.code, s.stage)}
                      title={s.unlocked ? `Stage ${s.stage}: ${STAGE_NAME[s.stage - 1]}` : 'Pass the previous stage first'}
                      className={cn(
                        'flex h-12 w-20 flex-col items-center justify-center rounded-xl border text-xs transition-colors',
                        s.passed ? 'border-success/50 bg-success/10 text-success' : s.unlocked ? 'border-primary/50 text-primary hover:bg-primary/10' : 'border-border text-muted-foreground opacity-60',
                      )}
                    >
                      <span className="flex items-center gap-1 font-semibold">
                        {s.passed ? <Check className="size-3.5" aria-hidden="true" /> : s.unlocked ? <Play className="size-3 fill-current" aria-hidden="true" /> : <Lock className="size-3" aria-hidden="true" />}
                        {s.stage}
                      </span>
                      <span>{s.best ? `${s.best.correct}/${s.best.total}` : STAGE_NAME[s.stage - 1]}</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Sentences come from the approved grammar sentences, using only vocabulary up to that lesson. It doesn&apos;t change your Grammar schedule.</p>
    </div>
  )
}
