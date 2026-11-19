'use client'

// V12 §2–6: trình học bộ thẻ — thẻ giới thiệu, câu Intro (chọn / ghép / gõ), Card Review gom chung; chia set theo Settings.
// Bố cục như trình học cũ: đề lớn ở giữa, đáp án trong tầm tay, chân trang cố định (Check / Continue) và phím tắt:
// 1–9 chọn đáp án, Enter chấm, Enter/Space sang câu, P nghe lại, phím số đặt mảnh ghép, Backspace / Esc sửa mảnh.
import { Fragment, useEffect, useEffectEvent, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Volume2 } from 'lucide-react'
import { answerDeckAction, getDeckAction } from '@/app/learn/v12/actions'
import { actionButton } from '@/components/action-button'
import { KanjiCard } from '@/components/kanji/kanji-card'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { ContinueFooter, ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SessionHeader } from '@/components/learning/session-header'
import { SpeakerButton, useAutoSpeak } from '@/components/learning/speaker-button'
import { ArchiveCardBar } from '@/components/review/archive-card-bar'
import type { AnswerView, CardView, DeckView, IntroView, PublicQuestion } from '@/lib/dal/v12/deck'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import { jpSizeClass } from '@/lib/jp-size'
import { isShortcutEvent, pieceIndexForKey, pieceKeyLabel } from '@/lib/keyboard'
import { speak } from '@/lib/speech'
import type { DisplayKind } from '@/lib/types'
import { CARD_TYPES, REVIEW_CARDS } from '@/lib/v12/card-types'
import { cn } from '@/lib/utils'

const SCOPE_NAME: Record<string, string> = { kana: 'Kana vocabulary', kanji: 'Kanji', word_kanji: 'Kanji words', all: 'Learn everything' }
const SAVE_ERROR = "Couldn't save your answer. Check your connection and try again."
const optionKind = (k: string): DisplayKind => (k === 'kana' ? 'kana' : k === 'kanji' ? 'kanji' : 'meaning')
type Given = string | string[]
/** Kết quả chấm ở server; null khi bộ thẻ đã đổi (thẻ khác ở vị trí này) và trình học tự tải lại. */
type Grade = (given: unknown) => Promise<AnswerView | null>

