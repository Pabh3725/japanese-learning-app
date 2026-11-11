'use client'

// Grammar: một câu hỏi (12 dạng hiện có). Chấm ở server qua onGrade; ở chế độ Kiểm tra (onGrade không có) chỉ ghi đáp án rồi đi tiếp.
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { RotateCcw, Volume2 } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { RubyPiece, RubySentence } from '@/components/grammar/ruby-sentence'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { ContinueFooter, ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import type { GrammarQuestion } from '@/lib/grammar/questions'
import type { GrammarPiece } from '@/lib/grammar/types'
import { isShortcutEvent, pieceIndexForKey, pieceKeyLabel, REPLAY_KEY } from '@/lib/keyboard'
import { speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

export type GrammarGrade = { correct: boolean; expected: string; answerId?: string; sentence: GrammarPiece[]; meaning: string } | { error: string } | null

interface GrammarQuestionProps {
  question: GrammarQuestion
  stage: string
  furigana: boolean
  /** Có: chấm ở server và hiện kết quả. Không có: chế độ Kiểm tra, chỉ nộp đáp án. */
  onGrade?: (answer: string | string[]) => Promise<GrammarGrade>
  onAnswer?: (answer: string | string[]) => void
  onComplete: (correct: boolean) => void
  /** Đáp án đã chọn trước đó (Kiểm tra, tải lại trang). */
  initial?: string | string[]
  nextLabel?: string
}

const TRUE_FALSE = [
  { id: 'true', label: 'Correct' },
  { id: 'false', label: 'Not correct' },
]

export function GrammarQuestionView({ question: q, stage, furigana, onGrade, onAnswer, onComplete, initial, nextLabel = 'Next' }: GrammarQuestionProps) {
  const [choice, setChoice] = useState<string | null>(typeof initial === 'string' ? initial : null)
  const [placed, setPlaced] = useState<number[]>(() => (Array.isArray(initial) && q.tiles ? initial.map((t) => q.tiles!.findIndex((x) => x.t === t)).filter((i) => i >= 0) : []))
  const [typed, setTyped] = useState(typeof initial === 'string' && q.answer === 'typing' ? initial : '')
  const [status, setStatus] = useState<CheckStatus>('idle')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graded, setGraded] = useState<Exclude<GrammarGrade, { error: string } | null> | null>(null)
  const locked = status !== 'idle' || checking

  // Dạng nghe: đọc ngay khi hiện câu
  useEffect(() => {
    if (q.speak) speak(q.speak)
  }, [q.speak])

  const answer = (): string | string[] | null => {
    if (q.answer === 'tiles') return placed.length ? placed.map((i) => q.tiles![i].t) : null
    if (q.answer === 'typing') return typed.trim() ? typed.trim() : null
    return choice
  }
  const ready = answer() !== null

  const check = async () => {
    const a = answer()
    if (a === null || locked) return
    if (!onGrade) {
      onAnswer?.(a)
      onComplete(false)
      return
    }
    setChecking(true)
    setError(null)
    const result = await onGrade(a)
    setChecking(false)
    if (!result) return
    if ('error' in result) {
      setError(result.error)
      return
    }
    setGraded(result)
    setStatus(result.correct ? 'correct' : 'incorrect')
  }

  // Phím tắt: số chọn đáp án / đặt mảnh, Backspace bỏ mảnh cuối, Esc xoá, Enter kiểm tra, P nghe lại.
  // Sau khi chấm, Enter sang câu sau do ExerciseFooter xử lý. Chế độ Kiểm tra: Enter do ContinueFooter xử lý.
  const optionIds = (): string[] => {
    if (q.exercise === 'find_error') return q.sentence!.underline!.map(String)
    if (q.answer === 'truefalse') return TRUE_FALSE.map((o) => o.id)
    return (q.options ?? []).map((o) => o.id)
  }
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (locked || !isShortcutEvent(e)) return
    if (q.speak && e.key.toLowerCase() === REPLAY_KEY) {
      speak(q.speak)
      return
    }
    if (e.key === 'Enter') {
      if (onGrade && ready) {
        e.preventDefault()
        void check()
      }
      return
    }
    if (q.answer === 'tiles') {
      if (e.key === 'Backspace') {
        e.preventDefault()
        setPlaced((p) => p.slice(0, -1))
      } else if (e.key === 'Escape') setPlaced([])
      else {
        const i = pieceIndexForKey(e.key)
        if (i >= 0 && i < q.tiles!.length) setPlaced((p) => (p.includes(i) ? p : [...p, i]))
      }
      return
    }
    if (q.answer === 'option' || q.answer === 'truefalse') {
      const ids = optionIds()
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= ids.length) setChoice(ids[n - 1])
    }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Ô gõ: đổi romaji sang kana ngay khi gõ (trừ khi bộ gõ đang soạn chữ)
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

  const optionState = (id: string): AnswerState => {
    if (!graded) return choice === id ? 'selected' : 'idle'
    if (id === graded.answerId) return 'correct'
    return choice === id ? 'incorrect' : 'dimmed'
  }

  const japaneseOptions = q.exercise !== 'meaning_choice' && q.exercise !== 'listening'
  const fill = q.sentence?.blank !== undefined ? (graded ? graded.expected : q.answer === 'typing' ? typed : choice ?? '') : undefined

  const prompt = (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      {q.context && (
        <div className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3">
          <RubySentence pieces={q.context.pieces} furigana={furigana} className="text-xl md:text-2xl" />
          <p className="text-sm text-muted-foreground">{q.context.meaning}</p>
        </div>
      )}
      {q.speak && (
        <button type="button" onClick={() => speak(q.speak!)} className={cn(actionButton({ variant: 'secondary', size: 'lg' }), 'gap-2')} aria-label="Play the sentence again">
          <Volume2 aria-hidden="true" /> Listen again <span className="hidden text-xs text-muted-foreground md:inline">(P)</span>
        </button>
      )}
      {q.sentence && (
        <RubySentence
          pieces={q.sentence.pieces}
          furigana={furigana}
          blank={q.sentence.blank}
          fill={fill}
          underline={q.sentence.underline}
          selected={q.exercise === 'find_error' && choice !== null ? Number(choice) : null}
          onPick={locked ? undefined : (i) => setChoice(String(i))}
          hidden={q.sentence.hidden}
          star={q.sentence.star}
        />
      )}
      {q.meaning && <p className="text-pretty text-base text-subtle">{q.meaning}</p>}
      {q.hint && <p className="text-sm text-muted-foreground">{q.hint}</p>}
      {graded && !graded.correct && (q.answer === 'tiles' || q.exercise === 'listening' || q.exercise === 'true_false' || q.exercise === 'find_error') && (
        <div className="rounded-2xl border border-border px-4 py-3">
          <RubySentence pieces={graded.sentence} furigana={furigana} className="text-xl md:text-2xl" />
          <p className="text-sm text-muted-foreground">{graded.meaning}</p>
        </div>
      )}
      {graded?.correct && q.exercise === 'listening' && (
        <RubySentence pieces={graded.sentence} furigana={furigana} className="text-xl md:text-2xl" />
      )}
    </div>
  )

  let controls: React.ReactNode = null
  if (q.answer === 'option' && q.exercise !== 'find_error') {
    controls = (
      <div className={cn('grid gap-3', q.options!.length > 2 ? 'md:grid-cols-2' : 'grid-cols-2')}>
        {q.options!.map((o, i) => (
          <AnswerOption key={o.id} label={o.label} kind={japaneseOptions ? 'vocab' : 'meaning'} index={i} state={optionState(o.id)} disabled={locked} onSelect={() => setChoice(o.id)} />
        ))}
      </div>
    )
  } else if (q.exercise === 'find_error') {
    controls = (
      <div className="grid grid-cols-4 gap-3">
        {q.sentence!.underline!.map((pieceIndex, i) => (
          <AnswerOption key={pieceIndex} label={String(i + 1)} kind="meaning" index={i} state={optionState(String(pieceIndex))} disabled={locked} onSelect={() => setChoice(String(pieceIndex))} />
        ))}
      </div>
    )
  } else if (q.answer === 'truefalse') {
    controls = (
      <div className="grid grid-cols-2 gap-3">
        {TRUE_FALSE.map((o, i) => (
          <AnswerOption key={o.id} label={o.label} kind="meaning" index={i} state={optionState(o.id)} disabled={locked} onSelect={() => setChoice(o.id)} />
        ))}
      </div>
    )
  } else if (q.answer === 'tiles') {
    controls = (
      <div className="flex flex-col gap-5">
        <div className={cn('flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-3', status === 'incorrect' && 'animate-shake')} aria-label="Your sentence">
          {placed.length === 0 && <span className="text-sm text-muted-foreground">Tap the parts in order</span>}
          {placed.map((ti, k) => (
            <button key={`${ti}-${k}`} type="button" disabled={locked} onClick={() => setPlaced((p) => p.filter((_, j) => j !== k))}
              className={cn('rounded-xl border-2 px-3 py-2 font-jp text-xl', status === 'correct' ? 'border-success bg-success/10' : status === 'incorrect' ? 'border-error bg-error/10' : 'border-primary/60 bg-primary/10')}>
              <RubyPiece piece={q.tiles![ti]} furigana={furigana} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Parts">
          {q.tiles!.map((t, i) =>
            placed.includes(i) ? (
              <span key={i} className="invisible rounded-xl border px-3 py-2 font-jp text-xl" aria-hidden="true"><RubyPiece piece={t} furigana={furigana} /></span>
            ) : (
              <button key={i} type="button" disabled={locked} onClick={() => setPlaced((p) => [...p, i])}
                className="relative rounded-xl border border-border bg-card px-3 py-2 font-jp text-xl shadow-[0_3px_0_0_#2e3440] hover:border-[#3b4250] disabled:opacity-50">
                <span className="absolute top-0.5 left-1.5 hidden font-sans text-[10px] font-medium text-muted-foreground md:block" aria-hidden="true">{pieceKeyLabel(i)}</span>
                <RubyPiece piece={t} furigana={furigana} />
              </button>
            ),
          )}
        </div>
        {placed.length > 0 && !locked && (
          <button type="button" onClick={() => setPlaced([])} className={cn(actionButton({ variant: 'ghost', size: 'sm' }), 'self-center')}>
            <RotateCcw aria-hidden="true" /> Clear
          </button>
        )}
        <p className="hidden text-center text-xs text-muted-foreground md:block">Press the key on a part to place it · Backspace to undo · Esc to clear · Enter to check</p>
      </div>
    )
  } else if (q.answer === 'typing') {
    controls = (
      <form onSubmit={(e) => { e.preventDefault(); void check() }}>
        <label htmlFor={`g-${q.sentenceId}-${q.seed}`} className="sr-only">Your answer</label>
        <input
          ref={inputRef}
          id={`g-${q.sentenceId}-${q.seed}`}
          lang="ja"
          value={typed}
          onChange={onType}
          onCompositionStart={() => { composing.current = true }}
          onCompositionEnd={(e) => { composing.current = false; onType(e as unknown as React.ChangeEvent<HTMLInputElement>) }}
          readOnly={locked}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Type in romaji"
          className="h-14 w-full rounded-2xl border-2 border-border bg-card px-4 text-center font-jp text-2xl outline-none focus:border-primary"
        />
      </form>
    )
  }

  const footer = onGrade ? (
    <ExerciseFooter
      status={status}
      canCheck={ready && !checking}
      checkLabel={checking ? 'Checking…' : 'Check'}
      onCheck={() => void check()}
      onContinue={() => onComplete(status === 'correct')}
      correctAnswer={graded && !graded.correct ? graded.expected === 'true' ? 'The sentence is correct.' : graded.expected === 'false' ? 'The sentence is not correct.' : graded.expected : undefined}
      explanation={graded ? graded.meaning : undefined}
      secondary={error ? <p role="alert" className="mb-2 text-sm text-error">{error}</p> : undefined}
    />
  ) : (
    <ContinueFooter label={nextLabel} onClick={() => void check()} disabled={!ready} />
  )

  return (
    <ExercisePanel stage={stage} question={q.instruction} controls={controls} footer={footer}>
      {prompt}
    </ExercisePanel>
  )
}
