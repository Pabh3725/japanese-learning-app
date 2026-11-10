'use client'

// Phiên ôn Card: mỗi card một câu, máy chấm rồi quy ra rating. Câu chọn hiện kết quả ngay và lưu ở nền;
// câu ghép và câu gõ chờ server chấm vì đáp án không có ở trình duyệt.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitReviewAnswerAction } from '@/app/review/actions'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { KnownWordBar } from '@/components/learning/known-word-button'
import { ArchiveCardBar } from '@/components/review/archive-card-bar'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import type { AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { RecallExercise } from '@/components/learning/steps/recall-exercise'
import { SelfCheckExercise } from '@/components/learning/steps/self-check-exercise'
import { KanjiReadExercise, type KanjiReadGrade } from '@/components/review/kanji-read-exercise'
import type { ReviewQuestion } from '@/lib/dal/review'
import { speak } from '@/lib/speech'
import type { RecallStep } from '@/lib/types'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."
const SAVE_WARNING = "Some answers couldn't be saved. They'll come up again."

export function ReviewSession({ questions: initialQuestions, capReached, cardsLeft }: { questions: ReviewQuestion[]; capReached: boolean; cardsLeft: number }) {
  const [questions, setQuestions] = useState(initialQuestions)
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const pending = 0
  const [warning] = useState<string | null>(null)
  const shownAt = useRef(0)
  // Lưu tuần tự để hai câu của cùng một từ không ghi đè nhau
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index])

  if (questions.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={capReached ? "You've reached today's limit" : 'All caught up!'}
          subtitle={capReached ? 'The remaining cards will come up tomorrow.' : 'No cards are due right now. New cards appear the day after a word finishes a stage.'}
          stats={[]}
          primary={{ href: '/learn', label: 'Go to Learn' }}
          secondary={{ href: '/review', label: 'Back to Review' }}
        />
      </div>
    )
  }

  if (index >= questions.length) {
    const correct = results.filter(Boolean).length
    const wrong = results.length - correct
    const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={pending > 0 ? 'Saving…' : 'Review done!'}
          subtitle={warning ?? `You reviewed ${results.length} ${results.length === 1 ? 'card' : 'cards'}. ${cardsLeft > 0 ? `${cardsLeft} more ${cardsLeft === 1 ? 'card is' : 'cards are'} waiting.` : 'No more cards for now.'}`}
          stats={[
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(wrong), tone: 'text-error' },
            { label: 'Accuracy', value: `${accuracy}%`, tone: 'text-cyan' },
          ]}
          primary={{ href: '/review', label: 'Back to Review' }}
          secondary={{ href: '/', label: 'Back to Home' }}
          onRestart={() => router.refresh()}
        />
      </div>
    )
  }

  const q = questions[index]
  const next = () => setIndex((i) => i + 1)
  const responseMs = () => Date.now() - shownAt.current

  /** Server chấm rồi mới tính lịch. Câu tự chấm dựa vào người học. */
  const submit = async (current: ReviewQuestion, fields: { answer?: string; reading?: string; hanViet?: string; remembered?: boolean }) => {
    const elapsed = responseMs()
    await saveQueue.current
    return submitReviewAnswerAction({ cardId: current.cardId, clientEventId: current.clientEventId, exercise: current.exercise, responseMs: elapsed, ...fields })
  }

  const gradeTyping = (current: Extract<ReviewQuestion, { kind: 'typing' }>) => async (typed: string): Promise<AssemblyGrade> => {
    try {
      const res = await submit(current, { answer: typed })
      if (res.status === 'graded') {
        const correct = res.outcome !== 'wrong'
        speak(res.reading)
        setResults((list) => [...list, correct])
        return { correct, answer: [res.answer], reveal: res.reveal }
      }
      // Card đã bị tạm dừng trên máy khác: câu này không còn hiệu lực
      if (res.status === 'not_active' || res.status === 'not_found') {
        next()
        return null
      }
      return { error: SAVE_ERROR }
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  const gradeRead = (current: Extract<ReviewQuestion, { kind: 'kanji_read' }>) => async (reading: string, hanViet: string): Promise<KanjiReadGrade> => {
    try {
      const res = await submit(current, { reading, hanViet })
      if (res.status === 'graded') {
        const correct = res.outcome !== 'wrong'
        speak(res.reading)
        setResults((list) => [...list, correct])
        return { correct, answer: res.answer, reveal: res.reveal }
      }
      if (res.status === 'not_active' || res.status === 'not_found') {
        next()
        return null
      }
      return { error: SAVE_ERROR }
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  const saveSelf = (current: Extract<ReviewQuestion, { kind: 'self' }>) => async (remembered: boolean): Promise<string | null> => {
    try {
      const res = await submit(current, { remembered })
      if (res.status === 'graded' || res.status === 'not_active' || res.status === 'not_found') {
        if (res.status === 'graded') setResults((list) => [...list, remembered])
        return null
      }
      return SAVE_ERROR
    } catch {
      return SAVE_ERROR
    }
  }

  /** Bỏ mọi card còn lại của từ này. Card đang hiện cũng bị bỏ nên câu kế tiếp tự hiện ra. */
  const removeWord = (vocabularyId: string) => {
    setQuestions((list) => list.filter((item, i) => i < index || item.vocabularyId !== vocabularyId))
  }

  /** Card vừa lưu trữ: bỏ khỏi phiên, câu kế tiếp tự hiện ra. */
  const removeCard = (cardId: string) => {
    setQuestions((list) => list.filter((item, i) => i < index || item.cardId !== cardId))
  }

  const label = 'Review'
  let body: React.ReactNode
  if (q.kind === 'typing') {
    const step: RecallStep = { id: q.clientEventId, type: 'recall', stage: label, prompt: q.prompt, question: q.question, placeholder: q.placeholder, accepted: [], displayAnswer: '', explanation: '', input: q.input }
    body = <RecallExercise key={q.clientEventId} step={step} onComplete={next} onGrade={gradeTyping(q)} wrongNote={WRONG_ANSWER_NOTE} />
  } else if (q.kind === 'kanji_read') {
    body = <KanjiReadExercise key={q.clientEventId} stage={label} question={q.question} prompt={q.prompt} wrongNote={WRONG_ANSWER_NOTE} onGrade={gradeRead(q)} onComplete={next} />
  } else {
    body = <SelfCheckExercise key={q.clientEventId} stage={label} question={q.question} prompt={q.prompt} answer={q.answer} reading={q.reading} onResult={saveSelf(q)} onComplete={next} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/review" label="Daily Review" sublabel={`${index + 1} / ${questions.length}`} current={index} total={questions.length} />
      <KnownWordBar vocabularyId={q.vocabularyId} onKnown={removeWord} />
      <ArchiveCardBar kind="vocab" cardId={q.cardId} onArchived={removeCard} />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {body}
    </div>
  )
}
