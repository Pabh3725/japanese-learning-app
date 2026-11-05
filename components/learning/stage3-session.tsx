'use client'

import { useState, useTransition } from 'react'
import { completeStage3Action } from '@/app/learn/stage3/actions'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { KanjiRevealExercise } from '@/components/learning/steps/kanji-reveal-exercise'
import type { Stage3Word } from '@/lib/dal/stage3'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

export function Stage3Session({ words }: { words: Stage3Word[] }) {
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  if (words.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="No Kanji to reveal yet"
          subtitle="A word reaches this step after you score enough points in Stage 2."
          stats={[]}
          primary={{ href: '/learn/stage2', label: 'Practice Stage 2' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  if (index >= words.length) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="New Kanji revealed!"
          subtitle="These words now continue in Stage 4."
          stats={[]}
          primary={{ href: '/learn/stage4', label: 'Practice Stage 4' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  const word = words[index]

  const complete = () => {
    if (saving) return
    setError(null)
    startSaving(async () => {
      try {
        const { status } = await completeStage3Action(word.learnerVocabularyId)
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
        sublabel={`Word ${index + 1} of ${words.length}`}
        current={index}
        total={words.length}
      />
      <KanjiRevealExercise key={word.learnerVocabularyId} word={word} saving={saving} error={error} onComplete={complete} />
    </div>
  )
}
