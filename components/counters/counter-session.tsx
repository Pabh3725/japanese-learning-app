'use client'

// Counters: phiên luyện. Chấm ngay trên trình duyệt bằng dữ liệu có sẵn (chỉ luyện, không lưu gì).
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Volume2 } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { AnswerOption, type AnswerState } from '@/components/learning/answer-option'
import { ExerciseFooter, type CheckStatus } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { gradeCounterQuestion, type CounterGrade, type CounterQuestion } from '@/lib/counters/questions'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import { isShortcutEvent, REPLAY_KEY } from '@/lib/keyboard'
import { speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

function Question({ q, onDone }: { q: CounterQuestion; onDone: (correct: boolean) => void }) {
  const [choice, setChoice] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [graded, setGraded] = useState<CounterGrade | null>(null)
  const status: CheckStatus = graded ? (graded.correct ? 'correct' : 'incorrect') : 'idle'
  const locked = graded !== null
  const answer = q.answer === 'typing' ? typed.trim() : choice
  // Câu nghe: đọc câu đang hỏi. Mọi câu sau khi chấm: đọc đáp án đúng
  const replay = graded ? graded.reading : q.speak

  useEffect(() => {
    if (q.speak) speak(q.speak)
  }, [q.speak])

  const check = () => {
    if (!answer || locked) return
    setGraded(gradeCounterQuestion(q, answer))
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!isShortcutEvent(e)) return
    if (replay && e.key.toLowerCase() === REPLAY_KEY) {
      speak(replay)
      return
    }
    if (locked) return
    if (e.key === 'Enter' && answer) {
      e.preventDefault()
      check()
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
  // autoFocus không chạy khi trang vừa tải từ server (hydrate): tự đặt con trỏ vào ô gõ
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  const composing = useRef(false)
  const nextCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (nextCaret.current === null || !inputRef.current) return
    inputRef.current.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [typed])
  const digits = q.input === 'digits'
  const onType = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Câu viết số: giữ nguyên chữ số, không đổi sang kana
    if (digits || composing.current) return setTyped(e.target.value)
    const r = convertAtCaret(e.target.value, e.target.selectionStart ?? e.target.value.length, 'hiragana')
    nextCaret.current = r.caret
    setTyped(r.value)
  }

  const stateOf = (id: string): AnswerState => {
    if (!graded) return choice === id ? 'selected' : 'idle'
    const right = gradeCounterQuestion(q, id).correct
    if (right) return 'correct'
    return choice === id ? 'incorrect' : 'dimmed'
  }

  const optionKind = q.exercise === 'reading_choice' ? 'kana' : 'vocab'
  return (
    <ExercisePanel
      stage="Counters"
      question={q.instruction}
      controls={
        q.answer === 'option' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.options!.map((o, i) => (
              <AnswerOption key={o.id} label={o.label} kind={optionKind} index={i} state={stateOf(o.id)} disabled={locked} onSelect={() => setChoice(o.id)} />
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); check() }}>
            <label htmlFor={`c-${q.key}`} className="sr-only">Your answer</label>
            <input
              ref={inputRef}
              id={`c-${q.key}`}
              lang={digits ? undefined : 'ja'}
              inputMode={digits ? 'numeric' : undefined}
              autoFocus
              value={typed}
              onChange={onType}
              onCompositionStart={() => { composing.current = true }}
              onCompositionEnd={(e) => { composing.current = false; onType(e as unknown as React.ChangeEvent<HTMLInputElement>) }}
              readOnly={locked}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={digits ? 'Type the number' : 'Type in romaji'}
              className={cn('h-14 w-full rounded-2xl border-2 bg-card px-4 text-center font-jp text-2xl outline-none focus:border-primary', status === 'correct' ? 'border-success' : status === 'incorrect' ? 'border-error' : 'border-border')}
            />
          </form>
        )
      }
      footer={
        <ExerciseFooter
          status={status}
          canCheck={!!answer}
          onCheck={check}
          onContinue={() => onDone(status === 'correct')}
          correctAnswer={graded && !graded.correct ? `${graded.written}（${graded.reading}）` : undefined}
          explanation={graded?.correct ? `${graded.written}（${graded.reading}）` : undefined}
        />
      }
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Câu viết số: đề là cách đọc dài nên chữ nhỏ hơn */}
        {q.display && <p lang="ja" className={cn('font-jp font-medium', digits ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl')}>{q.display}</p>}
        {replay && (
          <button type="button" onClick={() => speak(replay)} className={cn(actionButton({ variant: 'secondary', size: 'lg' }), 'gap-2')} aria-label={graded ? 'Listen to the answer' : 'Play again'}>
            <Volume2 aria-hidden="true" /> {graded ? 'Listen' : 'Listen again'} <span className="hidden text-xs text-muted-foreground md:inline">(P)</span>
          </button>
        )}
        {q.hint && <p className="text-base text-subtle">{q.hint}</p>}
      </div>
    </ExercisePanel>
  )
}

export function CounterSessionPlayer({ questions }: { questions: CounterQuestion[] }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const total = questions.length

  if (index >= total) {
    const correct = results.filter(Boolean).length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={total === 0 ? 'Nothing to practice' : 'Nice work!'}
          subtitle={total === 0 ? 'Choose at least one group and one exercise type.' : 'Practice does not change your points or review schedule.'}
          stats={total === 0 ? [] : [
            { label: 'Correct', value: String(correct), tone: 'text-success' },
            { label: 'Wrong', value: String(results.length - correct), tone: 'text-error' },
          ]}
          primary={{ href: '/counters', label: 'Back to Counters' }}
          secondary={{ href: '/', label: 'Home' }}
          onRestart={() => router.refresh()}
        />
      </div>
    )
  }

  const q = questions[index]
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/counters" label="Counters" sublabel={`${index + 1} of ${total}`} current={index} total={total} />
      <Question key={q.key} q={q} onDone={(ok) => { setResults((r) => [...r, ok]); setIndex((i) => i + 1) }} />
    </div>
  )
}
