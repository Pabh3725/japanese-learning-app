'use client'

// Phiên ôn Card: mỗi card một câu, máy chấm rồi quy ra rating. Câu chọn hiện kết quả ngay và lưu ở nền;
// câu ghép và câu gõ chờ server chấm vì đáp án không có ở trình duyệt.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitReviewAnswerAction } from '@/app/review/actions'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { KnownWordBar } from '@/components/learning/known-word-button'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { ListeningPrompt, toAssemblyStep, toChoiceStep, toRecallStep } from '@/components/learning/learn-practice'
import { useJapaneseVoice } from '@/components/learning/speaker-button'
import { AssemblyExercise, type AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { RecallExercise } from '@/components/learning/steps/recall-exercise'
import type { ReviewQuestion } from '@/lib/dal/review'
import { withRetry } from '@/lib/retry'
import { speak } from '@/lib/speech'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."
const SAVE_WARNING = "Some answers couldn't be saved. They'll come up again."

type ChoiceQ = Extract<ReviewQuestion, { kind: 'choice' }>
type AssemblyQ = Extract<ReviewQuestion, { kind: 'assembly' }>
type TypingQ = Extract<ReviewQuestion, { kind: 'typing' }>

export function ReviewSession({ questions: initialQuestions, capReached, cardsLeft }: { questions: ReviewQuestion[]; capReached: boolean; cardsLeft: number }) {
  const [questions, setQuestions] = useState(initialQuestions)
  const router = useRouter()
  const voice = useJapaneseVoice()
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [pending, setPending] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
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

  const answerChoice = (current: ChoiceQ, exercise: string) => (chosen: string) => {
    speak(current.speak)
    setResults((list) => [...list, chosen === current.answer])
    const payload = { cardId: current.cardId, clientEventId: current.clientEventId, exercise, answer: chosen, responseMs: responseMs() }
    setPending((n) => n + 1)
    saveQueue.current = saveQueue.current
      // clientEventId giữ nguyên nên gửi lại không bị tính hai lần
      .then(() => withRetry(() => submitReviewAnswerAction(payload), (res) => res.status === 'conflict'))
      .then((res) => {
        if (res.status === 'invalid' || res.status === 'conflict') setWarning(SAVE_WARNING)
      })
      .catch(() => setWarning(SAVE_WARNING))
      .finally(() => setPending((n) => n - 1))
  }

  const gradeOnServer = (current: AssemblyQ | TypingQ) => async (given: string | string[], usedHint = false): Promise<AssemblyGrade> => {
    const elapsed = responseMs()
    try {
      await saveQueue.current
      const res = await submitReviewAnswerAction({
        cardId: current.cardId,
        clientEventId: current.clientEventId,
        exercise: current.exercise,
        answer: given,
        responseMs: elapsed,
        usedHint,
      })
      if (res.status === 'graded') {
        const correct = res.outcome !== 'wrong'
        speak(res.reading)
        setResults((list) => [...list, correct])
        return { correct, answer: [res.answer], reveal: res.reveal }
      }
      // Card đã bị bỏ hoặc tạm ngưng trên máy khác: câu này không còn hiệu lực
      if (res.status === 'not_active' || res.status === 'not_found') {
        next()
        return null
      }
      return { error: SAVE_ERROR }
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  /** Bỏ mọi card còn lại của từ này. Card đang hiện cũng bị bỏ nên câu kế tiếp tự hiện ra. */
  const removeWord = (vocabularyId: string) => {
    setQuestions((list) => list.filter((item, i) => i < index || item.vocabularyId !== vocabularyId))
  }

  const label = 'Review'
  let body: React.ReactNode
  if (q.kind === 'choice') {
    const listening = q.listenTo !== undefined
    if (listening && voice === 'checking') {
      body = <p className="m-auto text-sm text-muted-foreground">Loading…</p>
    } else {
      const useAudio = listening && voice === 'available'
      const fallback = listening && !useAudio
      const exercise = fallback && q.noVoice ? q.noVoice.exercise : q.exercise
      const step = toChoiceStep(q, label, '')
      body = (
        <ChoiceExercise
          key={q.clientEventId}
          step={fallback && q.noVoice ? { ...step, question: q.noVoice.question } : step}
          promptNode={useAudio ? <ListeningPrompt kana={q.listenTo!} /> : undefined}
          onAnswer={answerChoice(q, exercise)}
          instant
          wrongNote={WRONG_ANSWER_NOTE}
          reveal={q.reveal}
          onComplete={next}
        />
      )
    }
  } else if (q.kind === 'assembly') {
    body = (
      <AssemblyExercise key={q.clientEventId} step={toAssemblyStep(q, label)} onComplete={next} onGrade={gradeOnServer(q)} wrongNote={WRONG_ANSWER_NOTE} />
    )
  } else {
    body = (
      <RecallExercise key={q.clientEventId} step={toRecallStep(q, label)} onComplete={next} onGrade={gradeOnServer(q)} wrongNote={WRONG_ANSWER_NOTE} />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/review" label="Daily Review" sublabel={`${index + 1} / ${questions.length}`} current={index} total={questions.length} />
      <KnownWordBar vocabularyId={q.vocabularyId} onKnown={removeWord} />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {body}
    </div>
  )
}
