'use client'

// JLPT: một phiên ôn. Chấm ở server; trả lời xong hiện đáp án và giải thích, cuối phiên có điểm từng dạng.
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Volume2 } from 'lucide-react'
import { answerJlptAction, finishJlptAction, retryWrongJlptAction } from '@/app/jlpt/actions'
import { actionButton } from '@/components/action-button'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import type { JlptAnswerResult, JlptSessionView, JlptSummary } from '@/lib/dal/jlpt'
import { JLPT_TYPES } from '@/lib/jlpt/catalog'
import { isContentType } from '@/lib/jlpt/content'
import type { PublicJlptQuestion, StemPiece } from '@/lib/jlpt/questions'
import { speak, speakScript } from '@/lib/speech'
import { cn } from '@/lib/utils'

const SAVE_ERROR = "Couldn't check your answer. Check your connection and try again."
const typeName = (id: string) => JLPT_TYPES.find((t) => t.id === id)

const BLANK_MARKS = '①②③④⑤'

/** Các mảnh chữ (ruby, gạch chân, ô trống). `current`: ô đánh số đang hỏi trong đoạn văn. */
function Pieces({ pieces, current }: { pieces: StemPiece[]; current?: string }) {
  return (
    <>
      {pieces.map((p, i) => {
        if (p.t.length === 1 && BLANK_MARKS.includes(p.t))
          return (
            <span key={i} className={cn('mx-0.5 inline-block min-w-12 rounded-md border px-1.5 text-center', p.t === current ? 'border-primary bg-primary/12 text-primary' : 'border-border text-muted-foreground')}>
              {p.t}
            </span>
          )
        if (p.mark === 'blank') return <span key={i} className="mx-1 inline-block min-w-16 border-b-2 border-primary text-center">（　）</span>
        if (p.mark === 'hidden') return <span key={i} className="mx-0.5 inline-block w-12 border-b-2 border-muted-foreground" aria-label="blank" />
        if (p.mark === 'star') return <span key={i} className="mx-0.5 inline-block w-12 border-b-2 border-yellow text-center text-base text-yellow">★</span>
        if (p.mark === 'underline') return <span key={i} className="underline decoration-primary decoration-2 underline-offset-8">{p.t}</span>
        return p.r ? (
          <ruby key={i}>
            {p.t}
            <rt className="text-xs text-muted-foreground">{p.r}</rt>
          </ruby>
        ) : (
          <span key={i}>{p.t}</span>
        )
      })}
    </>
  )
}

function Stem({ pieces, size = 'lg' }: { pieces: StemPiece[]; size?: 'lg' | 'md' }) {
  return (
    <p lang="ja" className={cn('font-jp leading-loose whitespace-pre-line', size === 'lg' ? 'text-2xl' : 'text-xl')}>
      <Pieces pieces={pieces} />
    </p>
  )
}

/** 文章の文法, 読解: tiêu đề và các đoạn văn. */
function Passage({ q }: { q: PublicJlptQuestion }) {
  return (
    <section lang="ja" className="rounded-2xl border border-border bg-secondary/40 p-4 font-jp md:p-5">
      {q.title && (
        <h2 className="mb-3 text-center text-lg font-semibold">
          <Pieces pieces={q.title} />
        </h2>
      )}
      <div className="flex flex-col gap-3 text-lg leading-loose">
        {q.passage!.map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            <Pieces pieces={para} current={q.blankMark} />
          </p>
        ))}
      </div>
    </section>
  )
}

/** 課題理解・ポイント理解, 発話表現: máy đọc lời theo thứ tự, hai giọng nam/nữ. */
function ScriptPlayer({ script }: { script: NonNullable<PublicJlptQuestion['script']> }) {
  useEffect(() => {
    speakScript(script)
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [script])
  return (
    <div className="flex justify-center">
      <button type="button" onClick={() => speakScript(script)} className={actionButton({ size: 'lg', variant: 'secondary' })}>
        <Volume2 aria-hidden="true" />
        Play again
      </button>
    </div>
  )
}

function Listening({ q }: { q: PublicJlptQuestion }) {
  const [showText, setShowText] = useState(false)
  // Đọc câu khi câu hiện ra
  useEffect(() => {
    if (q.audio) speak(q.audio)
  }, [q.audio])
  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={() => q.audio && speak(q.audio)} className={actionButton({ size: 'lg', variant: 'secondary' })}>
        <Volume2 aria-hidden="true" />
        Play again
      </button>
      {showText ? (
        <p lang="ja" className="font-jp text-xl">{q.audioText}</p>
      ) : (
        <button type="button" onClick={() => setShowText(true)} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Show text
        </button>
      )}
    </div>
  )
}

