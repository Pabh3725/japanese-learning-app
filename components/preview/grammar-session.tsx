'use client'

import { useMemo, useState } from 'react'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { AssemblyExercise } from '@/components/learning/steps/assembly-exercise'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { EXERCISE_TYPES, shuffled, type GrammarQuestion } from '@/lib/preview/grammar'

/** Phiên xem trước: chấm ngay trên trình duyệt, không lưu. */
export function GrammarSession({ questions }: { questions: GrammarQuestion[] }) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const shuffledOptions = useMemo(() => questions.map((q) => (q.type === 'translate' ? shuffled(q.pieces) : shuffled(q.options))), [questions])

  if (questions.length === 0 || index >= questions.length) {
    const correct = results.filter(Boolean).length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={questions.length === 0 ? 'No matching questions' : 'Practice done!'}
          subtitle={questions.length === 0 ? 'The sample content has no question for this choice. Try ticking more options.' : 'This preview does not save your results.'}
          stats={questions.length === 0 ? [] : [
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(results.length - correct), tone: 'text-error' },
            { label: 'Accuracy', value: `${Math.round((correct / results.length) * 100)}%`, tone: 'text-cyan' },
          ]}
          primary={{ href: '/grammar/practice', label: 'Choose again' }}
          secondary={{ href: '/grammar', label: 'Back to Grammar' }}
        />
      </div>
    )
  }

  const q = questions[index]
  const label = EXERCISE_TYPES.find((t) => t.id === q.type)?.label ?? 'Grammar'
  const finish = (correct: boolean) => {
    setResults((list) => [...list, correct])
    setIndex((i) => i + 1)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/grammar" label="Grammar practice" sublabel={`${index + 1} / ${questions.length}`} current={index} total={questions.length} />
      {q.type === 'translate' ? (
        <AssemblyExercise
          key={index}
          step={{ id: String(index), type: 'assembly', stage: label, question: 'Build the sentence', prompt: { display: q.prompt, kind: 'meaning' }, pool: shuffledOptions[index], answer: q.answer, pieceKind: 'word', explanation: '' }}
          onComplete={finish}
          wrongNote={WRONG_ANSWER_NOTE}
        />
      ) : (
        <ChoiceExercise
          key={index}
          step={{ id: String(index), type: 'choice', stage: label, question: 'Choose the correct answer', prompt: { display: q.prompt, kind: 'kana', hint: q.hint }, options: shuffledOptions[index], answer: q.answer, optionKind: 'kana', explanation: '' }}
          instant
          onComplete={finish}
          wrongNote={WRONG_ANSWER_NOTE}
        />
      )}
    </div>
  )
}
