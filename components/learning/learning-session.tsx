'use client'

import { useMemo, useState } from 'react'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { StageTrack } from '@/components/learning/stage-track'
import { AssemblyExercise } from '@/components/learning/steps/assembly-exercise'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { FlashcardExercise } from '@/components/learning/steps/flashcard-exercise'
import { KanjiIntroExercise } from '@/components/learning/steps/kanji-intro-exercise'
import { RecallExercise } from '@/components/learning/steps/recall-exercise'
import { buildLearningSession, type LearningMode } from '@/lib/learning-engine'
import type { LearningStep } from '@/lib/types'

function StepRenderer({ step, onComplete }: { step: LearningStep; onComplete: (correct: boolean) => void }) {
  switch (step.type) {
    case 'flashcard':
      return <FlashcardExercise step={step} onComplete={onComplete} />
    case 'kanji-intro':
      return <KanjiIntroExercise step={step} onComplete={onComplete} />
    case 'choice':
      return <ChoiceExercise step={step} onComplete={onComplete} />
    case 'assembly':
      return <AssemblyExercise step={step} onComplete={onComplete} />
    case 'recall':
      return <RecallExercise step={step} onComplete={onComplete} />
  }
}

export function LearningSession({ mode }: { mode: LearningMode }) {
  const session = useMemo(() => buildLearningSession(mode), [mode])
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [run, setRun] = useState(0)

  const stagesPerItem = session.stages.length
  const total = session.steps.length
  const done = index >= total
  const itemIndex = Math.floor(index / stagesPerItem)
  const stageIndex = index % stagesPerItem

  const completedStages = useMemo(() => {
    const set = new Set<number>()
    session.steps.forEach((s, i) => {
      if (Math.floor(i / stagesPerItem) === itemIndex && s.id in results) set.add(i % stagesPerItem)
    })
    return set
  }, [results, session.steps, itemIndex, stagesPerItem])

  const complete = (correct: boolean) => {
    const step = session.steps[index]
    setResults((r) => ({ ...r, [step.id]: correct }))
    setIndex((i) => i + 1)
  }

  const restart = () => {
    setIndex(0)
    setResults({})
    setRun((r) => r + 1)
  }

  const label = mode === 'kanji' ? 'N5 Kanji' : 'N5 Vocabulary'

  if (done) {
    const answered = Object.values(results)
    const correct = answered.filter(Boolean).length
    const accuracy = answered.length ? Math.round((correct / answered.length) * 100) : 100
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="Lesson complete!"
          subtitle={`You learned ${session.items} new ${mode === 'kanji' ? 'Kanji' : 'words'}. They'll show up in tomorrow's review.`}
          stats={[
            { label: 'Accuracy', value: `${accuracy}%`, tone: 'text-success' },
            { label: 'Items', value: String(session.items), tone: 'text-cyan' },
            { label: 'XP', value: `+${correct * 10}`, tone: 'text-yellow' },
          ]}
          primary={{ href: '/review/session', label: 'Start Review' }}
          secondary={{ href: '/', label: 'Back to Home' }}
          onRestart={restart}
        />
      </div>
    )
  }

  const step = session.steps[index]

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader
        backHref="/learn"
        label={label}
        sublabel={`Item ${itemIndex + 1} of ${session.items}`}
        current={index}
        total={total}
      />
      <StageTrack
        stages={session.stages}
        current={stageIndex}
        completed={completedStages}
        onSelect={(s) => setIndex(itemIndex * stagesPerItem + s)}
      />
      <StepRenderer key={`${run}-${step.id}`} step={step} onComplete={complete} />
    </div>
  )
}
