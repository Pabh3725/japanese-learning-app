'use client'

// Thể động từ: phiên luyện chia. Server chấm và ghi nhật ký; không đổi điểm hay lịch nào.
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitVerbAnswerAction } from '@/app/grammar/verbs/actions'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import type { VerbSession } from '@/lib/dal/verbs'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import { isShortcutEvent } from '@/lib/keyboard'
import { withRetry } from '@/lib/retry'
import { cn } from '@/lib/utils'
import type { VerbQuestion } from '@/lib/verbs/questions'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

type Q = VerbQuestion & { clientEventId: string }

function Question({ q, onDone }: { q: Q; onDone: (correct: boolean) => void }) {
  const [choice, setChoice] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expected, setExpected] = useState<{ t: string; r: string } | null>(null)
  const started = useRef(Date.now())
  const locked = status !== 'idle' || checking
  const answer = q.answer === 'typing' ? typed.trim() : choice
  const ready = !!answer

  const check = async () => {
    if (!answer || locked) return
    setChecking(true)
    setError(null)
    try {
      const res = await withRetry(() => submitVerbAnswerAction({ code: q.code, form: q.form, exercise: q.exercise, seed: q.seed, answer, clientEventId: q.clientEventId, responseMs: Date.now() - started.current }))
      if (res.status !== 'graded') throw new Error(res.status)
      setExpected({ t: res.expected, r: res.expectedReading })
      setStatus(res.correct ? 'correct' : 'incorrect')
    } catch {
      setError(SAVE_ERROR)
    } finally {
      setChecking(false)
    }
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (locked || !isShortcutEvent(e)) return
    if (e.key === 'Enter' && ready) {
      e.preventDefault()
      void check()
      return
    }
    const n = Number(e.key)
    if (q.options && Number.isInteger(n) && n >= 1 && n <= q.options.length) setChoice(q.options[n - 1].id)
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const inputRef = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const nextCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (nextCaret.current === null || !inputRef.current) return
    inputRef.current.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [typed])
  const onType = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (composing.current) return setTyped(e.target.value)
    const r = convertAtCaret(e.target.value, e.target.selectionStart ?? e.target.value.length, 'hiragana')
    nextCaret.current = r.caret
    setTyped(r.value)
  }

  const stateOf = (id: string): AnswerState => {
    if (status === 'idle') return choice === id ? 'selected' : 'idle'
    const right = q.exercise === 'recognize' ? id === q.form : id === expected?.t
    if (right) return 'correct'
    return choice === id ? 'incorrect' : 'dimmed'
  }

  const showReading = q.shown.r !== q.shown.t
  return (
    <ExercisePanel
      stage={q.exercise === 'recognize' ? 'Verb forms · Name the form' : `Verb forms · ${q.target}`}
      question={q.instruction}
      controls={
        q.answer === 'option' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.options!.map((o, i) => (
              <AnswerOption key={o.id} label={o.label} kind={q.exercise === 'recognize' ? 'meaning' : 'vocab'} index={i} state={stateOf(o.id)} disabled={locked} onSelect={() => setChoice(o.id)} />
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void check() }}>
            <label htmlFor={`v-${q.clientEventId}`} className="sr-only">Your answer</label>
            <input
              ref={inputRef}
              id={`v-${q.clientEventId}`}
              lang="ja"
              autoFocus
              value={typed}
              onChange={onType}
              onCompositionStart={() => { composing.current = true }}
              onCompositionEnd={(e) => { composing.current = false; onType(e as unknown as React.ChangeEvent<HTMLInputElement>) }}
              readOnly={locked}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Type in romaji"
              className={cn('h-14 w-full rounded-2xl border-2 bg-card px-4 text-center font-jp text-2xl outline-none focus:border-primary', status === 'correct' ? 'border-success' : status === 'incorrect' ? 'border-error' : 'border-border')}
            />
          </form>
        )
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={ready && !checking}
          checkLabel={checking ? 'Checking…' : 'Check'}
          onCheck={() => void check()}
          onContinue={() => onDone(status === 'correct')}
          correctAnswer={status === 'incorrect' && expected ? (expected.t === expected.r ? expected.t : `${expected.t}（${expected.r}）`) : undefined}
          explanation={status !== 'idle' && expected && q.exercise !== 'recognize' && expected.t !== expected.r && status === 'correct' ? `${expected.t}（${expected.r}）` : undefined}
          secondary={error ? <p role="alert" className="mb-2 text-sm text-error">{error}</p> : undefined}
        />
      }
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <p lang="ja" className="font-jp text-4xl font-medium md:text-5xl">{q.shown.t}</p>
        {showReading && <p lang="ja" className="font-jp text-lg text-cyan">{q.shown.r}</p>}
        <p className="text-base text-subtle">{q.meaning}</p>
        {q.exercise !== 'recognize' && <p className="mt-2 rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold text-yellow">→ {q.target}</p>}
      </div>
    </ExercisePanel>
  )
}

export function VerbSessionPlayer({ session }: { session: VerbSession }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const total = session.questions.length

  if (index >= total) {
    const correct = results.filter(Boolean).length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={total === 0 ? 'Nothing to practice yet' : 'Nice work!'}
          subtitle={total === 0 ? 'No word fits the forms you chose yet.' : 'Practice does not change your points or review schedule.'}
          stats={total === 0 ? [] : [
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(results.length - correct), tone: 'text-error' },
          ]}
          primary={{ href: '/grammar/verbs', label: 'Practice again' }}
          secondary={{ href: '/grammar', label: 'Back to Grammar' }}
          onRestart={() => router.refresh()}
        />
      </div>
    )
  }

  const q = session.questions[index]
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/grammar/verbs" label="Verb forms" sublabel={`${index + 1} of ${total}`} current={index} total={total} />
      <Question key={q.clientEventId} q={q} onDone={(ok) => { setResults((r) => [...r, ok]); setIndex((i) => i + 1) }} />
    </div>
  )
}
