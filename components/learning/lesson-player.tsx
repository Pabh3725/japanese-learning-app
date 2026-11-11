'use client'

// V9 bài Learn: mỗi lần một bước do AIS chọn (thẻ giới thiệu, câu, câu kiểm tra nhanh, vòng boss, vòng ghép, màn kết thúc).
// Câu tính điểm lưu bằng các hàm lưu sẵn có (LearnPractice, KanjiPractice nhúng một câu); xong thì hỏi server bước kế tiếp.
// Trạng thái bài ở server: tải lại trang hay đổi máy vẫn tiếp tục đúng bước đang dở.
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { advanceLessonAction, answerMicroAction, skipLessonItemAction } from '@/app/learn/lesson/actions'
import { submitMatchPenaltiesAction } from '@/app/learn/actions'
import { KanjiCard } from '@/components/kanji/kanji-card'
import { KanjiKnownBar } from '@/components/kanji/kanji-known-bar'
import { KanjiPractice } from '@/components/kanji/kanji-session'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { KnownWordBar } from '@/components/learning/known-word-button'
import { LearnPractice } from '@/components/learning/learn-practice'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { NoVoiceNote, SpeakerButton, useAutoSpeak } from '@/components/learning/speaker-button'
import { KanaIntroExercise } from '@/components/learning/steps/kana-intro-exercise'
import { MatchRoundExercise } from '@/components/learning/steps/match-round-exercise'
import { WordKanjiIntroExercise } from '@/components/learning/steps/word-kanji-intro-exercise'
import { TodaySummary } from '@/components/learning/today-summary'
import { SpeedMatchingGame } from '@/components/practice/speed-matching-game'
import type { AdvanceResponse, LessonView } from '@/lib/dal/lesson'
import type { CheckStageAnswerResponse } from '@/lib/dal/stage-session'
import type { SubmitKanjiResponse } from '@/lib/dal/kanji'
import type { MatchPenalty } from '@/lib/exercise/match-round'
import { RULES_V9 } from '@/lib/learning/rules'
import { withRetry } from '@/lib/retry'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

const END_TEXT = {
  target: { title: 'Lesson complete!', subtitle: 'Nice work. Start another lesson whenever you are ready.' },
  budget: { title: "You've reached today's limit", subtitle: 'The rest will come up tomorrow. You can change the daily limit in Settings.' },
  empty: { title: 'Nothing more for now', subtitle: 'Every question due today is done, and words that need space between questions will come back later.' },
} as const

/** Stage 1: hiện từ là đọc ngay; nút to để dễ bấm nghe lại. */
function IntroSpeaker({ kana }: { kana: string }) {
  useAutoSpeak(kana)
  return (
    <>
      <SpeakerButton kana={kana} large />
      <NoVoiceNote />
    </>
  )
}

