'use client'

// Grammar §9a: làm bài kiểm tra. Không báo đúng/sai từng câu; nộp bài xong mới hiện điểm và xem lại câu sai.
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { finishGrammarTestAction, saveTestAnswerAction } from '@/app/grammar/actions'
import { actionButton } from '@/components/action-button'
import { GrammarQuestionView } from '@/components/grammar/grammar-question'
import { RubySentence } from '@/components/grammar/ruby-sentence'
import { SessionHeader } from '@/components/learning/session-header'
import type { GrammarTestResult, GrammarTestView } from '@/lib/dal/grammar-test'
import { EXERCISE_LABELS } from '@/lib/grammar/labels'
import { withRetry } from '@/lib/retry'
import { cn } from '@/lib/utils'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

function Results({ r, furigana }: { r: GrammarTestResult; furigana: boolean }) {
  const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0
  const wrong = r.items.filter((i) => !i.correct)
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="rounded-3xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Your score</p>
        <p className={cn('mt-1 text-5xl font-semibold tabular-nums', pct >= 80 ? 'text-success' : pct >= 50 ? 'text-yellow' : 'text-error')}>{pct}%</p>
        <p className="mt-1 text-subtle tabular-nums">{r.correct} of {r.total} correct</p>
      </div>
      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="mb-3 font-semibold">By pattern</h2>
        <ul className="flex flex-col divide-y divide-border">
          {r.byPoint.map((p) => (
            <li key={p.code} className="flex items-center justify-between gap-3 py-2">
              <Link href={`/grammar/${p.code}`} lang="ja" className="font-jp hover:text-primary">{p.pattern}</Link>
              <span className={cn('text-sm tabular-nums', p.correct * 2 <= p.total ? 'text-error' : 'text-subtle')}>{p.correct}/{p.total}</span>
            </li>
          ))}
        </ul>
        {r.byPoint.some((p) => p.correct * 2 <= p.total) && <p className="mt-3 text-sm text-muted-foreground">Patterns in red are worth more practice.</p>}
      </section>
      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="mb-3 font-semibold">By exercise type</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {r.byExercise.map((e) => (
            <li key={e.exercise} className="flex justify-between text-sm"><span>{EXERCISE_LABELS[e.exercise].title}</span><span className="tabular-nums text-subtle">{e.correct}/{e.total}</span></li>
          ))}
        </ul>
      </section>
      {wrong.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="mb-3 font-semibold">Review your mistakes</h2>
          <ul className="flex flex-col gap-4">
            {wrong.map((i) => (
              <li key={i.index} className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Question {i.index + 1}</p>
                <RubySentence pieces={i.sentence} furigana={furigana} className="text-xl md:text-2xl" />
                <p className="text-sm text-subtle">{i.meaning}</p>
                <p className="mt-2 text-sm">Correct answer: <span lang="ja" className="font-jp text-primary">{i.expected === 'true' ? 'the sentence is correct' : i.expected === 'false' ? 'the sentence is not correct' : i.expected}</span></p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/grammar/test" className={cn(actionButton({ size: 'lg' }), 'flex-1')}>New test</Link>
        <Link href="/grammar" className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'flex-1')}>Back to Grammar</Link>
      </div>
    </div>
  )
}

export function GrammarTestPlayer({ test }: { test: GrammarTestView }) {
  const firstOpen = test.questions.findIndex((_, i) => test.answers[i] === undefined)
  const [index, setIndex] = useState(firstOpen === -1 ? test.questions.length - 1 : firstOpen)
  const [answers, setAnswers] = useState(test.answers)
  const [result, setResult] = useState<GrammarTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()

  if (result) return <Results r={result} furigana={test.furigana} />

  const finish = () =>
    start(async () => {
      setError(null)
      try {
        const r = await withRetry(() => finishGrammarTestAction(test.id))
        if ('status' in r) setError(SAVE_ERROR)
        else setResult(r)
      } catch {
        setError(SAVE_ERROR)
      }
    })

  const q = test.questions[index]
  const last = index === test.questions.length - 1
  const answered = Object.keys(answers).length

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/grammar" label="Grammar · Test" sublabel={`${index + 1} of ${test.questions.length}`} current={answered} total={test.questions.length} />
      {error && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{error}</p>}
      <GrammarQuestionView
        key={index}
        question={q}
        stage={`Question ${index + 1}`}
        furigana={test.furigana}
        initial={answers[index]}
        nextLabel={busy ? 'Saving…' : last ? 'Finish the test' : 'Next'}
        onAnswer={(a) =>
          start(async () => {
            try {
              const res = await withRetry(() => saveTestAnswerAction({ id: test.id, index, answer: a }))
              if (res.status !== 'saved') throw new Error(res.status)
              setAnswers((all) => ({ ...all, [index]: a }))
              if (last) finish()
              else setIndex((i) => i + 1)
            } catch {
              setError(SAVE_ERROR)
            }
          })
        }
        onComplete={() => {}}
      />
    </div>
  )
}
