'use client'

// Practice · Conversation listening (docs/listening-rules.md §V2.4): nghe cả đoạn (ẩn chữ) → điền ô trống (chọn từ nghe được,
// nghe lại cả đoạn hoặc từng lượt) → nộp → chấm từng ô và phân tích từng câu.
import { Fragment, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gauge, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { startConversationAction, submitConversationAction } from '@/app/listening/actions'
import { actionButton } from '@/components/action-button'
import { SessionHeader } from '@/components/learning/session-header'
import { useRate } from '@/components/listening/use-rate'
import type { ConversationReview, ConversationView } from '@/lib/dal/listening'
import { LISTENING_V1 } from '@/lib/listening/questions'
import { hasJapaneseVoice, speakScript } from '@/lib/speech'
import { cn } from '@/lib/utils'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩'
const speaker = (sp: 'M' | 'F' | 'N') => (sp === 'M' ? '男' : sp === 'F' ? '女' : '')

function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

export function ConversationPlayer({ session }: { session: ConversationView }) {
  const router = useRouter()
  const [review, setReview] = useState<ConversationReview | null>(session.review)
  const [phase, setPhase] = useState<'listen' | 'fill'>('listen')
  const [choices, setChoices] = useState<(number | null)[]>(() => session.blanks.map(() => null))
  const [voice, setVoice] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rate, setRate] = useRate()
  const [busy, start] = useTransition()
  const noVoice = voice === false

  useEffect(() => {
    hasJapaneseVoice().then(setVoice)
    return stopSpeech
  }, [])

  const playAll = () => speakScript(session.script, undefined, rate)
  const playLine = (i: number) => speakScript([session.script[i]], undefined, rate)
  const blanksOfLine = (line: number) => session.blanks.flatMap((b, i) => (b.line === line ? [i] : []))
  const header = `Lesson ${session.lesson} · ${session.title}`

  const speed = (
    <button
      type="button"
      onClick={() => setRate(rate === LISTENING_V1.rate.slow ? LISTENING_V1.rate.normal : LISTENING_V1.rate.slow)}
      aria-pressed={rate === LISTENING_V1.rate.slow}
      className={cn('flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm', rate === LISTENING_V1.rate.slow ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle')}
    >
      <Gauge className="size-4" aria-hidden="true" />
      {rate === LISTENING_V1.rate.slow ? 'Slow' : 'Normal'}
    </button>
  )

  // ---- Đã nộp: điểm và phân tích từng câu
  if (review) {
    const percent = Math.round((review.correct / Math.max(1, review.total)) * 100)
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionHeader backHref="/practice/conversations" label={header} sublabel="Results" current={1} total={1} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
          <section className="rounded-3xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Blanks right</p>
            <p className={cn('mt-1 text-4xl font-bold', percent >= 80 ? 'text-success' : 'text-cyan')}>
              {review.correct} / {review.total}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={playAll} className={actionButton({ size: 'md', variant: 'secondary' })}>
                <Volume2 aria-hidden="true" />
                Play all
              </button>
              {speed}
            </div>
          </section>
          {review.patterns.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground">Grammar in this conversation</h2>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {review.patterns.map((p) => (
                  <li key={p.code}>
                    <Link href={`/grammar/${p.code}`} className="hover:text-primary">
                      <span lang="ja" className="mr-2 font-jp">{p.pattern}</span>
                      <span className="text-muted-foreground">{p.meaning}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ol className="flex flex-col gap-3">
            {review.lines.map((line, li) => (
              <li key={li} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 shrink-0 rounded-md bg-secondary px-1.5 text-xs text-muted-foreground">{speaker(line.sp)}</span>
                  <div className="min-w-0 flex-1">
                    <p lang="ja" className="font-jp text-lg leading-loose">
                      {line.pieces.map((p, pi) => {
                        const b = review.blanks.findIndex((x) => x.line === li && x.piece === pi)
                        const body = p.r && p.r !== p.t ? (
                          <ruby>
                            {p.t}
                            <rt className="text-[0.55em] text-muted-foreground">{p.r}</rt>
                          </ruby>
                        ) : (
                          p.t
                        )
                        if (b === -1) return <Fragment key={pi}>{body}</Fragment>
                        const blank = review.blanks[b]
                        return (
                          <span key={pi} className={cn('mx-0.5 rounded px-1', blank.correct ? 'bg-success/15 text-success' : 'bg-error/15 text-error')}>
                            {body}
                            {!blank.correct && blank.given !== null && <span className="ml-1 text-xs line-through">{blank.options[blank.given]}</span>}
                          </span>
                        )
                      })}
                    </p>
                    <p className="text-sm text-subtle">{line.meaning}</p>
                    {line.words.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {line.words.map((w) => (
                          <li key={w.t} className="rounded-lg bg-secondary px-2 py-1">
                            <span lang="ja" className="font-jp">{w.t}</span>
                            {w.r !== w.t && <span lang="ja" className="ml-1 font-jp text-muted-foreground">{w.r}</span>}
                            <span className="ml-1 text-subtle">{w.meaning}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button type="button" onClick={() => playLine(li)} aria-label={`Play line ${li + 1}`} className="shrink-0 rounded-full p-2 text-primary hover:bg-primary/10">
                    <Volume2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await startConversationAction({ code: session.code })
                  if (res.status === 'saved') router.push(`/listening/conversation/${res.id}`)
                  else setError(SAVE_ERROR)
                })
              }
              className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'w-full')}
            >
              <RotateCcw aria-hidden="true" />
              Try again
            </button>
            <Link href="/practice/conversations" className={cn(actionButton({ size: 'lg' }), 'w-full')}>
              Back to conversations
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // ---- Nghe trước, rồi điền
  const allChosen = choices.every((c) => c !== null)
  const submit = () =>
    start(async () => {
      setError(null)
      stopSpeech()
      try {
        const res = await submitConversationAction({ id: session.id, answers: choices, withAudio: !noVoice })
        if (res.status !== 'graded') throw new Error(res.status)
        setReview(res)
        window.scrollTo({ top: 0 })
      } catch {
        setError(SAVE_ERROR)
      }
    })

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/practice/conversations" label={header} sublabel={phase === 'listen' ? 'Listen first' : 'Fill in the blanks'} current={phase === 'listen' ? 0 : 1} total={2} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-subtle">{session.situation}</p>

        {noVoice && (
          <div className="rounded-2xl border border-yellow/40 bg-yellow/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-yellow">
              <VolumeX className="size-4" aria-hidden="true" />
              This device has no Japanese voice.
            </p>
            <p className="mt-1 text-subtle">Read the text instead. Answers made this way don&apos;t count toward your accuracy.</p>
            <div lang="ja" className="mt-2 flex flex-col gap-1 font-jp text-foreground">
              {session.script.map((l, i) => (
                <p key={i}>
                  {speaker(l.sp)}：{l.text}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={playAll} className={actionButton({ size: 'lg', variant: 'secondary' })}>
            <Volume2 aria-hidden="true" />
            {phase === 'listen' ? 'Play the conversation' : 'Play all again'}
          </button>
          {speed}
        </div>

        {phase === 'listen' ? (
          <>
            <p className="text-center text-sm text-muted-foreground">Listen to the whole conversation first. The text is hidden.</p>
            <button type="button" onClick={() => setPhase('fill')} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
              Show the blanks
            </button>
          </>
        ) : (
          <>
            <ol className="flex flex-col gap-3">
              {session.lines.map((line, li) => (
                <li key={li} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 rounded-md bg-secondary px-1.5 text-xs text-muted-foreground">{speaker(line.sp)}</span>
                    <p lang="ja" className="min-w-0 flex-1 font-jp text-lg leading-loose">
                      {line.pieces.map((p, pi) =>
                        p.blank === undefined ? (
                          <span key={pi}>{p.t}</span>
                        ) : (
                          <span key={pi} className={cn('mx-0.5 inline-block min-w-14 rounded-md border px-1.5 text-center', choices[p.blank] === null ? 'border-primary/60 text-primary' : 'border-primary bg-primary/12 text-foreground')}>
                            {choices[p.blank] === null ? CIRCLED[p.blank] ?? `(${p.blank + 1})` : session.blanks[p.blank].options[choices[p.blank]!]}
                          </span>
                        ),
                      )}
                    </p>
                    <button type="button" onClick={() => playLine(li)} aria-label={`Play line ${li + 1}`} className="shrink-0 rounded-full p-2 text-primary hover:bg-primary/10">
                      <Volume2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {blanksOfLine(li).map((b) => (
                    <div key={b} role="radiogroup" aria-label={`Blank ${b + 1}`} className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                      <span className="text-xs text-muted-foreground">{CIRCLED[b] ?? b + 1}</span>
                      {session.blanks[b].options.map((o, oi) => (
                        <button
                          key={oi}
                          type="button"
                          role="radio"
                          aria-checked={choices[b] === oi}
                          onClick={() => setChoices((cur) => cur.map((c, i) => (i === b ? oi : c)))}
                          lang="ja"
                          className={cn('rounded-xl border px-3 py-1.5 font-jp text-sm transition-colors', choices[b] === oi ? 'border-primary bg-primary/12 text-primary' : 'border-border hover:border-[#3b4250]')}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  ))}
                </li>
              ))}
            </ol>
            {error && <p role="alert" className="text-sm text-error">{error}</p>}
            <button type="button" disabled={!allChosen || busy} onClick={submit} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
              {allChosen ? 'Check answers' : `Fill every blank (${choices.filter((c) => c !== null).length}/${choices.length})`}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