export function LessonPlayer({ initial, groupsQuery }: { initial: LessonView; groupsQuery: string }) {
  const router = useRouter()
  const [view, setView] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, startBusy] = useTransition()
  // Câu kiểm tra nhanh: server trả luôn bước kế tiếp cùng kết quả chấm, giữ lại tới khi người học bấm Continue
  const microNext = useRef<LessonView | null>(null)
  const step = view.step

  const apply = (res: AdvanceResponse) => {
    if (res.status === 'ok' || (res.status === 'stale' && res.view)) {
      setView(res.view!)
      setError(null)
      return
    }
    setError(SAVE_ERROR)
  }

  /** Đi tiếp sau bước hiện tại. Câu tính điểm: server đọc kết quả từ nhật ký theo mã câu. */
  const advance = (clientEventId?: string) => {
    if (microNext.current) {
      setView(microNext.current)
      microNext.current = null
      return
    }
    setError(null)
    startBusy(async () => {
      try {
        // not_saved: câu vừa trả lời chưa kịp lưu xong, thử lại một nhịp
        apply(await withRetry(() => advanceLessonAction({ lessonId: view.lessonId, stepNo: view.stepNo, clientEventId }), (r) => r.status === 'not_saved'))
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const skip = () => {
    setError(null)
    startBusy(async () => {
      try {
        apply(await withRetry(() => skipLessonItemAction({ lessonId: view.lessonId, stepNo: view.stepNo })))
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const submitMicro = async (answer: string | string[], usedHint: boolean): Promise<CheckStageAnswerResponse | SubmitKanjiResponse | null> => {
    const res = await withRetry(() => answerMicroAction({ lessonId: view.lessonId, stepNo: view.stepNo, answer, usedHint }))
    if (res.status !== 'ok') return null
    microNext.current = res.view
    return res.grade
  }

  const header = (
    <SessionHeader
      backHref="/learn"
      label={view.groups.length === 3 ? 'Lesson' : view.groups[0] === 'vocabulary' ? 'Vocabulary lesson' : view.groups[0] === 'word_kanji' ? 'Kanji words lesson' : 'Kanji lesson'}
      sublabel={step.kind === 'end' ? 'Done' : `${Math.min(view.answered + 1, view.target)} of ${view.target}`}
      current={view.answered}
      total={view.target}
    />
  )

  if (step.kind === 'end') {
    const text = END_TEXT[step.reason]
    const subtitle = step.reason === 'empty' && view.answered < view.target ? `${view.answered} of ${view.target} questions. ${text.subtitle}` : text.subtitle
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={text.title}
          subtitle={subtitle}
          stats={[]}
          primary={step.reason === 'target' ? { href: `/learn/lesson${groupsQuery}${groupsQuery ? '&' : '?'}after=${view.lessonId.slice(0, 8)}`, label: 'Next lesson' } : { href: '/learn', label: 'Back to Learn' }}
          secondary={step.reason === 'target' ? { href: '/learn', label: 'Take a break' } : { href: '/', label: 'Back to Home' }}
          onRestart={() => router.refresh()}
        >
          <TodaySummary />
        </SessionComplete>
      </div>
    )
  }

  const key = `${view.lessonId}-${view.stepNo}`
  let body: React.ReactNode
  if (busy) {
    body = <p className="m-auto text-sm text-muted-foreground">Loading…</p>
  } else if (step.kind === 'intro_word') {
    body = (
      <>
        <KnownWordBar vocabularyId={step.word.id} onKnown={skip} />
        <KanaIntroExercise key={key} word={step.word} saving={busy} error={error} onComplete={() => advance()} speaker={<IntroSpeaker kana={step.word.reading} />} />
      </>
    )
  } else if (step.kind === 'intro_word_kanji') {
    body = <WordKanjiIntroExercise key={key} word={step.word} saving={busy} error={error} onComplete={() => advance()} />
  } else if (step.kind === 'intro_kanji') {
    body = (
      <>
        <KanjiKnownBar kanjiId={step.kanji.kanjiId} onKnown={skip} />
        <ExercisePanel stage="New Kanji" question="Meet this Kanji" footer={<ContinueFooter label={error ? 'Try again' : 'Continue'} onClick={() => advance()} disabled={busy} hint={error ?? undefined} />}>
          <KanjiCard key={key} kanji={step.kanji} examples={step.kanji.examples} />
        </ExercisePanel>
      </>
    )
  } else if (step.kind === 'stage' || step.kind === 'star') {
    const micro = step.kind === 'stage' && step.micro
    body = (
      <LearnPractice
        key={key}
        questions={[step.question]}
        sessionNumber={1}
        sessionsLeft={1}
        onDone={() => advance(micro ? undefined : step.question.clientEventId)}
        lesson={{ micro, submitMicro: submitMicro as (a: string | string[], h: boolean) => Promise<CheckStageAnswerResponse | null>, onKnown: skip }}
      />
    )
  } else if (step.kind === 'kanji') {
    body = (
      <KanjiPractice
        key={key}
        questions={[step.question]}
        onDone={() => advance(step.micro ? undefined : step.question.clientEventId)}
        lesson={{ micro: step.micro, submitMicro: (a) => submitMicro(a, false) as Promise<SubmitKanjiResponse | null>, onKnown: skip, onArchived: skip }}
      />
    )
  } else if (step.kind === 'boss') {
    body = <SpeedMatchingGame key={key} words={step.round.words} mode="mixed" seconds={RULES_V9.bossRound.seconds} onBossDone={() => advance()} />
  } else {
    const finishMatch = (penalties: MatchPenalty[]) => {
      startBusy(async () => {
        try {
          if (penalties.length > 0) await withRetry(() => submitMatchPenaltiesAction(penalties))
          apply(await withRetry(() => advanceLessonAction({ lessonId: view.lessonId, stepNo: view.stepNo })))
        } catch {
          setError(SAVE_ERROR)
        }
      })
    }
    body = <MatchRoundExercise key={key} round={step.round} onDone={finishMatch} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      {error && step.kind !== 'intro_word' && step.kind !== 'intro_word_kanji' && step.kind !== 'intro_kanji' && (
        <div role="alert" className="mx-auto mt-3 flex w-full max-w-2xl items-center justify-between gap-3 px-4 text-sm text-error">
          <span>{error}</span>
          <button type="button" onClick={() => advance(step.kind === 'stage' || step.kind === 'kanji' || step.kind === 'star' ? step.question.clientEventId : undefined)} className="font-medium underline-offset-2 hover:underline">
            Try again
          </button>
        </div>
      )}
      {body}
    </div>
  )
}
