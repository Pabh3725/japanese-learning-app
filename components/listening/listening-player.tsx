'use client'

// Luyện nghe (docs/listening-rules.md): phiên theo bài (chấm từng câu) và thi thử phần nghe JLPT (phát một lần, chấm khi nộp).
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Gauge, Volume2, VolumeX } from 'lucide-react'
import { answerListeningAction, finishListeningAction, retryWrongListeningAction } from '@/app/listening/actions'
import { actionButton } from '@/components/action-button'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import type { ListeningResult, ListeningSessionView, ListeningSummary } from '@/lib/dal/listening'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import type { StemPiece } from '@/lib/jlpt/questions'
import { dictationDiff, LISTENING_V1, MOCK_SECTIONS, type PublicListeningQuestion } from '@/lib/listening/questions'
import { hasJapaneseVoice, speakScript } from '@/lib/speech'
import { cn } from '@/lib/utils'

const SAVE_ERROR = "Couldn't save your answer. Check your connection and try again."
const RATE_KEY = 'listening-rate'
const TYPE_NAME: Record<string, string> = {
  sentence_meaning: 'Sentence → meaning',
  reply: 'Question → reply',
  dictation: 'Dictation',
  listening_task: '課題理解・ポイント理解',
  verbal_expressions: '発話表現',
  quick_response: '即時応答',
}

function Ruby({ pieces, className }: { pieces: StemPiece[]; className?: string }) {
  return (
    <span lang="ja" className={cn('font-jp leading-loose', className)}>
      {pieces.map((p, i) =>
        p.r && p.r !== p.t ? (
          <ruby key={i}>
            {p.t}
            <rt className="text-[0.55em] text-muted-foreground">{p.r}</rt>
          </ruby>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </span>
  )
}

function Transcript({ result }: { result: ListeningResult }) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {result.transcript.map((line, i) => (
        <p key={i} className="text-lg">
          {line.sp !== 'N' && <span className="mr-2 text-xs text-muted-foreground">{line.sp === 'M' ? '男' : '女'}</span>}
          <Ruby pieces={line.pieces} />
        </p>
      ))}
      <p lang="ja" className="mt-1 whitespace-pre-line text-sm text-subtle">{result.explanation}</p>
    </div>
  )
}

// Tốc độ đọc nhớ trên thiết bị; trình duyệt chặn localStorage thì nhớ trong phiên
const rateListeners = new Set<() => void>()
let memoryRate: number = LISTENING_V1.rate.normal
function readRate(): number {
  try {
    const saved = localStorage.getItem(RATE_KEY)
    if (saved !== null) return Number(saved) === LISTENING_V1.rate.slow ? LISTENING_V1.rate.slow : LISTENING_V1.rate.normal
  } catch {}
  return memoryRate
}

function useRate(): [number, (r: number) => void] {
  const rate = useSyncExternalStore(
    (cb) => {
      rateListeners.add(cb)
      return () => rateListeners.delete(cb)
    },
    readRate,
    () => LISTENING_V1.rate.normal,
  )
  const set = (r: number) => {
    memoryRate = r
    try {
      localStorage.setItem(RATE_KEY, String(r))
    } catch {}
    rateListeners.forEach((l) => l())
  }
  return [rate, set]
}

/** Nút nghe. Thi thử: chỉ phát một lần (bấm lại được khi lần tự phát không chạy hết, vd. trình duyệt chặn tự phát). */
function Audio({ q, rate, once, onPlayed }: { q: PublicListeningQuestion; rate: number; once: boolean; onPlayed: () => void }) {
  const [done, setDone] = useState(false)
  const play = () =>
    speakScript(
      q.script,
      () => {
        setDone(true)
        onPlayed()
      },
      rate,
    )
  useEffect(() => {
    play()
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ tự phát một lần khi câu hiện ra
  }, [])
  const locked = once && done
  return (
    <button type="button" disabled={locked} onClick={play} className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'self-center')}>
      <Volume2 aria-hidden="true" />
      {locked ? 'Played' : 'Play again'}
    </button>
  )
}

