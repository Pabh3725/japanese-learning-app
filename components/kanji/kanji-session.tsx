'use client'

// Phiên Kanji: thẻ giới thiệu, rồi câu đến hạn. Câu chọn hiện kết quả ngay và lưu ở nền; câu gõ chờ server chấm.
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { checkKanjiAnswerAction, openKanjiAction, submitKanjiAnswerAction } from '@/app/learn/kanji/actions'
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
import type { KanjiIntroItem, KanjiSessionData, KanjiSessionQuestion } from '@/lib/dal/kanji'
import type { WordReveal } from '@/lib/exercise/stage-questions'
import { REMEMBERED, type KanjiReveal } from '@/lib/kanji/questions'
import { RULES_V9 } from '@/lib/learning/rules'
import { formatVnDateTime } from '@/lib/learning/time'
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

function IntroCluster({ items: initialItems }: { items: KanjiIntroItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const item = items[index]

  /** Bỏ qua chữ đang xem: chữ kế tiếp hiện ra; hết cụm thì tải lại để lấy chữ tiếp theo. */
  const removeKanji = (kanjiId: string) => {
    const rest = items.filter((other) => other.kanjiId !== kanjiId)
    if (rest.length === 0 || index >= rest.length) {
      // Chờ một nhịp để lưu xong rồi mới đọc lại danh sách
      setTimeout(() => router.refresh(), 400)
    }
    if (rest.length > 0) {
      setItems(rest)
      setIndex(Math.min(index, rest.length - 1))
    }
  }

  const complete = () => {
    if (saving) return
    setError(null)
    startSaving(async () => {
      try {
        const { status } = await withRetry(() => openKanjiAction(item.kanjiId))
        if (status !== 'saved') throw new Error(status)
        // Xem xong cụm thẻ thì câu đầu tiên của các chữ này đến hẹn ngay
        if (index + 1 < items.length) setIndex(index + 1)
        else router.refresh()
      } catch {
        setError("Couldn't save. Check your connection and try again.")
      }
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/learn/kanji" label="New Kanji" sublabel={`${index + 1} of ${items.length}`} current={index} total={items.length} />
      <KanjiKnownBar kanjiId={item.kanjiId} onKnown={removeKanji} />
      {error && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{error}</p>}
      <ExercisePanel stage="New Kanji" question="Meet this Kanji" footer={<ContinueFooter label={saving ? 'Saving…' : 'Continue'} onClick={complete} disabled={saving} />}>
        <KanjiCard key={item.kanjiId} kanji={item} examples={item.examples} />
      </ExercisePanel>
    </div>
  )
}

/** Chờ lưu xong rồi mới báo xong cụm. */
function FinishSegment({ pending, onDone }: { pending: number; onDone: () => void }) {
  useEffect(() => {
    if (pending === 0) onDone()
  }, [pending, onDone])
  return <p className="m-auto text-sm text-muted-foreground">Saving…</p>
}

export function KanjiPractice({ questions: initialQuestions, onDone }: { questions: KanjiSessionQuestion[]; onDone?: () => void }) {
  const [questions, setQuestions] = useState(initialQuestions)
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
      <div className="flex min-h-dvh flex-col">
        <ExercisePanel stage="Let's review this Kanji" question="This Kanji needs a little more practice" footer={<ContinueFooter label="Continue" onClick={() => setRelearn(null)} />}>
          <KanjiCard key={relearn.character} kanji={relearn} />
        </ExercisePanel>
      </div>
    )
  }

  if (index >= queue.length) {
    if (onDone) return <div className="flex min-h-dvh flex-col"><FinishSegment pending={pending} onDone={onDone} /></div>
    const correct = results.filter(Boolean).length
    const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0
    return (
      <div className="flex min-h-dvh flex-col">
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
    setRetries((list) => [...list, q])
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
      .then(() => withRetry(() => submitKanjiAnswerAction(payload), (res) => res.status === 'conflict'))
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
      const res = await (isRetry ? checkKanjiAnswerAction(payload) : submitKanjiAnswerAction(payload))
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

  const stage = q.cardType === 'kanji.meaning' ? 'Review · Meaning card' : q.cardType === 'kanji.hanviet' ? 'Review · Sino-Vietnamese card' : 'Learning'
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
      explanation: isRetry ? RETRY_NOTE : (notes[q.clientEventId] ?? ''),
    }
    body = <ChoiceExercise key={key} step={step} onAnswer={answerChoice(q)} instant wrongNote={WRONG_ANSWER_NOTE} reveal={toReveal(q.reveal)} onComplete={afterAnswer} />
  } else if (q.kind === 'self') {
    const saveSelf = async (remembered: boolean): Promise<string | null> => {
      if (isRetry) return null
      try {
        await saveQueue.current
        const res = await withRetry(
          () => submitKanjiAnswerAction({ learnerKanjiId: q.learnerKanjiId, cardId: q.cardId, clientEventId: q.clientEventId, exercise: q.exercise, answer: remembered ? REMEMBERED : 'forgot', responseMs: responseMs() }),
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
    <div className="flex min-h-dvh flex-col">
      <SessionHeader
        backHref="/learn/kanji"
        label="Kanji"
        sublabel={isRetry ? `Try again · ${index - questions.length + 1} of ${retries.length}` : `${index + 1} of ${questions.length}`}
        current={index}
        total={queue.length}
      />
      <KanjiKnownBar kanjiId={q.kanjiId} onKnown={removeKanji} />
      <ArchiveCardBar kind="kanji" cardId={isRetry ? null : (q.cardId ?? null)} onArchived={removeCard} />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {body}
    </div>
  )
}

export function KanjiSession({ data }: { data: KanjiSessionData }) {
  if (data.intros.length > 0) return <IntroCluster items={data.intros} />
  if (data.questions.length > 0) return <KanjiPractice questions={data.questions} />
  const subtitle = data.capReached
    ? "You've reached today's Kanji limit. The rest will come up tomorrow."
    : data.nextDueAt
      ? `Your next Kanji question is due at ${formatVnDateTime(new Date(data.nextDueAt))}.`
      : 'No new Kanji for today. Come back tomorrow.'
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionComplete title="All caught up!" subtitle={subtitle} stats={[]} primary={{ href: '/learn/kanji', label: 'Back to Kanji' }} secondary={{ href: '/', label: 'Back to Home' }} />
    </div>
  )
}
