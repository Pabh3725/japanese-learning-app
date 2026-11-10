'use client'

import { useEffect, useState } from 'react'
import { getDaySummaryAction } from '@/app/learn/actions'
import type { DaySummary } from '@/lib/dal/progress'

const percent = (correct: number, answered: number) => (answered > 0 ? `${Math.round((correct / answered) * 100)}%` : '–')

/**
 * Tổng kết hôm nay ở màn kết thúc phiên Learn, để thấy cả ngày đã đi được bao xa.
 * Đọc từ nhật ký sau khi mọi câu đã lưu (`ready`), nên đúng cả khi học nhiều phiên hoặc tải lại trang.
 */
export function TodaySummary({ ready = true }: { ready?: boolean }) {
  const [summary, setSummary] = useState<DaySummary | null>(null)

  useEffect(() => {
    if (!ready) return
    let alive = true
    getDaySummaryAction()
      .then((s) => alive && setSummary(s))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [ready])

  if (!summary || summary.answered === 0) return null
  const { vocabulary: v, wordKanji: w, kanji: k } = summary
  const correct = v.correct + w.correct + k.correct
  const finished = v.completed + w.completed + k.completed
  const rows = [
    { label: 'Vocabulary', s: v, done: `${v.completed} ${v.completed === 1 ? 'stage' : 'stages'} done` },
    { label: 'Kanji words', s: w, done: `${w.completed} ${w.completed === 1 ? 'stage' : 'stages'} done` },
    { label: 'Kanji', s: k, done: `${k.completed} learned` },
  ].filter((row) => row.s.answered > 0)

  return (
    <section aria-label="Today so far" className="w-full rounded-2xl border border-border bg-card p-4 text-left animate-in fade-in duration-300">
      <p className="text-sm font-medium">Today so far</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-semibold tabular-nums">{summary.answered}</p>
          <p className="text-xs text-muted-foreground">questions</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-cyan">{percent(correct, summary.answered)}</p>
          <p className="text-xs text-muted-foreground">correct</p>
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-success">{finished}</p>
          <p className="text-xs text-muted-foreground">finished</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-2">
            <span className="text-subtle">{row.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {row.s.answered} · {percent(row.s.correct, row.s.answered)} · {row.done}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
