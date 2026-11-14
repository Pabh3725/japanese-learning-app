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
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { KanjiReadExercise, type KanjiReadGrade } from '@/components/review/kanji-read-exercise'
import type { ReviewQuestion } from '@/lib/dal/review'
import { withRetry } from '@/lib/retry'
import { speak } from '@/lib/speech'
import type { RecallStep } from '@/lib/types'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."
const SAVE_WARNING = "Some answers couldn't be saved. Those cards will come up again."

/** V11: Card trả lời sai quay lại trong cùng lượt sau 3–5 câu, tối đa 3 lần mỗi Card (docs/learning-rules.md §0c). */
const RETRY_GAP: readonly [number, number] = [3, 5]
const MAX_RETRIES = 3

type SessionQuestion = ReviewQuestion & { retry?: number }

export function ReviewSession({ questions: initialQuestions, capReached, cardsLeft }: { questions: ReviewQuestion[]; capReached: boolean; cardsLeft: number }) {
  const [questions, setQuestions] = useState<SessionQuestion[]>(initialQuestions)
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  // Câu chọn hiện kết quả ngay và lưu ở nền: lưu lỗi thì báo, Card đó sẽ quay lại lần ôn sau
  const [warning, setWarning] = useState<string | null>(null)
  const pending = 0
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
  // Lần đầu của mỗi Card mới tính vào kết quả lượt; câu hỏi lại chỉ để nhớ lại
  const firstTry = (current: SessionQuestion) => (current.retry ?? 0) === 0
  const record = (current: SessionQuestion, correct: boolean) => {
    if (firstTry(current)) setResults((list) => [...list, correct])
    if (correct || (current.retry ?? 0) >= MAX_RETRIES) return
    // Hỏi lại cùng Card với mã câu mới: FSRS tính như một bước học lại
    const again: SessionQuestion = { ...current, clientEventId: crypto.randomUUID(), retry: (current.retry ?? 0) + 1 }
    const gap = RETRY_GAP[0] + Math.floor(Math.random() * (RETRY_GAP[1] - RETRY_GAP[0] + 1))
    setQuestions((list) => {
      const at = Math.min(list.length, index + 1 + gap)
      return [...list.slice(0, at), again, ...list.slice(at)]
    })
  }
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
        record(current, correct)
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
        record(current, correct)
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

  /** V10: câu chọn Kanji trong 6. Mã câu giữ nguyên nên gửi lại không bị tính hai lần. */
  const answerChoice = (current: Extract<ReviewQuestion, { kind: 'choice' }>) => (chosen: string) => {
    speak(current.speak)
    record(current, chosen === current.answer)
    const payload = { cardId: current.cardId, clientEventId: current.clientEventId, exercise: current.exercise, responseMs: responseMs(), answer: chosen }
    saveQueue.current = saveQueue.current
      .then(() => withRetry(() => submitReviewAnswerAction(payload), (res) => res.status === 'conflict'))
      .then((res) => {
        if (res.status !== 'graded' && res.status !== 'not_active' && res.status !== 'not_found') setWarning(SAVE_WARNING)
      })
      .catch(() => setWarning(SAVE_WARNING))
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
    const step = { id: q.clientEventId, type: 'choice' as const, stage: label, question: q.question, prompt: q.prompt, options: q.options, answer: q.answer, optionKind: q.optionKind, explanation: '' }
    body = <ChoiceExercise key={q.clientEventId} step={step} onAnswer={answerChoice(q)} instant wrongNote={WRONG_ANSWER_NOTE} reveal={q.reveal} onComplete={next} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/review" label="Daily Review" sublabel={q.retry ? `Try again · ${index + 1} / ${questions.length}` : `${index + 1} / ${questions.length}`} current={index} total={questions.length} />
      <KnownWordBar vocabularyId={q.vocabularyId} onKnown={removeWord} />
      <ArchiveCardBar kind="vocab" cardId={q.cardId} onArchived={removeCard} />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {body}
    </div>
  )
}
