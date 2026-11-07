'use client'

// Phần câu hỏi của một phiên khu Learn: câu của Stage 2, 4, 5 đã trộn.
// Câu chọn hiện kết quả ngay và lưu ở nền; câu ghép và câu gõ chờ server chấm vì đáp án không có ở trình duyệt.
import { useEffect, useRef, useState } from 'react'
import { checkStageAnswerAction, submitMatchPenaltiesAction, submitStageAnswerAction, submitStarAnswerAction } from '@/app/learn/actions'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { KnownWordBar } from '@/components/learning/known-word-button'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { SpeakerButton, useJapaneseVoice } from '@/components/learning/speaker-button'
import { AssemblyExercise, type AssemblyGrade } from '@/components/learning/steps/assembly-exercise'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { MatchRoundExercise } from '@/components/learning/steps/match-round-exercise'
import { RecallExercise } from '@/components/learning/steps/recall-exercise'
import { LevelUpCard } from '@/components/learning/steps/level-up-card'
import { RelearnExercise } from '@/components/learning/steps/relearn-exercise'
import { SpeedMatchingGame } from '@/components/practice/speed-matching-game'
import type { SubmitExerciseResponse } from '@/lib/dal/exercise'
import type { MatchPenalty } from '@/lib/exercise/match-round'
import type { AssemblyQuestionData, ChoiceQuestionData, TypingQuestionData, WordReveal } from '@/lib/exercise/stage-questions'
import type { StageQuestion } from '@/lib/dal/stage-session'
import { levelUpOf, type LevelUp } from '@/lib/learn/level-up'
import { RULES_V4 } from '@/lib/learning/rules'
import { shouldRelearn } from '@/lib/learning/stage'
import type { ScoredStage } from '@/lib/learning/types'
import { withRetry } from '@/lib/retry'
import { speak } from '@/lib/speech'
import type { AssemblyStep, ChoiceStep, RecallStep } from '@/lib/types'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."
const SAVE_WARNING = "Some answers couldn't be saved. Check your connection."
const HINT_NOTE = 'Correct with a hint: no points this time.'
const RETRY_NOTE = 'Practice only: this does not change your points.'

type ChoiceQ = Extract<StageQuestion, { kind: 'choice' }>
type AssemblyQ = Extract<StageQuestion, { kind: 'assembly' }>
type TypingQ = Extract<StageQuestion, { kind: 'typing' }>
type AnswerQ = ChoiceQ | AssemblyQ | TypingQ

export function toChoiceStep(q: ChoiceQuestionData & { clientEventId: string }, stageLabel: string, note: string): ChoiceStep {
  return {
    id: q.clientEventId,
    type: 'choice',
    stage: stageLabel,
    question: q.question,
    prompt: q.prompt,
    options: q.options,
    answer: q.answer,
    optionKind: q.optionKind,
    explanation: note,
  }
}

export function toAssemblyStep(q: AssemblyQuestionData & { clientEventId: string }, stageLabel: string): AssemblyStep {
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
    blind: q.blind,
    explanation: '',
  }
}

export function toRecallStep(q: TypingQuestionData & { clientEventId: string }, stageLabel: string): RecallStep {
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
  if (delta < 0) return `−${-delta} points`
  return 'No points this time: the word came up too soon, or today’s limit is reached.'
}

/** Câu nghe: tự đọc một lần, có nút nghe lại. */
export function ListeningPrompt({ kana }: { kana: string }) {
  useEffect(() => {
    speak(kana)
  }, [kana])
  return <SpeakerButton kana={kana} large />
}

interface LearnPracticeProps {
  questions: StageQuestion[]
  /** Số thứ tự của phiên này trong ngày. */
  sessionNumber: number
  /** Số phiên còn lại, kể cả phiên này. */
  sessionsLeft: number
  /** Phiên riêng (Starred words): kết thúc về đây thay vì tổng kết ngày. */
  finish?: { href: string; label: string }
  /** Giữ kỹ năng khi sang phiên kế tiếp. */
  skillQuery?: string
  /** Học hỗn hợp: xong cụm câu thì sang cụm sau, không có màn kết thúc riêng. */
  onDone?: () => void
}

