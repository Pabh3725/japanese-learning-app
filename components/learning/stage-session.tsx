'use client'

// Phiên một Stage tính điểm (2, 4, 5): mỗi từ đến hẹn một câu.
// Câu chọn hiện kết quả ngay và lưu ở nền; câu ghép và câu gõ chờ server chấm vì đáp án không có ở trình duyệt.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitMatchPenaltiesAction, submitStageAnswerAction } from '@/app/learn/actions'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { SpeakerButton, useJapaneseVoice } from '@/components/learning/speaker-button'
import { AssemblyExercise, type AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { MatchRoundExercise } from '@/components/learning/steps/match-round-exercise'
import { RecallExercise } from '@/components/learning/steps/recall-exercise'
import type { SubmitExerciseResponse } from '@/lib/dal/exercise'
import type { MatchPenalty } from '@/lib/exercise/match-round'
import type { StageQuestion } from '@/lib/dal/stage-session'
import { formatVnDateTime } from '@/lib/learning/time'
import type { ScoredStage } from '@/lib/learning/types'
import { speak } from '@/lib/speech'
import type { AssemblyStep, ChoiceStep, RecallStep } from '@/lib/types'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."

interface Saved {
  correct: boolean
  delta: number
  movedUp: boolean
}

type ChoiceQ = Extract<StageQuestion, { kind: 'choice' }>
type AssemblyQ = Extract<StageQuestion, { kind: 'assembly' }>
type TypingQ = Extract<StageQuestion, { kind: 'typing' }>

function toChoiceStep(q: ChoiceQ, stageLabel: string): ChoiceStep {
  return {
    id: q.clientEventId,
    type: 'choice',
    stage: stageLabel,
    question: q.question,
    prompt: q.prompt,
    options: q.options,
    answer: q.answer,
    optionKind: q.optionKind,
    explanation: '',
  }
}

function toAssemblyStep(q: AssemblyQ, stageLabel: string): AssemblyStep {
  return {
    id: q.clientEventId,
    type: 'assembly',
    stage: stageLabel,
    prompt: q.prompt,
    question: q.question,
    pool: q.pool,
    answer: [],
    slots: q.slots,
    pieceKind: q.pieceKind,
    joiner: q.joiner,
    template: q.template,
    explanation: '',
  }
}

function toRecallStep(q: TypingQ, stageLabel: string): RecallStep {
  return {
    id: q.clientEventId,
    type: 'recall',
    stage: stageLabel,
    prompt: q.prompt,
    question: q.question,
    placeholder: q.placeholder,
    accepted: [],
    displayAnswer: '',
    explanation: '',
    input: q.input,
  }
}

function pointsNote(stage: ScoredStage, result: SubmitExerciseResponse['result']) {
  if (result?.completed) return `Stage ${stage} complete!`
  if (result?.unlockedStage) return `Next stage unlocked! Stage ${stage} continues.`
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

/** Câu nghe: tự đọc một lần, có nút nghe lại. */
function ListeningPrompt({ kana }: { kana: string }) {
  useEffect(() => {
    speak(kana)
  }, [kana])
  return <SpeakerButton kana={kana} large />
}

const EMPTY_HINT: Record<ScoredStage, { title: string; subtitle: string; href: string; label: string }> = {
  2: { title: 'No words in Stage 2 yet', subtitle: 'Meet some new words first, then come back to practice them.', href: '/learn/intro', label: 'Meet new words' },
  4: { title: 'No words in Stage 4 yet', subtitle: 'A word reaches this step after you reveal its Kanji in Stage 3.', href: '/learn/stage3', label: 'Open Stage 3' },
  5: { title: 'No words in Stage 5 yet', subtitle: 'A word reaches this step after you score enough points in the stage before it.', href: '/learn', label: 'Back to Learn' },
}

interface StageSessionProps {
  stage: ScoredStage
  questions: StageQuestion[]
  nextDueAt: string | null
}

export function StageSession({ stage, questions, nextDueAt }: StageSessionProps) {
  const router = useRouter()
  const voice = useJapaneseVoice()
  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState<Saved[]>([])
  const [pending, setPending] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  const shownAt = useRef(0)
  // Lưu TUẦN TỰ: câu sau chỉ gửi khi câu trước lưu xong → server cấp day_seq đúng thứ tự,
  // luật giãn cách đọc đúng câu trước. Câu chọn không phải chờ: bấm Continue được ngay.
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index])

  const stageLabel = `Stage ${stage}`

  if (questions.length === 0) {
    const empty = EMPTY_HINT[stage]
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={nextDueAt ? 'All caught up!' : empty.title}
          subtitle={nextDueAt ? `Your next ${stageLabel} question is due at ${formatVnDateTime(new Date(nextDueAt))}.` : empty.subtitle}
          stats={[]}
          primary={nextDueAt ? { href: '/learn', label: 'Back to Learn' } : { href: empty.href, label: empty.label }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }

  if (index >= questions.length) {
    const correct = saved.filter((s) => s.correct).length
    const points = saved.reduce((n, s) => n + s.delta, 0)
    const moved = saved.filter((s) => s.movedUp).length
    const answerable = questions.filter((question) => question.kind !== 'match').length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={pending > 0 ? 'Saving…' : 'Round complete!'}
          subtitle={warning ?? `You practiced ${answerable} ${answerable === 1 ? 'word' : 'words'} in ${stageLabel}.`}
          stats={[
            { label: 'Correct', value: `${correct}/${answerable}`, tone: 'text-success' },
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

  const answerChoice = (current: ChoiceQ, exercise: string) => (chosen: string) => {
    if (chosen === current.answer) speak(current.speak)
    const payload = {
      learnerVocabularyId: current.learnerVocabularyId,
      stage,
      exercise,
      answer: chosen,
      clientEventId: current.clientEventId,
      responseMs: responseMs(),
    }
    setPending((n) => n + 1)
    saveQueue.current = saveQueue.current
      .then(() => submitStageAnswerAction(payload))
      .then((res) => {
        if (res.status === 'graded') {
          const entry = toSaved(res.outcome === 'correct', res.result)
          if (entry) setSaved((list) => [...list, entry])
        } else {
          setWarning(`Some answers were not saved (${res.status}).`)
        }
      })
      .catch(() => setWarning('Some answers were not saved (network error).'))
      .finally(() => setPending((n) => n - 1))
  }

  /** Câu ghép và câu gõ: chờ các câu trước lưu xong để day_seq đúng thứ tự, rồi chờ server chấm. */
  const gradeOnServer = (current: AssemblyQ | TypingQ) => async (given: string | string[]): Promise<AssemblyGrade> => {
    const elapsed = responseMs()
    try {
      await saveQueue.current
      const res = await submitStageAnswerAction({
        learnerVocabularyId: current.learnerVocabularyId,
        stage,
        exercise: current.exercise,
        answer: given,
        clientEventId: current.clientEventId,
        responseMs: elapsed,
      })
      if (res.status === 'graded') {
        const correct = res.outcome === 'correct'
        if (correct) speak(res.reading)
        const entry = toSaved(correct, res.result)
        if (entry) setSaved((list) => [...list, entry])
        return { correct, answer: [res.answer], explanation: pointsNote(stage, res.result) }
      }
      // Từ đã hoàn tất stage này (ví dụ học trên máy khác): câu này không còn hiệu lực.
      if (res.status === 'stage_changed' || res.status === 'not_found') {
        next()
        return null
      }
      return { error: SAVE_ERROR }
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  /** Vòng ghép ô: lưu ở nền theo cùng hàng đợi, người học đi tiếp ngay. */
  const finishMatch = (penalties: MatchPenalty[]) => {
    if (penalties.length > 0) {
      setPending((n) => n + 1)
      saveQueue.current = saveQueue.current
        .then(() => submitMatchPenaltiesAction(penalties))
        .then((res) => {
          if (res.status !== 'saved') setWarning('Some answers were not saved.')
        })
        .catch(() => setWarning('Some answers were not saved (network error).'))
        .finally(() => setPending((n) => n - 1))
    }
    next()
  }

  let body: React.ReactNode
  if (q.kind === 'match') {
    body = <MatchRoundExercise key={q.clientEventId} round={q} onDone={finishMatch} />
  } else if (q.kind === 'choice') {
    const listening = q.listenTo !== undefined
    // Chưa biết có giọng Nhật không thì chờ; không có giọng thì đổi sang chọn Kana theo nghĩa, cùng đáp án
    if (listening && voice === 'checking') {
      body = <p className="m-auto text-sm text-muted-foreground">Loading…</p>
    } else {
      const useAudio = listening && voice === 'available'
      const fallback = listening && !useAudio
      const exercise = fallback ? 'meaning_to_kana' : q.exercise
      const step = toChoiceStep(q, stageLabel)
      body = (
        <ChoiceExercise
          key={q.clientEventId}
          step={fallback ? { ...step, question: 'Which word means this?' } : step}
          promptNode={useAudio ? <ListeningPrompt kana={q.listenTo!} /> : undefined}
          onAnswer={answerChoice(q, exercise)}
          instant
          wrongNote={WRONG_ANSWER_NOTE}
          onComplete={next}
        />
      )
    }
  } else if (q.kind === 'assembly') {
    body = (
      <AssemblyExercise
        key={q.clientEventId}
        step={toAssemblyStep(q, stageLabel)}
        onComplete={next}
        onGrade={gradeOnServer(q)}
        wrongNote={WRONG_ANSWER_NOTE}
      />
    )
  } else {
    body = (
      <RecallExercise
        key={q.clientEventId}
        step={toRecallStep(q, stageLabel)}
        onComplete={next}
        onGrade={gradeOnServer(q)}
        wrongNote={WRONG_ANSWER_NOTE}
      />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader
        backHref="/learn"
        label={stageLabel}
        sublabel={q.kind === 'match' ? 'Matching round' : `Step ${index + 1} of ${questions.length}`}
        current={index}
        total={questions.length}
      />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {body}
    </div>
  )
}
