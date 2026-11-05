'use client'

import { useState, useTransition } from 'react'
import { completeIntroAction } from '@/app/learn/intro/actions'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { SpeakerButton } from '@/components/learning/speaker-button'
import { KanaIntroExercise } from '@/components/learning/steps/kana-intro-exercise'
import type { IntroWord } from '@/lib/intro/words'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

export function IntroSession({ words }: { words: IntroWord[] }) {
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  if (words.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="No new words right now"
          subtitle="You've met every word on your path, or none are available yet."
          stats={[]}
          primary={{ href: '/library', label: 'Open Library' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  if (index >= words.length) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="New words met!"
          subtitle={`You met ${words.length} new ${words.length === 1 ? 'word' : 'words'}. Practice comes next.`}
          stats={[]}
          primary={{ href: '/learn/intro', label: 'Meet more words' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  const word = words[index]

  // Chỉ sang thẻ tiếp khi server đã lưu, để tiến độ không bao giờ đi trước dữ liệu.
  const complete = () => {
    if (saving) return
    setError(null)
    startSaving(async () => {
      try {
        const { status } = await completeIntroAction(word.id)
        if (status === 'saved') setIndex((i) => i + 1)
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
        label="N5 Vocabulary"
        sublabel={`Word ${index + 1} of ${words.length}`}
        current={index}
        total={words.length}
      />
      <KanaIntroExercise
        key={word.id}
        word={word}
        saving={saving}
        error={error}
        onComplete={complete}
        speaker={<SpeakerButton kana={word.reading} />}
      />
    </div>
  )
}
