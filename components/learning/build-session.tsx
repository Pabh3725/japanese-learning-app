'use client'

import { useEffect, useRef, useState } from 'react'
import { submitKanaAssemblyAction } from '@/app/learn/build/actions'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { AssemblyExercise, type AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import type { KanaAssemblyWord } from '@/lib/dal/kana-assembly'
import type { AssemblyStep } from '@/lib/types'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."

function toStep(word: KanaAssemblyWord): AssemblyStep {
  return {
    id: word.clientEventId,
    type: 'assembly',
    stage: 'Stage 2 · Kana assembly',
    prompt: { display: word.meaning, kind: 'meaning' },
    question: 'Build the reading from the pieces',
    pool: word.pool,
    answer: [],
    slots: word.slots,
    pieceKind: 'kana',
    explanation: '',
  }
}

function pointsNote(delta: number | undefined, passedStage: number | null | undefined) {
  if (passedStage) return `Stage ${passedStage} complete!`
  if (delta === undefined) return undefined
  if (delta > 0) return '+1 point'
  if (delta < 0) return '−1 point'
  return 'No points this time: the word came up too soon, or today’s limit is reached.'
}

export function BuildSession({ words }: { words: KanaAssemblyWord[] }) {
  const [index, setIndex] = useState(0)
  const shownAt = useRef(0)

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index])

  if (words.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="No words to build yet"
          subtitle="Meet some new words first, then come back to practice them."
          stats={[]}
          primary={{ href: '/learn/intro', label: 'Meet new words' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  if (index >= words.length) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="Round complete!"
          subtitle={`You built ${words.length} ${words.length === 1 ? 'word' : 'words'}.`}
          stats={[]}
          primary={{ href: '/learn/build', label: 'Another round' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  const word = words[index]
  const next = () => setIndex((i) => i + 1)

  const grade = async (pieces: string[]): Promise<AssemblyGrade> => {
    try {
      const res = await submitKanaAssemblyAction({
        learnerVocabularyId: word.learnerVocabularyId,
        clientEventId: word.clientEventId,
        pieces,
        responseMs: Date.now() - shownAt.current,
      })
      if (res.status === 'graded') {
        return {
          correct: res.correct,
          answer: res.answer,
          explanation: pointsNote(res.result?.delta, res.result?.passedStage),
        }
      }
      // Từ đã sang stage khác (ví dụ học trên máy khác): câu này không còn hiệu lực.
      if (res.status === 'stage_changed' || res.status === 'not_found') {
        next()
        return null
      }
      return { error: SAVE_ERROR }
    } catch {
      return { error: SAVE_ERROR }
    }
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
      <AssemblyExercise key={word.clientEventId} step={toStep(word)} onComplete={next} onGrade={grade} />
    </div>
  )
}