/** Gắn phím tắt toàn trang cho một màn hình. */
function useKeys(onKey: (e: KeyboardEvent) => void) {
  const handle = useEffectEvent(onKey)
  useEffect(() => {
    const h = (e: KeyboardEvent) => handle(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
}

/** Đề: chữ Nhật cỡ lớn theo độ dài, nghĩa, Hán Việt, hoặc nút loa của câu nghe (tự đọc, phím P nghe lại). */
function Prompt({ text, kind, speakText }: { text: string; kind: string; speakText?: string }) {
  if (kind === 'listen' && speakText) return <ListenPrompt kana={speakText} />
  const japanese = kind === 'kana' || kind === 'kanji'
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {japanese ? (
        <p lang="ja" className={cn('font-jp leading-none font-medium', jpSizeClass(text, kind === 'kanji' ? (Array.from(text).length === 1 ? 'kanji' : 'vocab') : 'kana'))}>
          {text}
        </p>
      ) : kind === 'hanviet' ? (
        <p className="text-4xl font-semibold tracking-wide text-yellow md:text-5xl">{text}</p>
      ) : (
        <p className="text-balance text-3xl font-semibold md:text-4xl">{text}</p>
      )}
      {japanese && speakText && <SpeakerButton kana={speakText} />}
    </div>
  )
}

function ListenPrompt({ kana }: { kana: string }) {
  useAutoSpeak(kana)
  return (
    <div className="flex flex-col items-center gap-3">
      <SpeakerButton kana={kana} large />
      <p className="hidden text-xs text-muted-foreground md:block">Press P to listen again</p>
    </div>
  )
}

/** Thông báo thêm ở chân trang sau khi chấm: hỏi lại, xong Intro, tạo Card. */
function noteOf(r: AnswerView | null): string | undefined {
  if (!r) return undefined
  const notes = []
  if (!r.correct && r.retry) notes.push("You'll see it again in a moment.")
  if (r.stageDone) notes.push(r.cardsCreated ? 'Learned! Review cards start tomorrow.' : 'Intro done! The next intro starts tomorrow.')
  return notes.join('\n') || undefined
}

/** Một câu chọn / gõ / ghép. Chấm ở server khi bấm Check (hoặc Enter); Continue (Enter / Space) sang thẻ sau. */
function QuestionScreen({ label, q, onGrade, onContinue, footerExtra }: { label: string; q: PublicQuestion; onGrade: Grade; onContinue: () => void; footerExtra?: React.ReactNode }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [placed, setPlaced] = useState<number[]>([])
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<AnswerView | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const locked = status !== 'idle' || checking
  const given: Given | null = q.kind === 'choice' ? picked : q.kind === 'typing' ? (typed.trim() ? typed : null) : placed.length ? placed.map((i) => q.pieces[i]) : null

  const check = async () => {
    if (locked || given === null) return
    setChecking(true)
    const r = await onGrade(given)
    setChecking(false)
    if (!r) return
    setResult(r)
    setStatus(r.correct ? 'correct' : 'incorrect')
    if (r.speak) speak(r.speak)
  }

  useKeys((e) => {
    if (locked || !isShortcutEvent(e)) return
    if (q.kind === 'choice') {
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length) setPicked(q.options[n - 1])
    } else if (q.kind === 'assembly') {
      if (e.key === 'Backspace') {
        e.preventDefault()
        setPlaced((p) => p.slice(0, -1))
        return
      }
      if (e.key === 'Escape') return setPlaced([])
      const i = pieceIndexForKey(e.key)
      if (i >= 0 && i < q.pieces.length) setPlaced((p) => (p.includes(i) ? p : [...p, i]))
    }
    if (e.key === 'Enter' && given !== null) {
      e.preventDefault()
      void check()
    }
  })

  const answer = result?.answers?.[0]
  const stateFor = (o: string): AnswerState => (status === 'idle' ? (o === picked ? 'selected' : 'idle') : o === answer ? 'correct' : o === picked ? 'incorrect' : 'dimmed')

  let controls: React.ReactNode = null
  if (q.kind === 'choice')
    controls = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Answer options">
        {q.options.map((o, i) => (
          <AnswerOption key={o} index={i} label={o} kind={optionKind(q.optionKind)} state={stateFor(o)} disabled={locked} onSelect={() => setPicked(o)} />
        ))}
      </div>
    )
  else if (q.kind === 'typing')
    controls = (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void check()
        }}
      >
        <input
          ref={input}
          autoFocus
          lang={q.input === 'text' ? undefined : 'ja'}
          value={typed}
          readOnly={locked}
          onChange={(e) => {
            if (q.input === 'text') return setTyped(e.target.value)
            const r = convertAtCaret(e.target.value, e.target.selectionStart ?? e.target.value.length, q.input)
            setTyped(r.value)
            requestAnimationFrame(() => input.current?.setSelectionRange(r.caret, r.caret))
          }}
          placeholder={q.input === 'text' ? 'Sino-Vietnamese, no accents needed' : 'Type in romaji'}
          aria-label="Your answer"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={cn(
            'h-16 w-full rounded-2xl border-2 bg-card px-5 text-center text-3xl outline-none focus:border-primary',
            q.input !== 'text' && 'font-jp',
            status === 'idle' && 'border-border',
            status === 'correct' && 'border-success bg-success/10',
            status === 'incorrect' && 'animate-shake border-error bg-error/10',
          )}
        />
      </form>
    )
  else
    controls = (
      <div className="flex flex-col gap-6">
        <div className={cn('flex min-h-20 flex-wrap items-center justify-center gap-2', status === 'incorrect' && 'animate-shake')} aria-label="Your answer">
          {placed.length === 0 && <p className="text-sm text-muted-foreground">Tap the pieces in order.</p>}
          {placed.map((pi, slot) => (
            <button
              key={slot}
              type="button"
              disabled={locked}
              onClick={() => setPlaced((p) => p.filter((_, i) => i !== slot))}
              aria-label={`Remove ${q.pieces[pi]}`}
              className={cn(
                'flex size-16 animate-pop items-center justify-center rounded-2xl border-2 font-jp text-[26px] md:size-[72px] md:text-[30px]',
                status === 'idle' && 'border-primary/60 bg-primary/10 hover:border-primary',
                status === 'correct' && 'border-success bg-success/10',
                status === 'incorrect' && 'border-error bg-error/10',
              )}
            >
              <span lang="ja">{q.pieces[pi]}</span>
            </button>
          ))}
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Available pieces">
          {q.pieces.map((piece, i) => {
            const used = placed.includes(i)
            return (
              <button
                key={`${piece}-${i}`}
                type="button"
                onClick={() => setPlaced((p) => [...p, i])}
                disabled={used || locked}
                aria-hidden={used}
                tabIndex={used ? -1 : undefined}
                className={cn(
                  'relative flex size-14 items-center justify-center rounded-2xl border border-border bg-card font-jp text-[26px] shadow-[0_3px_0_0_#2e3440] transition-all duration-150 md:size-16 md:text-[30px]',
                  used ? 'invisible' : 'hover:-translate-y-0.5 hover:border-[#3b4250] active:translate-y-0.5 active:shadow-none disabled:opacity-50',
                )}
              >
                <span className="absolute top-0.5 left-1.5 hidden font-sans text-[10px] font-medium text-muted-foreground md:block" aria-hidden="true">
                  {pieceKeyLabel(i)}
                </span>
                <span lang="ja">{piece}</span>
              </button>
            )
          })}
        </div>
        <p className="hidden text-center text-xs text-muted-foreground md:block">Press a number to place a piece · Backspace to undo · Esc to clear · Enter to check</p>
      </div>
    )

  return (
    <ExercisePanel
      stage={label}
      controls={controls}
      footer={
        <ExerciseFooter
          status={status}
          canCheck={given !== null && !checking}
          checkLabel={checking ? 'Checking…' : 'Check'}
          onCheck={() => void check()}
          onContinue={onContinue}
          correctAnswer={result?.answers?.join(' · ')}
          explanation={noteOf(result)}
          secondary={footerExtra}
        />
      }
    >
      <Prompt text={q.prompt} kind={q.promptKind} speakText={q.speak} />
    </ExercisePanel>
  )
}

