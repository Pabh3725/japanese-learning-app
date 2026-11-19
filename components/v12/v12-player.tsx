'use client'

// V12 §2–6: trình học bộ thẻ — thẻ giới thiệu, câu Stage (chọn / ghép / gõ), Card Review gom chung; chia set.
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, RotateCcw, Volume2 } from 'lucide-react'
import { answerDeckAction, getDeckAction } from '@/app/learn/v12/actions'
import { actionButton } from '@/components/action-button'
import { KanjiCard } from '@/components/kanji/kanji-card'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { SessionHeader } from '@/components/learning/session-header'
import { ArchiveCardBar } from '@/components/review/archive-card-bar'
import type { AnswerView, CardView, DeckView, IntroView, PublicQuestion } from '@/lib/dal/v12/deck'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import { CARD_TYPES, REVIEW_CARDS } from '@/lib/v12/card-types'
import { speak } from '@/lib/speech'
import type { DisplayKind } from '@/lib/types'
import { cn } from '@/lib/utils'

const SCOPE_NAME: Record<string, string> = { kana: 'Kana vocabulary', kanji: 'Kanji', word_kanji: 'Kanji words', all: 'Learn everything' }
const SAVE_ERROR = "Couldn't save your answer. Check your connection and try again."
const optionKind = (k: string): DisplayKind => (k === 'kana' ? 'kana' : k === 'kanji' ? 'kanji' : 'meaning')

function Prompt({ text, kind, speakText }: { text: string; kind: string; speakText?: string }) {
  useEffect(() => {
    if (kind === 'listen' && speakText) speak(speakText)
  }, [kind, speakText])
  if (kind === 'listen')
    return (
      <button type="button" onClick={() => speakText && speak(speakText)} className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'self-center')}>
        <Volume2 aria-hidden="true" />
        Play again
      </button>
    )
  const japanese = kind === 'kana' || kind === 'kanji'
  return (
    <p lang={japanese ? 'ja' : undefined} className={cn('text-center text-pretty', japanese ? 'font-jp text-5xl font-medium' : kind === 'hanviet' ? 'text-3xl font-semibold tracking-wide text-yellow' : 'text-2xl font-medium')}>
      {text}
    </p>
  )
}

