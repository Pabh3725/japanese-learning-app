'use client'

// Phiên Kanji: thẻ giới thiệu, rồi câu đến hạn. Câu chọn hiện kết quả ngay và lưu ở nền; câu gõ chờ server chấm.
import { useEffect, useRef, useState } from 'react'
import { checkKanjiAnswerAction, submitKanjiAnswerAction } from '@/app/learn/kanji/actions'
import { KanjiCard } from '@/components/kanji/kanji-card'
import { KanjiKnownBar } from '@/components/kanji/kanji-known-bar'
import { ArchiveCardBar } from '@/components/review/archive-card-bar'
import { ContinueFooter, WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SessionComplete } from '@/components/learning/session-complete'
import { TodaySummary } from '@/components/learning/today-summary'
import { SessionHeader } from '@/components/learning/session-header'
import type { AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { SelfCheckExercise } from '@/components/learning/steps/self-check-exercise'
import { RecallExercise } from '@/components/learning/steps/recall-exercise'
import type { KanjiSessionQuestion, SubmitKanjiResponse } from '@/lib/dal/kanji'
import type { WordReveal } from '@/lib/exercise/stage-questions'
import { REMEMBERED, type KanjiReveal } from '@/lib/kanji/questions'
import { RULES_V9 } from '@/lib/learning/rules'
import { withRetry } from '@/lib/retry'
import { speak } from '@/lib/speech'
import type { ChoiceStep, RecallStep } from '@/lib/types'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."
const SAVE_WARNING = "Some answers couldn't be saved. They'll come up again."
const LEARNED_NOTE = 'Learned! This Kanji now moves to long-term review.'
const RETRY_NOTE = 'Practice only: this try does not change your schedule.'

type ChoiceQ = Extract<KanjiSessionQuestion, { kind: 'choice' }>
type TypingQ = Extract<KanjiSessionQuestion, { kind: 'typing' }>

/** Thẻ đáp án dùng chung với từ vựng: chữ, các âm, Hán Việt, nghĩa. */
function toReveal(kanji: KanjiReveal): WordReveal {
  return {
    expression: kanji.character,
    kana: [...kanji.onyomi, ...kanji.kunyomi].join('、'),
    romaji: null,
    hanViet: kanji.hanViet,
    meaning: kanji.meaning,
  }
}


/** Chờ lưu xong rồi mới báo xong cụm. */
function FinishSegment({ pending, onDone }: { pending: number; onDone: () => void }) {
  useEffect(() => {
    if (pending === 0) onDone()
  }, [pending, onDone])
  return <p className="m-auto text-sm text-muted-foreground">Saving…</p>
}

export interface KanjiLessonEmbed {
  micro: boolean
  /** Lưu câu kiểm tra nhanh, trả kết quả chấm. null khi chưa lưu được. */
  submitMicro: (answer: string) => Promise<SubmitKanjiResponse | null>
  onKnown: (kanjiId: string) => void
  onArchived: (cardId: string) => void
}

export function KanjiPractice({ questions: initialQuestions, onDone, lesson }: { questions: KanjiSessionQuestion[]; onDone?: () => void; lesson?: KanjiLessonEmbed }) {
  const [questions, setQuestions] = useState(initialQuestions)
  // Trong bài Learn, thanh tiêu đề thuộc trình chạy bài nên phần này chỉ lấp chỗ còn lại
  const rootClass = lesson ? 'flex flex-1 flex-col' : 'flex min-h-dvh flex-col'
  // Câu kiểm tra nhanh lưu ở bài (không điểm, không lịch); câu thường lưu như cũ
  const submitAnswer = async (payload: { answer: string } & Record<string, unknown>): Promise<SubmitKanjiResponse> =>
    lesson?.micro ? ((await lesson.submitMicro(payload.answer)) ?? { status: 'invalid' }) : submitKanjiAnswerAction(payload)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [learned, setLearned] = useState(0)
  const [pending, setPending] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  // Câu sai trong lượt, hỏi lại một lần ở cuối. Chỉ để luyện: không ghi nhật ký, không đổi điểm và lịch.
  const [retries, setRetries] = useState<KanjiSessionQuestion[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [relearn, setRelearn] = useState<KanjiReveal | null>(null)
  const shownAt = useRef(0)
  // Lưu tuần tự để hai câu của cùng một chữ không ghi đè nhau
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index])

  const queue = [...questions, ...retries]
  const isRetry = index >= questions.length

  if (relearn) {
    return (
      <div className={rootClass}>
        <ExercisePanel stage="Let's review this Kanji" question="This Kanji needs a little more practice" footer={<ContinueFooter label="Continue" onClick={() => setRelearn(null)} />}>
          <KanjiCard key={relearn.character} kanji={relearn} />
        </ExercisePanel>
      </div>
    )
  }

  if (index >= queue.length) {
    if (onDone) return <div className={rootClass}><FinishSegment pending={pending} onDone={onDone} /></div>
    const correct = results.filter(Boolean).length
    const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0
    return (
      <div className={rootClass}>
        <SessionComplete
          title={pending > 0 ? 'Saving…' : 'Kanji session done!'}
          subtitle={warning ?? (learned > 0 ? `${learned} Kanji moved to long-term review.` : 'Your progress is saved.')}
          stats={[
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(results.length - correct), tone: 'text-error' },
            { label: 'Accuracy', value: `${accuracy}%`, tone: 'text-cyan' },
          ]}
          primary={{ href: '/learn/kanji', label: 'Back to Kanji' }}
          secondary={{ href: '/', label: 'Back to Home' }}
          busy={pending > 0}
        >
          <TodaySummary ready={pending === 0} />
        </SessionComplete>
      </div>
    )
  }

  const q = queue[index]
  const key = `${q.clientEventId}${isRetry ? '-retry' : ''}`
  const responseMs = () => Date.now() - shownAt.current
  const afterAnswer = (correct: boolean) => {
    setIndex((i) => i + 1)
    if (correct || isRetry) return
    if (!lesson) setRetries((list) => [...list, q])
    if (q.wrongStreak + 1 >= RULES_V9.relearnAfterWrong) setRelearn(q.reveal)
  }

  /** Bỏ mọi câu còn lại của chữ này. Câu đang hiện cũng bị bỏ nên câu kế tiếp tự hiện ra. */
  const removeKanji = (kanjiId: string) => {
    setQuestions((list) => list.filter((item, i) => i < index || item.kanjiId !== kanjiId))
    setRetries((list) => list.filter((item) => item.kanjiId !== kanjiId))
  }

  /** Card vừa lưu trữ ("Đã học xong"): chỉ bỏ câu của đúng Card đó. */
  const removeCard = (cardId: string) => {
    setQuestions((list) => list.filter((item, i) => i < index || item.cardId !== cardId))
    setRetries((list) => list.filter((item) => item.cardId !== cardId))
  }

  const answerChoice = (current: ChoiceQ) => (chosen: string) => {
    speak(current.speak)
    if (isRetry) return
    setResults((list) => [...list, chosen === current.answer])
    const payload = { learnerKanjiId: current.learnerKanjiId, cardId: current.cardId, clientEventId: current.clientEventId, exercise: current.exercise, answer: chosen, responseMs: responseMs(), wordId: current.wordId }
    setPending((n) => n + 1)
    saveQueue.current = saveQueue.current
      // Mã câu giữ nguyên nên gửi lại không bị tính hai lần
      .then(() => withRetry(() => submitAnswer(payload), (res) => res.status === 'conflict'))
      .then((res) => {
        if (res.status !== 'graded') setWarning(SAVE_WARNING)
        else if (res.completed) {
          setLearned((n) => n + 1)
          setNotes((all) => ({ ...all, [current.clientEventId]: LEARNED_NOTE }))
        }
      })
      .catch(() => setWarning(SAVE_WARNING))
      .finally(() => setPending((n) => n - 1))
  }

  const gradeTyping = (current: TypingQ) => async (typed: string): Promise<AssemblyGrade> => {
    const payload = { learnerKanjiId: current.learnerKanjiId, cardId: current.cardId, clientEventId: current.clientEventId, exercise: current.exercise, answer: typed, responseMs: responseMs() }
    try {
      await saveQueue.current
      const res = await (isRetry ? checkKanjiAnswerAction(payload) : submitAnswer(payload))
      if (res.status !== 'graded') return { error: SAVE_ERROR }
      const correct = res.outcome !== 'wrong'
      speak(current.speak)
      if (!isRetry) setResults((list) => [...list, correct])
      if (res.completed) setLearned((n) => n + 1)
      // Mẹo gõ đọc từ reveal.kana, nên câu gõ âm chỉ để lại một âm
      const reveal = toReveal(res.reveal)
      return {
        correct,
        answer: [res.answer],
        explanation: isRetry ? RETRY_NOTE : res.completed ? LEARNED_NOTE : undefined,
        reveal: current.input === 'text' ? reveal : { ...reveal, kana: res.answer.split('、')[0] },
      }
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  const baseStage = q.cardType === 'kanji.meaning' ? 'Review · Meaning card' : q.cardType === 'kanji.hanviet' ? 'Review · Sino-Vietnamese card' : 'Learning'
  const stage = lesson?.micro ? `Kanji ${baseStage} · Quick check` : baseStage
  let body: React.ReactNode
  if (q.kind === 'choice') {
    const step: ChoiceStep = {
      id: key,
      type: 'choice',
      stage,
      question: q.question,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      optionKind: q.optionKind,
      explanation: isRetry ? RETRY_NOTE : [q.explanation, notes[q.clientEventId]].filter(Boolean).join(' '),
    }
    body = <ChoiceExercise key={key} step={step} onAnswer={answerChoice(q)} instant wrongNote={WRONG_ANSWER_NOTE} reveal={toReveal(q.reveal)} onComplete={afterAnswer} />
  } else if (q.kind === 'self') {
    const saveSelf = async (remembered: boolean): Promise<string | null> => {
      if (isRetry) return null
      try {
        await saveQueue.current
        const res = await withRetry(
          () => submitAnswer({ learnerKanjiId: q.learnerKanjiId, cardId: q.cardId, clientEventId: q.clientEventId, exercise: q.exercise, answer: remembered ? REMEMBERED : 'forgot', responseMs: responseMs() }),
          (r) => r.status === 'conflict',
        )
        if (res.status !== 'graded') return SAVE_ERROR
        setResults((list) => [...list, remembered])
        return null
      } catch {
        return SAVE_ERROR
      }
    }
    body = <SelfCheckExercise key={key} stage={stage} question={q.question} prompt={q.prompt} answer={q.answer} answerKind={q.exercise === 'meaning_self' ? 'text' : 'jp'} onResult={saveSelf} onComplete={afterAnswer} />
  } else {
    const step: RecallStep = {
      id: key,
      type: 'recall',
      stage,
      prompt: q.prompt,
      question: q.question,
      placeholder: q.placeholder,
      accepted: [],
      displayAnswer: '',
      explanation: '',
      input: q.input,
    }
    body = <RecallExercise key={key} step={step} onComplete={afterAnswer} onGrade={gradeTyping(q)} wrongNote={WRONG_ANSWER_NOTE} />
  }

  return (
    <div className={rootClass}>
      {!lesson && <SessionHeader
        backHref="/learn/kanji"
        label="Kanji"
        sublabel={isRetry ? `Try again · ${index - questions.length + 1} of ${retries.length}` : `${index + 1} of ${questions.length}`}
        current={index}
        total={queue.length}
      />}
      <KanjiKnownBar kanjiId={q.kanjiId} onKnown={lesson ? lesson.onKnown : removeKanji} />
      <ArchiveCardBar kind="kanji" cardId={isRetry || lesson?.micro ? null : (q.cardId ?? null)} onArchived={lesson ? lesson.onArchived : removeCard} />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {body}
    </div>
  )
}
