'use client'

// Phiên Stage 2 (VOC-02, VOC-03, SCH-02): mỗi từ đến hẹn một câu, trộn bài chọn và bài ghép.
// Bài chọn hiện kết quả ngay và lưu ở nền; bài ghép chờ server chấm vì đáp án không có ở trình duyệt.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitKanaAssemblyAction, submitStage2Answer } from '@/app/learn/stage2/actions'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { AssemblyExercise, type AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import type { SubmitExerciseResponse } from '@/lib/dal/exercise'
import type { Stage2Question } from '@/lib/dal/stage2'
import { formatVnDateTime } from '@/lib/learning/time'
import type { AssemblyStep, ChoiceStep } from '@/lib/types'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."

interface Saved {
  correct: boolean
  delta: number
  movedUp: boolean
}

type ChoiceQuestion = Extract<Stage2Question, { kind: 'choice' }>
type AssemblyQuestion = Extract<Stage2Question, { kind: 'assembly' }>

function toChoiceStep(q: ChoiceQuestion): ChoiceStep {
  const kanaPrompt = q.exercise === 'kana_to_meaning'
  return {
    id: q.clientEventId,
    type: 'choice',
    stage: 'Stage 2',
    question: kanaPrompt ? 'What does this word mean?' : 'Which word means this?',
    prompt: { display: q.prompt, kind: kanaPrompt ? 'kana' : 'meaning' },
    options: q.options,
    answer: q.answer,
    optionKind: kanaPrompt ? 'meaning' : 'kana',
    explanation: '',
  }
}

function toAssemblyStep(q: AssemblyQuestion): AssemblyStep {
  return {
    id: q.clientEventId,
    type: 'assembly',
    stage: 'Stage 2',
    prompt: { display: q.meaning, kind: 'meaning' },
    question: 'Build the reading from the pieces',
    pool: q.pool,
    answer: [],
    slots: q.slots,
    pieceKind: 'kana',
    explanation: '',
  }
}

function pointsNote(result: SubmitExerciseResponse['result']) {
  if (result?.completed) return 'Stage 2 complete! New review card created.'
  if (result?.unlockedStage) return 'Next stage unlocked! Stage 2 continues.'
  const delta = result?.delta
  if (delta === undefined) return undefined
  if (delta > 0) return '+1 point'
  if (delta < 0) return '−1 point'
  return 'No points this time: the word came up too soon, or today’s limit is reached.'
}

function toSaved(correct: boolean, result: SubmitExerciseResponse['result']): Saved | null {
  if (!result) return null
  return { correct, delta: result.delta, movedUp: result.unlockedStage !== null || result.completed }
}

export function Stage2Session({ questions, nextDueAt }: { questions: Stage2Question[]; nextDueAt: string | null }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState<Saved[]>([])
  const [pending, setPending] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  const shownAt = useRef(0)
  // Lưu TUẦN TỰ: câu sau chỉ gửi khi câu trước lưu xong → server cấp day_seq đúng thứ tự,
  // luật giãn cách đọc đúng câu trước. Bài chọn không phải chờ: bấm Continue được ngay.
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index])

  if (questions.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={nextDueAt ? 'All caught up!' : 'No words in Stage 2 yet'}
          subtitle={
            nextDueAt
              ? `Your next Stage 2 question is due at ${formatVnDateTime(new Date(nextDueAt))}.`
              : 'Meet some new words first, then come back to practice them.'
          }
          stats={[]}
          primary={{ href: '/learn/intro', label: 'Meet new words' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  if (index >= questions.length) {
    const correct = saved.filter((s) => s.correct).length
    const points = saved.reduce((n, s) => n + s.delta, 0)
    const moved = saved.filter((s) => s.movedUp).length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={pending > 0 ? 'Saving…' : 'Round complete!'}
          subtitle={warning ?? `You practiced ${questions.length} ${questions.length === 1 ? 'word' : 'words'} in Stage 2.`}
          stats={[
            { label: 'Correct', value: `${correct}/${questions.length}`, tone: 'text-success' },
            { label: 'Stage points', value: `${points >= 0 ? '+' : ''}${points}`, tone: 'text-cyan' },
            { label: 'Moved up', value: String(moved), tone: 'text-yellow' },
          ]}
          primary={{ href: '/learn', label: 'Back to Learn' }}
          secondary={{ href: '/', label: 'Back to Home' }}
          onRestart={() => router.refresh()}
        />
      </div>
    )
  }

  const q = questions[index]
  const next = () => setIndex((i) => i + 1)
  const responseMs = () => Date.now() - shownAt.current

  const answerChoice = (current: ChoiceQuestion) => (chosen: string) => {
    const payload = {
      learnerVocabularyId: current.learnerVocabularyId,
      exercise: current.exercise,
      chosen,
      clientEventId: current.clientEventId,
      responseMs: responseMs(),
    }
    setPending((n) => n + 1)
    saveQueue.current = saveQueue.current
      .then(() => submitStage2Answer(payload))
      .then((res) => {
        const r = res.save
        const entry = r.status === 'saved' ? toSaved(res.outcome === 'correct', r.result) : null
        if (entry) setSaved((list) => [...list, entry])
        else if (r.status !== 'duplicate') setWarning(`Some answers were not saved (${r.status}).`)
      })
      .catch(() => setWarning('Some answers were not saved (network error).'))
      .finally(() => setPending((n) => n - 1))
  }

  const gradeAssembly = (current: AssemblyQuestion) => async (pieces: string[]): Promise<AssemblyGrade> => {
    const elapsed = responseMs()
    try {
      await saveQueue.current // chờ các câu chọn trước đó lưu xong để day_seq đúng thứ tự
      const res = await submitKanaAssemblyAction({
        learnerVocabularyId: current.learnerVocabularyId,
        clientEventId: current.clientEventId,
        pieces,
        responseMs: elapsed,
      })
      if (res.status === 'graded') {
        const entry = toSaved(res.correct, res.result)
        if (entry) setSaved((list) => [...list, entry])
        return { correct: res.correct, answer: res.answer, explanation: pointsNote(res.result) }
      }
      // Từ đã sang stage khác hoặc đã hoàn tất (ví dụ học trên máy khác): câu này không còn hiệu lực.
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
        label="Stage 2"
        sublabel={`Word ${index + 1} of ${questions.length}`}
        current={index}
        total={questions.length}
      />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {q.kind === 'choice' ? (
        <ChoiceExercise
          key={q.clientEventId}
          step={toChoiceStep(q)}
          onAnswer={answerChoice(q)}
          instant
          wrongNote={WRONG_ANSWER_NOTE}
          onComplete={next}
        />
      ) : (
        <AssemblyExercise
          key={q.clientEventId}
          step={toAssemblyStep(q)}
          onComplete={next}
          onGrade={gradeAssembly(q)}
          wrongNote={WRONG_ANSWER_NOTE}
        />
      )}
    </div>
  )
}