/** Một câu: chọn, ghép mảnh hoặc gõ. `onAnswer` nhận câu trả lời (chuỗi hoặc mảng mảnh). */
function QuestionInput({ q, locked, onAnswer, showPrompt = true, compact = false }: { q: PublicQuestion; locked: boolean; onAnswer: (given: string | string[]) => void; showPrompt?: boolean; compact?: boolean }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [built, setBuilt] = useState<number[]>([])
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-4">
      {showPrompt && <Prompt text={q.prompt} kind={q.promptKind} speakText={q.speak} />}
      {q.kind === 'choice' && (
        <div className={cn('grid gap-3', compact && 'sm:grid-cols-2')}>
          {q.options.map((o, i) => {
            const state: AnswerState = picked === o ? 'selected' : 'idle'
            return (
              <AnswerOption
                key={o}
                label={o}
                kind={optionKind(q.optionKind)}
                state={state}
                index={i}
                disabled={locked}
                onSelect={() => {
                  setPicked(o)
                  onAnswer(o)
                }}
              />
            )
          })}
        </div>
      )}
      {q.kind === 'typing' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim() && !compact) onAnswer(typed)
          }}
          className="flex flex-col gap-3"
        >
          <input
            ref={input}
            autoFocus={!compact}
            lang={q.input === 'text' ? undefined : 'ja'}
            value={typed}
            disabled={locked}
            onChange={(e) => {
              if (q.input === 'text') {
                setTyped(e.target.value)
                if (compact) onAnswer(e.target.value)
                return
              }
              const r = convertAtCaret(e.target.value, e.target.selectionStart ?? e.target.value.length, q.input)
              setTyped(r.value)
              if (compact) onAnswer(r.value)
              requestAnimationFrame(() => input.current?.setSelectionRange(r.caret, r.caret))
            }}
            placeholder={q.input === 'text' ? 'Sino-Vietnamese, no accents needed' : 'Type in romaji'}
            aria-label="Your answer"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className={cn('h-14 rounded-2xl border-2 border-border bg-card px-4 text-2xl outline-none focus:border-primary', q.input !== 'text' && 'font-jp')}
          />
          {!compact && (
            <button type="submit" disabled={!typed.trim() || locked} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
              Check
            </button>
          )}
        </form>
      )}
      {q.kind === 'assembly' && (
        <div className="flex flex-col gap-3">
          <div lang="ja" className="flex min-h-14 flex-wrap items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border p-2 font-jp text-3xl">
            {built.map((i) => q.pieces[i]).join('') || <span className="text-sm text-muted-foreground">Tap the pieces in order</span>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {q.pieces.map((p, i) => (
              <button
                key={i}
                type="button"
                lang="ja"
                disabled={locked || built.includes(i)}
                onClick={() => setBuilt((b) => [...b, i])}
                className="h-12 min-w-12 rounded-xl border border-border bg-card px-3 font-jp text-2xl transition-colors hover:border-primary disabled:opacity-30"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={locked || built.length === 0} onClick={() => setBuilt((b) => b.slice(0, -1))} className={cn(actionButton({ size: 'lg', variant: 'secondary' }))}>
              <RotateCcw aria-hidden="true" />
              Undo
            </button>
            <button type="button" disabled={locked || built.length === 0} onClick={() => onAnswer(built.map((i) => q.pieces[i]))} className={cn(actionButton({ size: 'lg' }), 'flex-1')}>
              Check
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Intro({ intro }: { intro: IntroView }) {
  const audio = intro.area === 'kana' ? intro.kana : intro.area === 'word_kanji' ? intro.kana : null
  useEffect(() => {
    if (audio) speak(audio)
  }, [audio])
  if (intro.area === 'kanji') return <KanjiCard kanji={intro.reveal} />
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 self-center rounded-3xl border border-primary/30 bg-card px-6 py-8 text-center">
      {intro.area === 'kana' && (
        <>
          <p lang="ja" className="font-jp text-6xl font-medium">{intro.kana}</p>
          <p className="text-xl font-medium">{intro.meaning}</p>
          {intro.hanViet && <p className="text-xs tracking-wide text-muted-foreground">Hán Việt: {intro.hanViet}</p>}
        </>
      )}
      {intro.area === 'radical' && (
        <>
          <p lang="ja" className="font-jp text-7xl font-medium">{intro.char}</p>
          <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wide text-yellow">Bộ {intro.name}</span>
          <p className="text-xl font-medium">{intro.meaning}</p>
          {intro.examples && <p lang="ja" className="font-jp text-2xl text-subtle">{intro.examples}</p>}
        </>
      )}
      {intro.area === 'word_kanji' && (
        <>
          <p lang="ja" className="font-jp text-sm text-muted-foreground">{intro.kana}</p>
          <p lang="ja" className="font-jp text-6xl font-medium">{intro.expression}</p>
          <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wide text-yellow">{intro.hanViet}</span>
          <p className="text-xl font-medium">{intro.meaning}</p>
        </>
      )}
      {audio && (
        <button type="button" onClick={() => speak(audio)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <Volume2 className="size-4" aria-hidden="true" />
          Listen
        </button>
      )}
    </div>
  )
}

function Feedback({ result, onNext, last }: { result: AnswerView; onNext: () => void; last: boolean }) {
  useEffect(() => {
    if (result.speak) speak(result.speak)
  }, [result.speak])
  return (
    <div className={cn('rounded-2xl border p-4', result.correct ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5')}>
      <p className={cn('font-semibold', result.correct ? 'text-success' : 'text-error')}>{result.correct ? 'Correct' : 'Not quite'}</p>
      {!result.correct && result.answers && (
        <p className="mt-1 text-sm">
          Answer: <span lang="ja" className="font-jp text-lg text-foreground">{result.answers.join(' · ')}</span>
          {result.retry && <span className="ml-2 text-xs text-muted-foreground">You&apos;ll see it again in a moment.</span>}
        </p>
      )}
      {result.stageDone && <p className="mt-1 text-sm text-success">{result.cardsCreated ? 'Learned! Review cards start tomorrow.' : 'Intro done! The next intro starts tomorrow.'}</p>}
      <button type="button" autoFocus onClick={onNext} className={cn(actionButton({ size: 'lg' }), 'mt-4 w-full')}>
        {last ? 'See results' : 'Next'}
      </button>
    </div>
  )
}

export function V12Player({ initial }: { initial: DeckView }) {
  const [deck, setDeck] = useState(initial)
  const [result, setResult] = useState<AnswerView | null>(null)
  const [breakAt, setBreakAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ answered: 0, correct: 0 })
  const [busy, start] = useTransition()
  const shownAt = useRef(0)
  const card = deck.card

  useEffect(() => {
    shownAt.current = performance.now()
  }, [card?.position])

  const load = () =>
    start(async () => {
      const next = await getDeckAction(deck.scope)
      if (!next) return
      const crossed = next.card && next.position > 0 && Math.floor(next.position / next.setSize) > Math.floor(deck.position / deck.setSize)
      setDeck(next)
      setResult(null)
      setError(null)
      if (crossed) setBreakAt(next.position)
    })

  const submit = (given: unknown) => {
    if (!card || busy || result) return
    setError(null)
    start(async () => {
      try {
        const res = await answerDeckAction({ scope: deck.scope, position: card.position, given, elapsedMs: performance.now() - shownAt.current, clientEventId: crypto.randomUUID() })
        if (res.status === 'conflict') {
          const next = await getDeckAction(deck.scope)
          if (next) setDeck(next)
          return
        }
        if (res.status !== 'graded') throw new Error(res.status)
        if (card.kind === 'intro') {
          const next = await getDeckAction(deck.scope)
          if (next) setDeck(next)
          return
        }
        setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (res.correct ? 1 : 0) }))
        setResult(res)
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const setNo = Math.floor(deck.position / deck.setSize) + 1
  const sets = Math.max(1, Math.ceil(deck.total / deck.setSize))
  const header = (
    <SessionHeader backHref="/learn" label={SCOPE_NAME[deck.scope]} sublabel={card ? `Set ${setNo} of ${sets} · card ${(deck.position % deck.setSize) + 1}` : 'Done'} current={Math.min(deck.position, deck.total)} total={deck.total} />
  )

  if (!card)
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-2xl font-semibold">Done for today 🎉</p>
          <p className="text-sm text-subtle">{stats.answered > 0 ? `${stats.correct} of ${stats.answered} correct this time.` : 'Nothing left in this area today.'}</p>
          {Object.values(deck.deferred).some((n) => n > 0) && <p className="text-xs text-muted-foreground">Some items went over your daily limit and moved to tomorrow.</p>}
          <Link href="/learn" className={cn(actionButton({ size: 'lg' }), 'w-full')}>Back to Vocab</Link>
        </main>
      </div>
    )

  if (breakAt !== null && breakAt === deck.position)
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-2xl font-semibold">Set {setNo - 1} done</p>
          <p className="text-sm text-subtle">{stats.correct} of {stats.answered} correct so far. Take a break or keep going.</p>
          <button type="button" autoFocus onClick={() => setBreakAt(null)} className={cn(actionButton({ size: 'lg' }), 'w-full')}>Next set</button>
          <Link href="/learn" className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'w-full')}>Back to Vocab</Link>
        </main>
      </div>
    )

  const label =
    card.kind === 'intro' ? 'New' : card.kind === 'star' ? `Starred · ${CARD_TYPES[card.type].label} · extra practice` : card.kind === 'stage' ? `Intro ${card.stage} · ${CARD_TYPES[card.type].label}${card.retry ? ' · again' : ''}` : `Review · ${REVIEW_CARDS[card.card].label}${card.retry ? ' · again' : ''}`

  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <main key={card.position} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <p className="text-xs font-medium text-primary">{label}</p>
        {card.kind === 'intro' && (
          <>
            <Intro intro={card.intro} />
            <button type="button" autoFocus disabled={busy} onClick={() => submit(null)} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
              Continue
            </button>
          </>
        )}
        {(card.kind === 'stage' || card.kind === 'star') && <QuestionInput q={card.question} locked={!!result || busy} onAnswer={submit} />}
        {card.kind === 'review' && <ReviewCard card={card} locked={!!result || busy} answered={!!result} onSubmit={submit} />}
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        {result && <Feedback result={result} onNext={load} last={deck.position + 1 >= deck.total} />}
      </main>
      {/* R13: lưu trữ riêng Card đang ôn; thẻ tiếp theo bỏ qua Card đã lưu trữ */}
      <ArchiveCardBar kind="item" cardId={card.kind === 'review' && !card.retry && !result ? card.cardId : null} onArchived={load} />
    </div>
  )
}

/** Card Review gom chung: một đề, nhiều phần; chấm cả Card khi bấm Check (§3.3). */
function ReviewCard({ card, locked, answered, onSubmit }: { card: Extract<CardView, { kind: 'review' }>; locked: boolean; answered: boolean; onSubmit: (parts: (string | string[])[]) => void }) {
  const [parts, setParts] = useState<(string | string[] | null)[]>(() => card.parts.map(() => null))
  const ready = parts.every((p) => p !== null && (typeof p !== 'string' || p.trim() !== ''))
  const PART: Record<string, string> = { type_kana: 'Type the reading', type_hanviet: 'Type the Sino-Vietnamese', choose_meaning: 'Choose the meaning', choose_hanviet: 'Choose the name' }
  return (
    <div className="flex flex-col gap-5">
      <Prompt text={card.prompt} kind={card.promptKind} speakText={card.promptKind === 'kana' ? card.speak : undefined} />
      {card.parts.map((p, i) => (
        <div key={i} className="flex flex-col gap-2">
          <p className="text-sm font-medium text-subtle">{PART[p.part] ?? p.part}</p>
          <QuestionInput q={p.question} locked={locked} showPrompt={false} compact onAnswer={(v) => setParts((cur) => cur.map((x, j) => (j === i ? v : x)))} />
        </div>
      ))}
      {!answered && (
        <button type="button" disabled={!ready || locked} onClick={() => onSubmit(parts as (string | string[])[])} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
          <Check aria-hidden="true" />
          Check
        </button>
      )}
    </div>
  )
}
