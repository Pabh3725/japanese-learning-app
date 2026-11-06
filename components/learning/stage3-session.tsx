'use client'

import { useState, useTransition } from 'react'
import { completeKanjiIntroAction, completeStage3Action } from '@/app/learn/stage3/actions'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { KanjiIntroExercise } from '@/components/learning/steps/word-kanji-intro-exercise'
import { KanjiRevealExercise } from '@/components/learning/steps/kanji-reveal-exercise'
import type { Stage3Item } from '@/lib/dal/stage3'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

export function Stage3Session({ items }: { items: Stage3Item[] }) {
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  if (items.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="Nothing to meet right now"
          subtitle="New readings come from Stage 2, and new Kanji come from Stage 4."
          stats={[]}
          primary={{ href: '/learn/stage2', label: 'Practice Stage 2' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  if (index >= items.length) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="All met!"
          subtitle="These words now continue in Stage 4."
          stats={[]}
          primary={{ href: '/learn/stage4', label: 'Practice Stage 4' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  const item = items[index]

  const complete = () => {
    if (saving) return
    setError(null)
    startSaving(async () => {
      try {
        const save = item.kind === 'kanji' ? completeKanjiIntroAction : completeStage3Action
        const { status } = await save(item.learnerVocabularyId)
        // Đã mở trên máy khác cũng coi là xong
        if (status === 'saved' || status === 'stage_changed') setIndex((i) => i + 1)
        else setError(SAVE_ERROR)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader
        backHref="/learn"
        label="Stage 3"
        sublabel={`Word ${index + 1} of ${items.length}`}
        current={index}
        total={items.length}
      />
      {item.kind === 'kanji' ? (
        <KanjiIntroExercise key={item.learnerVocabularyId} word={item} saving={saving} error={error} onComplete={complete} />
      ) : (
        <KanjiRevealExercise key={item.learnerVocabularyId} word={item} saving={saving} error={error} onComplete={complete} />
      )}
    </div>
  )
}