export function JlptPlayer({ session }: { session: JlptSessionView }) {
  const router = useRouter()
  const firstOpen = session.questions.findIndex((_, i) => !session.answered[i])
  const [index, setIndex] = useState(firstOpen === -1 ? session.questions.length : firstOpen)
  const [answered, setAnswered] = useState<Record<number, JlptAnswerResult>>(session.answered)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<JlptSummary | null>(null)
  const [busy, start] = useTransition()
  const [shownText, setShownText] = useState<ReadonlySet<number>>(() => new Set())
  const total = session.questions.length
  const done = index >= total

  // Hết câu: chốt phiên ở server và lấy điểm từng dạng
  useEffect(() => {
    if (!done || summary) return
    finishJlptAction(session.id)
      .then((res) => {
        if ('total' in res) setSummary(res)
      })
      .catch(() => setError(SAVE_ERROR))
  }, [done, summary, session.id])

  if (done) {
    if (!summary) return <p className="m-auto p-10 text-sm text-muted-foreground">{error ?? 'Saving…'}</p>
    const pct = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="Practice done!"
          subtitle={`${summary.correct} of ${summary.total} correct (${pct}%).`}
          stats={summary.byType.map((t) => ({ label: typeName(t.type)?.nameJa ?? t.type, value: `${t.correct}/${t.total}`, tone: t.correct === t.total ? 'text-success' : 'text-cyan' }))}
          primary={{ href: '/jlpt', label: 'Back to JLPT' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        >
          {summary.wrong > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await retryWrongJlptAction(session.id)
                  if (res.status === 'saved') router.push(`/jlpt/session/${res.id}`)
                })
              }
              className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'w-full')}
            >
              Practice {summary.wrong} wrong {summary.wrong === 1 ? 'answer' : 'answers'}
            </button>
          )}
        </SessionComplete>
      </div>
    )
  }

  const q = session.questions[index]
  const result = answered[index]
  // 発話表現: như đề thật, lựa chọn chỉ được đọc; hiện chữ sau khi trả lời hoặc khi người học bấm "Show text"
  const hideOptions = q.type === 'verbal_expressions' && !result && !shownText.has(index)
  // Đợt 2: lựa chọn thường là câu, cỡ chữ nhỏ hơn
  const sentenceOptions = isContentType(q.type) && (!!q.optionStems || q.options.some((o) => o.length > 6))
  const info = typeName(q.type)
  const choose = (choice: number) => {
    if (result || busy) return
    setError(null)
    start(async () => {
      try {
        const res = await answerJlptAction({ id: session.id, index, choice })
        if (res.status !== 'graded') throw new Error(res.status)
        setAnswered((cur) => ({ ...cur, [index]: res }))
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }
  const stateOf = (i: number): AnswerState => {
    if (!result) return 'idle'
    if (i === result.answer) return 'correct'
    if (i === result.choice) return 'incorrect'
    return 'dimmed'
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/jlpt" label={`JLPT ${session.level} · ${info?.nameJa ?? ''}`} sublabel={`${index + 1} / ${total}`} current={index} total={total} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-xs font-medium text-primary">{info ? `${info.nameJa} · ${info.name}` : q.type}</p>
          <h1 className="mt-1 text-lg font-semibold">{q.instruction}</h1>
        </div>
        {q.passage && <Passage q={q} />}
        {q.situation && <p className="rounded-2xl border border-border bg-card p-4 text-lg">{q.situation}</p>}
        {q.stem && <Stem pieces={q.stem} size={q.passage || q.script ? 'md' : 'lg'} />}
        {q.type === 'quick_response' && <Listening key={index} q={q} />}
        {q.script && <ScriptPlayer key={index} script={q.script} />}
        <div className="grid gap-3">
          {q.options.map((o, i) => (
            <AnswerOption key={`${index}-${i}`} label={hideOptions ? String(i + 1) : o} kind={hideOptions ? 'meaning' : 'vocab'} state={stateOf(i)} index={i} disabled={!!result || busy} onSelect={() => choose(i)}>
              {!hideOptions && sentenceOptions && (
                <span lang="ja" className="font-jp text-lg leading-relaxed">
                  {q.optionStems ? <Pieces pieces={q.optionStems[i]} /> : o}
                </span>
              )}
            </AnswerOption>
          ))}
        </div>
        {hideOptions && (
          <button type="button" onClick={() => setShownText((cur) => new Set(cur).add(index))} className="self-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Show text
          </button>
        )}
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        {result && (
          <div className={cn('rounded-2xl border p-4', result.correct ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5')}>
            <p className={cn('font-semibold', result.correct ? 'text-success' : 'text-error')}>{result.correct ? 'Correct' : `Answer: ${result.answer + 1}. ${q.options[result.answer]}`}</p>
            <p lang="ja" className="mt-1 whitespace-pre-line text-sm text-subtle">{result.explanation}</p>
            <button type="button" autoFocus onClick={() => setIndex((i) => i + 1)} className={cn(actionButton({ size: 'lg' }), 'mt-4 w-full')}>
              {index + 1 < total ? 'Next' : 'See results'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
