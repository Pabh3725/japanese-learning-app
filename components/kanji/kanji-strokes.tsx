'use client'

// V9 R12 dạng G: hoạt hình thứ tự nét (KanjiVG). Chỉ để xem, không chấm.
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const STROKE_MS = 550

/** Vẽ lần lượt từng nét theo thứ tự viết. Người dùng chọn giảm chuyển động thì hiện sẵn cả chữ. */
export function KanjiStrokes({ strokes, size = 140, className, label }: { strokes: readonly string[]; size?: number; className?: string; label?: string }) {
  const [run, setRun] = useState(0)
  if (strokes.length === 0) return null
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg
        key={run}
        viewBox="0 0 109 109"
        width={size}
        height={size}
        role="img"
        aria-label={label ?? `Stroke order, ${strokes.length} strokes`}
        className="rounded-2xl bg-secondary/60"
      >
        {/* Đường kẻ phụ chia ô */}
        <path d="M54.5 4v101M4 54.5h101" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" className="text-border" fill="none" />
        {strokes.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="kanji-stroke text-foreground"
            style={{ animationDelay: `${i * STROKE_MS}ms`, animationDuration: `${STROKE_MS}ms` }}
          />
        ))}
      </svg>
      <button type="button" onClick={() => setRun((n) => n + 1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Replay strokes
      </button>
    </div>
  )
}
