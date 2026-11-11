'use client'

// Grammar: phiên Học / Ôn / Luyện thêm. Câu đã dựng sẵn ở server; mỗi câu chấm và lưu ở server.
// Học: câu sai được hỏi lại ở cuối phiên (không điểm, không ghi nhật ký).
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkGrammarAnswerAction, openGrammarPointAction, submitGrammarAnswerAction } from '@/app/grammar/actions'
import { GrammarIntroCard } from '@/components/grammar/grammar-intro'
import { GrammarQuestionView, type GrammarGrade } from '@/components/grammar/grammar-question'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import type { GrammarSession, GrammarStep } from '@/lib/dal/grammar'
import { withRetry } from '@/lib/retry'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."
const LABEL = { learning: 'Grammar · Learn', review: 'Grammar · Review', practice: 'Grammar · Practice' } as const

type QuestionStep = Extract<GrammarStep, { kind: 'question' }>
type Item = GrammarStep & { retry?: boolean }

export function GrammarSessionPlayer({ session }: { session: GrammarSession }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(session.steps)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [learned, setLearned] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(Date.now())
  const questions = session.steps.filter((s) => s.kind === 'question').length

  if (items.length === 0 || index >= items.length) {
    const correct = results.filter(Boolean).length
    const empty = session.steps.length === 0
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={empty ? 'Nothing to do right now' : session.mode === 'review' ? 'Review complete!' : 'Well done!'}
          subtitle={empty ? 'Come back later, or practice the patterns you have opened.' : learned > 0 ? `${learned} ${learned === 1 ? 'pattern' : 'patterns'} learned. They move to Review.` : 'Your progress is saved.'}
          stats={empty ? [] : [
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(results.length - correct), tone: 'text-error' },
          ]}
          primary={{ href: '/grammar', label: 'Back to Grammar' }}
          secondary={{ href: '/', label: 'Home' }}
          onRestart={() => router.refresh()}
        />
      </div>
    )
  }

  const step = items[index]
  const next = () => {
    setIndex((i) => i + 1)
    started.current = Date.now()
  }

  const header = (
    <SessionHeader backHref="/grammar" label={LABEL[session.mode]} sublabel={`${Math.min(results.length + 1, questions)} of ${questions}`} current={results.length} total={Math.max(questions, 1)} />
  )

  if (step.kind === 'intro') {
    const open = async () => {
      setBusy(true)
      setError(null)
      try {
        const res = await withRetry(() => openGrammarPointAction(step.point.code))
        if (res.status !== 'saved') throw new Error(res.status)
        next()
      } catch {
        setError(SAVE_ERROR)
      } finally {
        setBusy(false)
      }
    }
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <ExercisePanel stage="New pattern" question="Meet this pattern" footer={<ContinueFooter label={error ? 'Try again' : 'Continue'} onClick={() => void open()} disabled={busy} hint={error ?? undefined} />}>
          <GrammarIntroCard point={step.point} furigana={session.furigana} />
        </ExercisePanel>
      </div>
    )
  }

  const q = step as QuestionStep & { retry?: boolean }
  const grade = async (answer: string | string[]): Promise<GrammarGrade> => {
    const body = {
      mode: session.mode,
      pointCode: q.pointCode,
      sentenceId: q.question.sentenceId,
      exercise: q.question.exercise,
      seed: q.question.seed,
      answer,
      clientEventId: q.clientEventId,
      responseMs: Date.now() - started.current,
      roundId: q.roundId,
      roundSize: q.roundSize,
    }
    try {
      const res = await withRetry(() => (q.retry ? checkGrammarAnswerAction(body) : submitGrammarAnswerAction(body)), (r) => r.status === 'conflict')
      if (res.status !== 'graded') return { error: SAVE_ERROR }
      if (!q.retry) {
        setResults((r) => [...r, res.correct])
        if (res.completed) setLearned((n) => n + 1)
        // Học: câu sai hỏi lại cuối phiên, không điểm
        if (!res.correct && session.mode === 'learning') setItems((list) => [...list, { ...q, key: `${q.key}:retry`, retry: true }])
      }
      return res
    } catch {
      return { error: SAVE_ERROR }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <GrammarQuestionView
        key={step.key}
        question={q.question}
        stage={q.retry ? 'Try again · no points' : `${LABEL[session.mode]} · ${q.pointCode.replace(/^g(\d+)-(\d+)$/, (_, l: string) => `Lesson ${Number(l)}`)}`}
        furigana={session.furigana}
        onGrade={grade}
        onComplete={next}
      />
    </div>
  )
}