const PART_LABEL: Record<string, string> = { type_kana: 'Type the reading', type_hanviet: 'Type the Sino-Vietnamese', choose_meaning: 'Choose the meaning', choose_hanviet: 'Choose the name' }

/** Card Review gom chung: một đề, nhiều phần; chấm cả Card khi bấm Check (§3.3). Phím số chọn ở phần trắc nghiệm đang chờ. */
function ReviewScreen({ label, card, onGrade, onContinue, footerExtra }: { label: string; card: Extract<CardView, { kind: 'review' }>; onGrade: Grade; onContinue: () => void; footerExtra?: React.ReactNode }) {
  const [parts, setParts] = useState<(string | null)[]>(() => card.parts.map(() => null))
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<AnswerView | null>(null)
  const locked = status !== 'idle' || checking
  const ready = parts.every((p) => p !== null && p.trim() !== '')
  const set = (i: number, v: string) => setParts((cur) => cur.map((x, j) => (j === i ? v : x)))

  const check = async () => {
    if (locked || !ready) return
    setChecking(true)
    const r = await onGrade(parts)
    setChecking(false)
    if (!r) return
    setResult(r)
    setStatus(r.correct ? 'correct' : 'incorrect')
    if (r.speak) speak(r.speak)
  }

  useKeys((e) => {
    if (locked || !isShortcutEvent(e)) return
    const n = Number(e.key)
    const choiceParts = card.parts.map((p, i) => ({ q: p.question, i })).filter((p) => p.q.kind === 'choice')
    const target = choiceParts.find((p) => parts[p.i] === null) ?? choiceParts.at(-1)
    if (target && target.q.kind === 'choice' && n >= 1 && n <= target.q.options.length) set(target.i, target.q.options[n - 1])
    if (e.key === 'Enter' && ready) {
      e.preventDefault()
      void check()
    }
  })

  return (
    <ExercisePanel
      stage={label}
      controls={
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            void check()
          }}
        >
          {card.parts.map((p, i) => {
            const q = p.question
            const answer = result?.answers?.[i]
            return (
              <div key={i} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-subtle">{PART_LABEL[p.part] ?? p.part}</p>
                {q.kind === 'choice' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label={PART_LABEL[p.part]}>
                    {q.options.map((o, oi) => (
                      <AnswerOption
                        key={o}
                        index={oi}
                        label={o}
                        kind={optionKind(q.optionKind)}
                        state={status === 'idle' ? (parts[i] === o ? 'selected' : 'idle') : o === answer ? 'correct' : o === parts[i] ? 'incorrect' : 'dimmed'}
                        disabled={locked}
                        onSelect={() => set(i, o)}
                      />
                    ))}
                  </div>
                ) : q.kind === 'typing' ? (
                  <ReviewTyping q={q} value={parts[i] ?? ''} locked={locked} autoFocus={i === 0} status={status === 'idle' ? 'idle' : answer !== undefined && result?.correct ? 'correct' : 'checked'} onChange={(v) => set(i, v)} />
                ) : null}
                {status !== 'idle' && q.kind === 'typing' && answer && (
                  <p className="text-sm text-subtle">
                    Answer: <span lang="ja" className="font-jp text-base text-foreground">{answer}</span>
                  </p>
                )}
              </div>
            )
          })}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={ready && !checking}
          checkLabel={checking ? 'Checking…' : 'Check'}
          onCheck={() => void check()}
          onContinue={onContinue}
          correctAnswer={result?.answers?.join(' · ')}
          explanation={noteOf(result)}
          secondary={footerExtra}
        />
      }
    >
      <Prompt text={card.prompt} kind={card.promptKind} speakText={card.promptKind === 'kana' ? card.speak : undefined} />
    </ExercisePanel>
  )
}

