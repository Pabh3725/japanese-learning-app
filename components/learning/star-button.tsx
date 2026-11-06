'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { setWordStarredAction } from '@/app/learn/actions'
import { withRetry } from '@/lib/retry'
import { cn } from '@/lib/utils'

const StarredContext = createContext<{ starred: ReadonlySet<string>; toggle: (id: string) => void }>({ starred: new Set(), toggle: () => {} })

/** Giữ các từ có sao của cả trang, để mọi nút sao và bộ lọc luôn khớp nhau. */
export function StarredWordsProvider({ ids, refreshOnSave = false, children }: { ids: string[]; refreshOnSave?: boolean; children: ReactNode }) {
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
    // Lỗi thì trả lại như cũ, để nút không báo sai
    withRetry(() => setWordStarredAction(id, on))
      .then((res) => {
        if (res.status !== 'saved') set(id, !on)
        else if (refreshOnSave) router.refresh()
      })
      .catch(() => set(id, !on))
  }

  return <StarredContext.Provider value={{ starred, toggle }}>{children}</StarredContext.Provider>
}

export function useStarredWords() {
  return useContext(StarredContext).starred
}

export function StarButton({ vocabularyId, className }: { vocabularyId: string; className?: string }) {
  const { starred, toggle } = useContext(StarredContext)
  const on = starred.has(vocabularyId)
  const label = on ? 'Remove star: back to the normal path' : 'Star this word: extra practice alongside your normal path'
  return (
    <button
      type="button"
      onClick={() => toggle(vocabularyId)}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-secondary', on ? 'text-yellow' : 'text-muted-foreground hover:text-foreground', className)}
    >
      <Star className={cn('size-5', on && 'fill-current')} aria-hidden="true" />
    </button>
  )
}

export function StarNote({ vocabularyId }: { vocabularyId: string }) {
  if (!useStarredWords().has(vocabularyId)) return null
  return <p className="mt-2 text-sm text-yellow">Starred: you get a short extra round in Learn and its own review card. Your normal path doesn&apos;t change. Remove the star when it feels easy.</p>
}
