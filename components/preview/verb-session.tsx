'use client'

import { useState } from 'react'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { RecallExercise } from '@/components/learning/steps/recall-exercise'

export interface VerbQuestion {
  verb: string
  meaning: string
  formLabel: string
  answer: string
  options: string[]
}

/** Phiên xem trước: chấm ngay trên trình duyệt, không lưu. */
export function VerbSession({ questions, typing }: { questions: VerbQuestion[]; typing: boolean }) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])

  if (questions.length === 0 || index >= questions.length) {
    const correct = results.filter(Boolean).length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={questions.length === 0 ? 'No matching verbs' : 'Practice done!'}
          subtitle={questions.length === 0 ? 'Try ticking more forms or groups.' : 'This preview does not save your results.'}
          stats={questions.length === 0 ? [] : [
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(results.length - correct), tone: 'text-error' },
            { label: 'Accuracy', value: `${Math.round((correct / results.length) * 100)}%`, tone: 'text-cyan' },
          ]}
          primary={{ href: '/verbs', label: 'Choose again' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  const q = questions[index]
  const finish = (correct: boolean) => {
    setResults((list) => [...list, correct])
    setIndex((i) => i + 1)
  }
  const prompt = { display: q.verb, kind: 'kana' as const, hint: q.meaning }
  const question = `What is the ${q.formLabel}?`

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/verbs" label="Verb forms" sublabel={`${index + 1} / ${questions.length}`} current={index} total={questions.length} />
      {typing ? (
        <RecallExercise
          key={index}
          step={{ id: String(index), type: 'recall', stage: q.formLabel, question, prompt, placeholder: 'romaji', accepted: [q.answer], displayAnswer: q.answer, explanation: '', input: 'hiragana' }}
          onComplete={finish}
          wrongNote={WRONG_ANSWER_NOTE}
        />
      ) : (
        <ChoiceExercise
          key={index}
          step={{ id: String(index), type: 'choice', stage: q.formLabel, question, prompt, options: q.options, answer: q.answer, optionKind: 'kana', explanation: '' }}
          instant
          onComplete={finish}
          wrongNote={WRONG_ANSWER_NOTE}
        />
      )}
    </div>
  )
}