function ReviewTyping({ q, value, locked, autoFocus, status, onChange }: { q: Extract<PublicQuestion, { kind: 'typing' }>; value: string; locked: boolean; autoFocus: boolean; status: 'idle' | 'correct' | 'checked'; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <input
      ref={input}
      autoFocus={autoFocus}
      lang={q.input === 'text' ? undefined : 'ja'}
      value={value}
      readOnly={locked}
      onChange={(e) => {
        if (q.input === 'text') return onChange(e.target.value)
        const r = convertAtCaret(e.target.value, e.target.selectionStart ?? e.target.value.length, q.input)
        onChange(r.value)
        requestAnimationFrame(() => input.current?.setSelectionRange(r.caret, r.caret))
      }}
      placeholder={q.input === 'text' ? 'Sino-Vietnamese, no accents needed' : 'Type in romaji'}
      aria-label="Your answer"
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      className={cn(
        'h-14 w-full rounded-2xl border-2 bg-card px-4 text-center text-2xl outline-none focus:border-primary',
        q.input !== 'text' && 'font-jp',
        status === 'idle' ? 'border-border' : status === 'correct' ? 'border-success bg-success/10' : 'border-border',
      )}
    />
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

/** Màn giữa hai set và cuối ngày. Enter / Space bấm nút chính. */
function Pause({ header, title, body, note, primary, onPrimary }: { header: React.ReactNode; title: string; body: string; note?: string; primary?: string; onPrimary?: () => void }) {
  useKeys((e) => {
    if (!onPrimary || !isShortcutEvent(e) || (e.key !== 'Enter' && e.key !== ' ')) return
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return
    e.preventDefault()
    onPrimary()
  })
  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-2xl font-semibold">{title}</p>
        <p className="text-sm text-subtle">{body}</p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {primary && onPrimary && (
          <button type="button" autoFocus onClick={onPrimary} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
            {primary}
          </button>
        )}
        <Link href="/learn" className={cn(actionButton({ size: 'lg', variant: primary ? 'secondary' : 'primary' }), 'w-full')}>Back to Vocab</Link>
        {primary && <p className="hidden text-xs text-muted-foreground md:block">Press Enter to continue</p>}
      </main>
    </div>
  )
}

const setIndex = (d: DeckView) => Math.floor(d.position / d.setSize)

export function V12Player({ initial }: { initial: DeckView }) {
  const [deck, setDeck] = useState(initial)
  // Set đang làm. Bộ thẻ sang set sau (bất kể qua thẻ nào) thì dừng ở màn nghỉ cho tới khi bấm "Next set".
  const [currentSet, setCurrentSet] = useState(() => setIndex(initial))
  const [setStats, setSetStats] = useState({ answered: 0, correct: 0 })
  const [dayStats, setDayStats] = useState({ answered: 0, correct: 0 })
  const [error, setError] = useState<string | null>(null)
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
      setDeck(next)
      setError(null)
    })

  const grade: Grade = async (given) => {
    if (!card) return null
    setError(null)
    try {
      const res = await answerDeckAction({ scope: deck.scope, position: card.position, given, elapsedMs: performance.now() - shownAt.current, clientEventId: crypto.randomUUID() })
      if (res.status === 'conflict') {
        load()
        return null
      }
      if (res.status !== 'graded') throw new Error(res.status)
      if (card.kind !== 'intro') {
        const add = (s: { answered: number; correct: number }) => ({ answered: s.answered + 1, correct: s.correct + (res.correct ? 1 : 0) })
        setSetStats(add)
        setDayStats(add)
      }
      return res
    } catch {
      setError(SAVE_ERROR)
      return null
    }
  }

  const sets = Math.max(1, Math.ceil(deck.total / deck.setSize))
  const setNo = Math.min(sets, currentSet + 1)
  const setStart = currentSet * deck.setSize
  const setLength = Math.max(1, Math.min(deck.setSize, deck.total - setStart))
  const header = (
    <SessionHeader backHref="/learn" label={SCOPE_NAME[deck.scope]} sublabel={card ? `Set ${setNo} of ${sets}` : 'Done'} current={Math.min(Math.max(0, deck.position - setStart), setLength)} total={setLength} />
  )

  if (!card)
    return (
      <Pause
        header={header}
        title="Done for today 🎉"
        body={dayStats.answered > 0 ? `${dayStats.correct} of ${dayStats.answered} correct this time.` : 'Nothing left in this area today.'}
        note={Object.values(deck.deferred).some((n) => n > 0) ? 'Some items went over your daily limit and moved to tomorrow.' : undefined}
      />
    )

  if (setIndex(deck) > currentSet)
    return (
      <Pause
        header={header}
        title={`Set ${currentSet + 1} of ${sets} done`}
        body={setStats.answered > 0 ? `${setStats.correct} of ${setStats.answered} correct in this set. Take a break or keep going.` : 'Take a break or keep going.'}
        primary="Next set"
        onPrimary={() => {
          setCurrentSet(setIndex(deck))
          setSetStats({ answered: 0, correct: 0 })
        }}
      />
    )

  const label =
    card.kind === 'intro'
      ? 'New'
      : card.kind === 'star'
        ? `Starred · ${CARD_TYPES[card.type].label} · extra practice`
        : card.kind === 'stage'
          ? `Intro ${card.stage} · ${CARD_TYPES[card.type].label}${card.retry ? ' · again' : ''}`
          : `Review · ${REVIEW_CARDS[card.card].label}${card.retry ? ' · again' : ''}`
  // R13: lưu trữ riêng Card đang ôn; thẻ tiếp theo bỏ qua Card đã lưu trữ
  const archive = card.kind === 'review' && !card.retry ? <ArchiveCardBar kind="item" cardId={card.cardId} onArchived={load} /> : undefined

  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      {error && <p role="alert" className="mx-auto w-full max-w-2xl px-4 pt-2 text-sm text-error">{error}</p>}
      <Fragment key={card.position}>
        {card.kind === 'intro' && (
          <ExercisePanel
            stage={label}
            footer={
              <ContinueFooter
                label={busy ? 'Saving…' : 'Continue'}
                disabled={busy}
                hint="Press Enter to continue"
                onClick={() =>
                  start(async () => {
                    if (await grade(null)) await load()
                  })
                }
              />
            }
          >
            <Intro intro={card.intro} />
          </ExercisePanel>
        )}
        {(card.kind === 'stage' || card.kind === 'star') && <QuestionScreen label={label} q={card.question} onGrade={grade} onContinue={load} />}
        {card.kind === 'review' && <ReviewScreen label={label} card={card} onGrade={grade} onContinue={load} footerExtra={archive} />}
      </Fragment>
    </div>
  )
}
