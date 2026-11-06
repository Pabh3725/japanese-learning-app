'use client'

import { useState, useTransition } from 'react'
import { completeIntroAction } from '@/app/learn/intro/actions'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { NoVoiceNote, SpeakerButton, useAutoSpeak } from '@/components/learning/speaker-button'
import { KanaIntroExercise } from '@/components/learning/steps/kana-intro-exercise'
import type { IntroWord } from '@/lib/intro/words'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

/** Stage 1: hiện từ là đọc ngay; nút to để dễ bấm nghe lại. */
function IntroSpeaker({ kana }: { kana: string }) {
  useAutoSpeak(kana)
  return (
    <>
      <SpeakerButton kana={kana} large />
      <NoVoiceNote />
    </>
  )
}

export function IntroSession({ words, newPerDay, limitReached }: { words: IntroWord[]; newPerDay: number; limitReached: boolean }) {
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  if (limitReached && words.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="That's all for today"
          subtitle={`You've met today's ${newPerDay} new ${newPerDay === 1 ? 'word' : 'words'}. Practice them, then come back tomorrow.`}
          stats={[]}
          primary={{ href: '/learn/stage2', label: 'Practice Stage 2' }}
          secondary={{ href: '/settings', label: 'Change daily limit' }}
        />
      </div>
    )
  }

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
          primary={{ href: '/learn/stage2', label: 'Practice Stage 2' }}
          secondary={{ href: '/learn/intro', label: 'Meet more words' }}
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
        speaker={<IntroSpeaker kana={word.reading} />}
      />
    </div>
  )
}