/** Chờ lưu xong rồi mới báo xong cụm. */
function FinishSegment({ pending, onDone }: { pending: number; onDone: () => void }) {
  useEffect(() => {
    if (pending === 0) onDone()
  }, [pending])
  return <p className="m-auto text-sm text-muted-foreground">Saving…</p>
}

export function LearnPractice({ questions: initialQuestions, sessionNumber, sessionsLeft, finish, skillQuery = '', onDone }: LearnPracticeProps) {
  const [questions, setQuestions] = useState(initialQuestions)
  const voice = useJapaneseVoice()
  const [index, setIndex] = useState(0)
  // Đúng hoặc sai của từng câu đã trả lời, để tính tỷ lệ cuối lượt
  const [results, setResults] = useState<boolean[]>([])
  // Điểm và mốc mới của câu chọn. Câu chọn lưu ở nền nên kết quả về sau khi đã hiện đúng/sai.
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  // Thẻ xem lại sau khi sai liên tiếp, hiện trước câu kế tiếp
  const [relearn, setRelearn] = useState<WordReveal | null>(null)
  const lastReveal = useRef<WordReveal | undefined>(undefined)
  // Câu sai trong lượt, hỏi lại một lần ở cuối. Chỉ để luyện: không ghi nhật ký, không đổi điểm và lịch.
  const [retries, setRetries] = useState<AnswerQ[]>([])
  // Mốc mới đạt được. Câu chọn lưu ở nền nên thẻ chúc mừng chờ tới lần chuyển câu kế tiếp, không chen vào câu đang làm.
  const [levelUps, setLevelUps] = useState<LevelUp[]>([])
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null)
  const [levelUpCount, setLevelUpCount] = useState(0)
  const shownAt = useRef(0)
  // Lưu TUẦN TỰ: câu sau chỉ gửi khi câu trước lưu xong → server cấp day_seq đúng thứ tự,
  // luật giãn cách đọc đúng câu trước. Câu chọn không phải chờ: bấm Continue được ngay.
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index])

  if ((relearn || levelUp) && index >= questions.length + retries.length) {
    return (
      <div className="flex min-h-dvh flex-col">
        {levelUp ? (
          <LevelUpCard levelUp={levelUp} onContinue={() => setLevelUp(null)} />
        ) : (
          <RelearnExercise key={relearn!.kana} reveal={relearn!} onContinue={() => setRelearn(null)} />
        )}
      </div>
    )
  }

  const queue: StageQuestion[] = [...questions, ...retries]
  const isRetry = index >= questions.length

  if (index >= queue.length) {
    if (onDone) return <div className="flex min-h-dvh flex-col"><FinishSegment pending={pending} onDone={onDone} /></div>
    const correct = results.filter(Boolean).length
    const wrong = results.length - correct
    const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0
    const hasNext = sessionsLeft > 1
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={pending > 0 ? 'Saving…' : finish ? 'Extra practice done!' : `Session ${sessionNumber} complete!`}
          subtitle={warning ?? `${levelUpCount > 0 ? `${levelUpCount} new ${levelUpCount === 1 ? 'milestone' : 'milestones'}. ` : ''}${hasNext ? `${sessionsLeft - 1} more ${sessionsLeft === 2 ? 'session' : 'sessions'} today. Your progress is saved if you stop here.` : 'You’re done for now.'}`}
          stats={[
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(wrong), tone: 'text-error' },
            { label: 'Accuracy', value: `${accuracy}%`, tone: 'text-cyan' },
          ]}
          primary={hasNext ? { href: `/learn/session?n=${sessionNumber + 1}${skillQuery}`, label: 'Next session' } : (finish ?? { href: '/learn/summary', label: "See today's summary" })}
          busy={!hasNext && pending > 0}
          secondary={hasNext ? { href: '/learn', label: 'Take a break' } : { href: '/learn', label: 'Back to Learn' }}
        />
      </div>
    )
  }

  const q = queue[index]
  const next = () => {
    setIndex((i) => i + 1)
    if (levelUps.length > 0) {
      setLevelUp(levelUps[0])
      setLevelUps((list) => list.slice(1))
    }
  }
  const recordLevelUp = (earned: LevelUp | null) => {
    if (!earned) return
    setLevelUps((list) => [...list, earned])
    setLevelUpCount((n) => n + 1)
  }
  /** Sai lần thứ 3 liên tiếp thì xem lại từ rồi mới sang câu sau. */
  const afterAnswer = (correct: boolean, reveal: WordReveal | undefined) => {
    next()
    if (correct || q.kind === 'match' || q.kind === 'boss' || isRetry) return
    setRetries((list) => [...list, q])
    if (reveal && shouldRelearn(q.wrongStreak + 1)) setRelearn(reveal)
  }
  const responseMs = () => Date.now() - shownAt.current

  const answerChoice = (current: ChoiceQ, exercise: string) => (chosen: string) => {
    // Sai cũng đọc, để người học nghe đúng từ cần đọc lại
    speak(current.speak)
    if (isRetry) return
    setResults((list) => [...list, chosen === current.answer])
    const payload = {
      learnerVocabularyId: current.learnerVocabularyId,
      stage: current.stage,
      exercise,
      answer: chosen,
      clientEventId: current.clientEventId,
      responseMs: responseMs(),
      starSessionId: current.starSessionId,
    }
    const submit = current.starSessionId ? submitStarAnswerAction : submitStageAnswerAction
    setPending((n) => n + 1)
    saveQueue.current = saveQueue.current
      // clientEventId giữ nguyên nên gửi lại không bị tính hai lần. conflict: lịch vừa đổi, tính lại là được.
      .then(() => withRetry(() => submit(payload), (res) => res.status === 'conflict'))
      .then((res) => {
        if (res.status === 'graded') {
          const note = pointsNote(current.stage, res.result)
          if (note) setNotes((all) => ({ ...all, [current.clientEventId]: note }))
          recordLevelUp(levelUpOf(current.stage, res.result, current.reveal))
        } else if (res.status !== 'stage_changed' && res.status !== 'not_found') {
          // Hai trường hợp kia là từ đã học xong trên máy khác, không phải lỗi của người học
          setWarning(SAVE_WARNING)
        }
      })
      .catch(() => setWarning(SAVE_WARNING))
      .finally(() => setPending((n) => n - 1))
  }

  /** Câu ghép và câu gõ: chờ các câu trước lưu xong để day_seq đúng thứ tự, rồi chờ server chấm. */
  const gradeOnServer = (current: AssemblyQ | TypingQ) => async (given: string | string[], usedHint = false): Promise<AssemblyGrade> => {
    const elapsed = responseMs()
    try {
      await saveQueue.current
      if (isRetry) {
        const checked = await checkStageAnswerAction({
          learnerVocabularyId: current.learnerVocabularyId,
          stage: current.stage,
          exercise: current.exercise,
          answer: given,
          clientEventId: current.clientEventId,
        })
        if (checked.status !== 'graded') return { error: SAVE_ERROR }
        speak(checked.reading)
        lastReveal.current = checked.reveal
        return { correct: checked.outcome === 'correct', answer: [checked.answer], explanation: RETRY_NOTE, reveal: checked.reveal }
      }
      const submit = current.starSessionId ? submitStarAnswerAction : submitStageAnswerAction
      const res = await submit({
        starSessionId: current.starSessionId,
        learnerVocabularyId: current.learnerVocabularyId,
        stage: current.stage,
        exercise: current.exercise,
        answer: given,
        clientEventId: current.clientEventId,
        responseMs: elapsed,
        usedHint,
      })
      if (res.status === 'graded') {
        // Đúng nhờ gợi ý vẫn là đúng, chỉ không được điểm
        const correct = res.outcome !== 'wrong'
        speak(res.reading)
        setResults((list) => [...list, correct])
        lastReveal.current = res.reveal
        recordLevelUp(levelUpOf(current.stage, res.result, res.reveal))
        return { correct, answer: [res.answer], explanation: res.outcome === 'hint' ? HINT_NOTE : pointsNote(current.stage, res.result), reveal: res.reveal }
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
        .then(() => withRetry(() => submitMatchPenaltiesAction(penalties)))
        .then((res) => {
          if (res.status !== 'saved') setWarning(SAVE_WARNING)
        })
        .catch(() => setWarning(SAVE_WARNING))
        .finally(() => setPending((n) => n - 1))
    }
    next()
  }

  /** Bỏ mọi câu còn lại của từ này. Câu đang hiện cũng bị bỏ nên câu kế tiếp tự hiện ra. */
  const removeWord = (vocabularyId: string) => {
    setQuestions((list) => list.filter((item, i) => i < index || item.kind === 'match' || item.kind === 'boss' || item.vocabularyId !== vocabularyId))
    setRetries((list) => list.filter((item) => item.vocabularyId !== vocabularyId))
    setRelearn(null)
  }

  const stageLabel = q.kind === 'match' ? 'Stage 5' : q.kind === 'boss' ? 'Boss round' : q.starSessionId ? 'Starred word' : `Stage ${q.stage}`
  // Cùng một câu hỏi lại nên cần key khác, để màn hình bắt đầu mới
  const bodyKey = `${q.clientEventId}${isRetry ? '-retry' : ''}`
  let body: React.ReactNode
  if (q.kind === 'boss') {
    body = <SpeedMatchingGame key={q.clientEventId} words={q.words} mode="mixed" seconds={RULES_V4.bossRound.seconds} onBossDone={next} />
  } else if (q.kind === 'match') {
    body = <MatchRoundExercise key={q.clientEventId} round={q} onDone={finishMatch} />
  } else if (q.kind === 'choice') {
    const listening = q.listenTo !== undefined
    // Chưa biết có giọng Nhật không thì chờ; không có giọng thì đổi sang dạng thay thế, cùng đáp án
    if (listening && voice === 'checking') {
      body = <p className="m-auto text-sm text-muted-foreground">Loading…</p>
    } else {
      const useAudio = listening && voice === 'available'
      const fallback = listening && !useAudio
      const exercise = fallback && q.noVoice ? q.noVoice.exercise : q.exercise
      const step = toChoiceStep(q, stageLabel, isRetry ? RETRY_NOTE : (notes[q.clientEventId] ?? ''))
      body = (
        <ChoiceExercise
          key={bodyKey}
          step={fallback && q.noVoice ? { ...step, question: q.noVoice.question } : step}
          promptNode={useAudio ? <ListeningPrompt kana={q.listenTo!} /> : undefined}
          onAnswer={answerChoice(q, exercise)}
          instant
          wrongNote={WRONG_ANSWER_NOTE}
          reveal={q.reveal}
          onComplete={(correct) => afterAnswer(correct, q.reveal)}
        />
      )
    }
  } else if (q.kind === 'assembly') {
    body = (
      <AssemblyExercise
        key={bodyKey}
        step={toAssemblyStep(q, stageLabel)}
        onComplete={(correct) => afterAnswer(correct, lastReveal.current)}
        onGrade={gradeOnServer(q)}
        wrongNote={WRONG_ANSWER_NOTE}
      />
    )
  } else {
    body = (
      <RecallExercise
        key={bodyKey}
        step={toRecallStep(q, stageLabel)}
        onComplete={(correct) => afterAnswer(correct, lastReveal.current)}
        onGrade={gradeOnServer(q)}
        wrongNote={WRONG_ANSWER_NOTE}
      />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader
        backHref={finish?.href ?? '/learn'}
        label={finish ? 'Starred words' : `Session ${sessionNumber} of ${sessionNumber - 1 + sessionsLeft}`}
        sublabel={q.kind === 'boss' ? 'Boss round' : q.kind === 'match' ? 'Matching round' : isRetry ? `Try again · ${index - questions.length + 1} of ${retries.length}` : `Step ${index + 1} of ${queue.length}`}
        current={index}
        total={queue.length}
      />
      <KnownWordBar vocabularyId={q.kind === 'match' || q.kind === 'boss' || levelUp ? null : q.vocabularyId} onKnown={removeWord} />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      {levelUp ? (
        <LevelUpCard levelUp={levelUp} onContinue={() => setLevelUp(null)} />
      ) : relearn ? (
        <RelearnExercise key={relearn.kana} reveal={relearn} onContinue={() => setRelearn(null)} />
      ) : (
        body
      )}
    </div>
  )
}
