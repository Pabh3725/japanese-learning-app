'use client'

// V10 — Dấu sao cho Kanji, cùng cách làm với từ vựng (components/learning/star-button.tsx).
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { setKanjiStarredAction } from '@/app/learn/kanji/actions'
import { withRetry } from '@/lib/retry'
import { cn } from '@/lib/utils'

const StarredKanjiContext = createContext<{ starred: ReadonlySet<string>; toggle: (id: string) => void }>({ starred: new Set(), toggle: () => {} })

export function StarredKanjiProvider({ ids, refreshOnSave = false, children }: { ids: string[]; refreshOnSave?: boolean; children: ReactNode }) {
  const router = useRouter()
  const [starred, setStarred] = useState<ReadonlySet<string>>(() => new Set(ids))
  const set = (id: string, on: boolean) =>
    setStarred((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const toggle = (id: string) => {
    const on = !starred.has(id)
    set(id, on)
    withRetry(() => setKanjiStarredAction(id, on))
      .then((res) => {
        if (res.status !== 'saved') set(id, !on)
        else if (refreshOnSave) router.refresh()
      })
      .catch(() => set(id, !on))
  }
  return <StarredKanjiContext.Provider value={{ starred, toggle }}>{children}</StarredKanjiContext.Provider>
}

export function useStarredKanji() {
  return useContext(StarredKanjiContext).starred
}

export function KanjiStarButton({ kanjiId, className }: { kanjiId: string; className?: string }) {
  const { starred, toggle } = useContext(StarredKanjiContext)
  const on = starred.has(kanjiId)
  const label = on ? 'Remove star: back to the normal path' : 'Star this Kanji: extra practice alongside your normal path'
  return (
    <button
      type="button"
      onClick={() => toggle(kanjiId)}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-secondary', on ? 'text-yellow' : 'text-muted-foreground hover:text-foreground', className)}
    >
      <Star className={cn('size-5', on && 'fill-current')} aria-hidden="true" />
    </button>
  )
}