export function ListeningPlayer({ session }: { session: ListeningSessionView }) {
  const router = useRouter()
  const mock = session.kind === 'jlpt_mock'
  const total = session.questions.length
  const firstOpen = session.questions.findIndex((_, i) => (mock ? session.chosen[i] === undefined : !session.answered[i]))
  const [index, setIndex] = useState(session.finished ? total : firstOpen === -1 ? total : firstOpen)
  const [answered, setAnswered] = useState<Record<number, ListeningResult>>(session.answered)
  const [choice, setChoice] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [shownText, setShownText] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ListeningSummary | null>(null)
  const [voice, setVoice] = useState<boolean | null>(null)
  const [rate, setRate] = useRate()
  const [busy, start] = useTransition()
  const [, setTick] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const done = index >= total

  useEffect(() => {
    hasJapaneseVoice().then(setVoice)
  }, [])
  // Đồng hồ tham khảo của thi thử
  useEffect(() => {
    if (!mock || done) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [mock, done])

  // Hết câu: chốt phiên ở server; thi thử thì tải lại để có đáp án và lời thoại
  useEffect(() => {
    if (!done || summary || (session.finished && mock)) return
    finishListeningAction(session.id)
      .then((res) => {
        if ('total' in res) {
          setSummary(res)
          if (mock) router.refresh()
        }
      })
      .catch(() => setError(SAVE_ERROR))
  }, [done, summary, session.id, session.finished, mock, router])

  if (done && mock) {
    if (!session.finished) return <p className="m-auto p-10 text-sm text-muted-foreground">{error ?? 'Scoring…'}</p>
    return <MockReview session={session} />
  }

  if (done) {
    if (!summary) return <p className="m-auto p-10 text-sm text-muted-foreground">{error ?? 'Saving…'}</p>
    const percent = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title="Listening done!"
          subtitle={`Lesson ${session.lesson} · ${summary.correct} of ${summary.total} correct (${percent}%).`}
          stats={summary.byType.map((t) => ({ label: TYPE_NAME[t.type] ?? t.type, value: `${t.correct}/${t.total}`, tone: t.correct === t.total ? 'text-success' : 'text-cyan' }))}
          primary={{ href: '/listening', label: 'Back to Listening' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        >
          {summary.wrong > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                start(async () => {
                  const res = await retryWrongListeningAction(session.id)
                  if (res.status === 'saved' && 'id' in res) router.push(`/listening/session/${res.id}`)
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
  const typing = q.options.length === 0
  const noVoice = voice === false
  const next = () => {
    setIndex((i) => i + 1)
    setChoice(null)
    setTyped('')
    setShownText(false)
  }

  const submit = (given: number | string) => {
    if (busy || result) return
    setError(null)
    start(async () => {
      try {
        const res = await answerListeningAction({ id: session.id, index, answer: given, withAudio: !noVoice })
        if (res.status === 'graded') setAnswered((cur) => ({ ...cur, [index]: res }))
        else if (res.status === 'saved') next()
        else throw new Error(res.status)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const stateOf = (i: number): AnswerState => {
    if (!result) return mock && choice === i ? 'selected' : 'idle'
    if (i === result.answer) return 'correct'
    if (i === result.given) return 'incorrect'
    return 'dimmed'
  }
  const optionLabel = (i: number) => (q.hideOptions && !result ? String(i + 1) : result ? result.options[i] : q.options[i])
  const section = q.section ? MOCK_SECTIONS[q.section - 1] : null
  const elapsed = Math.floor((Date.now() - Date.parse(session.startedAt)) / 60_000)

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader
        backHref="/listening"
        label={mock ? `Mock listening · ${session.level}` : `Listening · Lesson ${session.lesson}`}
        sublabel={mock ? `${index + 1} / ${total} · ${elapsed} / ${LISTENING_V1.mock[session.level!].minutes} min` : `${index + 1} / ${total}`}
        current={index}
        total={total}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
        <div>
          <p className="text-xs font-medium text-primary">{section ? `問題${section.section} · ${section.nameJa} · ${section.name}` : TYPE_NAME[q.type]}</p>
          <h1 className="mt-1 text-lg font-semibold">{q.instruction}</h1>
        </div>

        {noVoice ? (
          <div className="rounded-2xl border border-yellow/40 bg-yellow/5 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-yellow">
              <VolumeX className="size-4" aria-hidden="true" />
              This device has no Japanese voice.
            </p>
            <p className="mt-1 text-subtle">Read the text instead. Answers made this way don&apos;t count toward your accuracy.</p>
            <div lang="ja" className="mt-2 flex flex-col gap-1 font-jp text-lg text-foreground">
              {q.script.map((l, i) => (
                <p key={i}>{l.text}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Audio key={index} q={q} rate={mock ? LISTENING_V1.rate.normal : rate} once={mock} onPlayed={() => {}} />
            {!mock && (
              <button
                type="button"
                onClick={() => setRate(rate === LISTENING_V1.rate.slow ? LISTENING_V1.rate.normal : LISTENING_V1.rate.slow)}
                aria-pressed={rate === LISTENING_V1.rate.slow}
                className={cn('flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm', rate === LISTENING_V1.rate.slow ? 'border-primary bg-primary/12 text-primary' : 'border-border text-subtle')}
              >
                <Gauge className="size-4" aria-hidden="true" />
                {rate === LISTENING_V1.rate.slow ? 'Slow' : 'Normal'}
              </button>
            )}
          </div>
        )}

        {q.stem && (
          <p className="text-xl">
            <Ruby pieces={q.stem} />
          </p>
        )}
        {q.situation && <p className="rounded-2xl border border-border bg-card p-4 text-lg">{q.situation}</p>}

        {typing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim()) submit(typed)
            }}
            className="flex flex-col gap-3"
          >
            <input
              ref={inputRef}
              autoFocus
              lang="ja"
              value={typed}
              disabled={!!result || busy}
              onChange={(e) => {
                const r = convertAtCaret(e.target.value, e.target.selectionStart ?? e.target.value.length, q.input ?? 'hiragana')
                setTyped(r.value)
                requestAnimationFrame(() => inputRef.current?.setSelectionRange(r.caret, r.caret))
              }}
              placeholder="Type in romaji"
              aria-label="Your answer"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-14 rounded-2xl border-2 border-border bg-card px-4 font-jp text-2xl outline-none focus:border-primary"
            />
            {!result && (
              <button type="submit" disabled={!typed.trim() || busy} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
                Check
              </button>
            )}
          </form>
        ) : (
          <div className="grid gap-3">
            {q.options.map((_, i) => (
              <AnswerOption
                key={`${index}-${i}`}
                label={optionLabel(i)}
                kind={q.hideOptions && !result ? 'meaning' : q.type === 'sentence_meaning' ? 'meaning' : 'vocab'}
                state={stateOf(i)}
                index={i}
                disabled={!!result || busy}
                onSelect={() => (mock ? setChoice(i) : submit(i))}
              >
                {(q.type === 'reply' || q.type === 'listening_task' || (q.hideOptions && (result || shownText))) && (
                  <span lang="ja" className="font-jp text-lg leading-relaxed">{result ? result.options[i] : q.options[i]}</span>
                )}
              </AnswerOption>
            ))}
          </div>
        )}

        {mock && !result && (
          <button type="button" disabled={choice === null || busy} onClick={() => choice !== null && submit(choice)} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
            {index + 1 < total ? 'Next' : 'Finish test'}
          </button>
        )}

        {error && <p role="alert" className="text-sm text-error">{error}</p>}

        {result && (
          <div className={cn('rounded-2xl border p-4', result.correct ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5')}>
            <p className={cn('font-semibold', result.correct ? 'text-success' : 'text-error')}>{result.correct ? 'Correct' : 'Not quite'}</p>
            {typing && typeof result.answer === 'string' && (
              <p lang="ja" className="mt-1 font-jp text-xl tracking-wide">
                {dictationDiff(String(result.given), result.answer, q.input).map((c, i) => (
                  <span key={i} className={c.ok ? 'text-foreground' : 'text-error underline decoration-2 underline-offset-4'}>{c.ch}</span>
                ))}
              </p>
            )}
            <Transcript result={result} />
            <button type="button" autoFocus onClick={next} className={cn(actionButton({ size: 'lg' }), 'mt-4 w-full')}>
              {index + 1 < total ? 'Next' : 'See results'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

/** Thi thử đã nộp: điểm từng 問題 và xem lại từng câu (lời thoại, đáp án, nghe lại). */
function MockReview({ session }: { session: ListeningSessionView }) {
  const level = session.level!
  const rows = session.questions.map((q, i) => ({ q, i, r: session.answered[i] }))
  const correct = rows.filter((x) => x.r?.correct).length
  const percent = Math.round((correct / Math.max(1, rows.length)) * 100)
  const good = percent >= LISTENING_V1.goodPercent
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/listening" label={`Mock listening · ${level}`} sublabel="Results" current={rows.length} total={rows.length} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
        <section className="rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Your score</p>
          <p className={cn('mt-1 text-4xl font-bold', good ? 'text-success' : 'text-cyan')}>
            {correct} / {rows.length}
          </p>
          <p className="mt-1 text-sm text-subtle">{percent}% · {good ? 'Good' : `Aim for ${LISTENING_V1.goodPercent}% or more`} (practice score, not an official JLPT score)</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {MOCK_SECTIONS.map((s) => {
              const list = rows.filter((x) => x.q.section === s.section)
              return (
                <li key={s.section} className="rounded-2xl bg-secondary px-3 py-2">
                  <p lang="ja" className="font-jp text-xs text-muted-foreground">問題{s.section} {s.nameJa}</p>
                  <p className="font-semibold">{list.filter((x) => x.r?.correct).length}/{list.length}</p>
                </li>
              )
            })}
          </ul>
        </section>
        <ol className="flex flex-col gap-3">
          {rows.map(({ q, i, r }) => (
            <li key={i} className={cn('rounded-2xl border p-4', r?.correct ? 'border-success/30' : 'border-error/30')}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {i + 1}. <span lang="ja" className="font-jp">問題{q.section}</span>{' '}
                  <span className={r?.correct ? 'text-success' : 'text-error'}>{r ? (r.correct ? 'Correct' : 'Wrong') : 'Skipped'}</span>
                </p>
                <button type="button" onClick={() => speakScript(q.script)} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <Volume2 className="size-4" aria-hidden="true" />
                  Listen
                </button>
              </div>
              {q.situation && <p className="mt-1 text-sm">{q.situation}</p>}
              {q.stem && <p className="mt-1"><Ruby pieces={q.stem} /></p>}
              {r && (
                <>
                  <p className="mt-1 text-sm">
                    Answer: <span lang="ja" className="font-jp text-success">{typeof r.answer === 'number' ? `${r.answer + 1}. ${r.options[r.answer]}` : r.answer}</span>
                    {!r.correct && typeof r.given === 'number' && (
                      <>
                        {' '}· You chose: <span lang="ja" className="font-jp text-error">{r.given + 1}. {r.options[r.given]}</span>
                      </>
                    )}
                  </p>
                  <Transcript result={r} />
                </>
              )}
            </li>
          ))}
        </ol>
        <a href="/listening" className={cn(actionButton({ size: 'lg' }), 'w-full')}>
          Back to Listening
        </a>
      </main>
    </div>
  )
}
