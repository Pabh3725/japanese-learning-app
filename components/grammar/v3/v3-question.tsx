'use client'

// Grammar V3: một câu trong bài 5 câu. Chỉ hiển thị và nhận câu trả lời; chấm ở server khi bấm Check cả bài.
import { useState } from 'react'
import { Eye, Volume2 } from 'lucide-react'
import { RubyPiece } from '@/components/grammar/ruby-sentence'
import { convertAtCaret } from '@/lib/exercise/answer-normalize'
import type { V3Piece } from '@/lib/grammar/v3/pieces'
import { V3_TYPE_LABEL, type V3Answer, type V3Graded, type V3PublicQuestion } from '@/lib/grammar/v3/public'
import { speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

const CIRCLED = ['①', '②', '③', '④']

export function V3Pieces({ pieces, furigana, fill, className }: { pieces: readonly V3Piece[]; furigana: boolean; fill?: string; className?: string }) {
  return (
    <span lang="ja" className={cn('font-jp', className)}>
      {pieces.map((p, i) =>
        p.blank ? (
          <span key={i} className={cn('mx-1 inline-block min-w-14 border-b-2 px-2 text-center', fill ? 'border-primary text-primary' : 'border-muted-foreground')}>
            {fill || ' '}
          </span>
        ) : (
          <RubyPiece key={i} piece={p} furigana={furigana} />
        ),
      )}
    </span>
  )
}

const optionClass = (state: 'idle' | 'picked' | 'right' | 'wrong') =>
  cn(
    'min-h-12 rounded-2xl border px-4 py-2.5 text-left transition-colors disabled:cursor-default',
    state === 'idle' && 'border-border bg-card hover:border-[#3b4250]',
    state === 'picked' && 'border-primary bg-primary/12',
    state === 'right' && 'border-success bg-success/12',
    state === 'wrong' && 'border-error bg-error/12',
  )

interface Props {
  q: V3PublicQuestion
  index: number
  answer: V3Answer | null
  onAnswer: (a: V3Answer | null) => void
  graded: V3Graded | null
  furigana: boolean
  /** Hiện nhãn dạng bài (bài làm lại / bài trộn dạng). */
  showType?: boolean
  /** Hiện tên mẫu (bài ôn trộn mẫu). */
  pattern?: string
}

export function V3QuestionView({ q, index, answer, onAnswer, graded, furigana, showType, pattern }: Props) {
  const [showAudio, setShowAudio] = useState(false)
  const done = graded !== null
  const big = 'text-xl leading-[2.2] md:text-2xl'

  const choiceState = (value: string | boolean | number, picked: boolean): 'idle' | 'picked' | 'right' | 'wrong' => {
    if (!done) return picked ? 'picked' : 'idle'
    if (graded.answer === value) return 'right'
    return picked ? 'wrong' : 'idle'
  }

  let body: React.ReactNode = null
  if (q.k === 'choice') {
    body = (
      <>
        {q.lines ? (
          <div className="flex flex-col gap-1">
            {q.lines.map((l, i) => (
              <p key={i} className={big}>
                <span className="mr-2 font-sans text-sm font-semibold text-muted-foreground">{l.who}</span>
                <V3Pieces pieces={l.pieces} furigana={furigana} fill={done && i === q.lines!.length - 1 ? graded.expected : typeof answer === 'string' ? answer : undefined} />
              </p>
            ))}
          </div>
        ) : q.prompt ? (
          <div className="flex flex-col gap-1">
            <p className={big}><span className="mr-2 font-sans text-sm font-semibold text-muted-foreground">A</span><V3Pieces pieces={q.prompt} furigana={furigana} /></p>
            {q.promptVi && <p className="text-sm text-subtle">{q.promptVi}</p>}
            <p className="text-sm text-muted-foreground">B replies:</p>
          </div>
        ) : q.audioKana ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => speak(q.audioKana!)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary">
              <Volume2 className="size-4" aria-hidden="true" /> Listen
            </button>
            <button type="button" onClick={() => setShowAudio((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary">
              <Eye className="size-4" aria-hidden="true" /> {showAudio || done ? 'Hide text' : 'Show text'}
            </button>
            {(showAudio || done) && q.audioText && <p className={cn(big, 'w-full')}><V3Pieces pieces={q.audioText} furigana={furigana} /></p>}
          </div>
        ) : (
          q.text && <p className={big}><V3Pieces pieces={q.text} furigana={furigana} fill={done ? graded.expected : typeof answer === 'string' ? answer : undefined} /></p>
        )}
        {q.vi && <p className="text-sm text-subtle">{q.vi}</p>}
        <div className={cn('grid gap-2', (q.choices?.length ?? 0) > 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
          {q.choices!.map((c) => (
            <button key={c} type="button" disabled={done} aria-pressed={answer === c} onClick={() => onAnswer(c)} className={optionClass(choiceState(c, answer === c))}>
              <span lang="ja" className="font-jp text-base md:text-lg">{c}</span>
            </button>
          ))}
        </div>
      </>
    )
  } else if (q.k === 'tf') {
    body = (
      <>
        <p className={big}><V3Pieces pieces={q.text!} furigana={furigana} /></p>
        {q.vi && <p className="text-sm text-subtle">{q.vi}</p>}
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" disabled={done} aria-pressed={answer === v} onClick={() => onAnswer(v)} className={optionClass(choiceState(v, answer === v))}>
              {v ? 'Right' : 'Wrong'}
            </button>
          ))}
        </div>
      </>
    )
  } else if (q.k === 'err') {
    let k = -1
    body = (
      <>
        <p className={cn(big, 'flex flex-wrap items-baseline gap-x-1.5 gap-y-2')}>
          {q.segs!.map((s, i) => {
            if (!s.marked) return <V3Pieces key={i} pieces={s.pieces} furigana={furigana} />
            k++
            const mine = k
            const state = choiceState(mine, answer === mine)
            return (
              <button
                key={i}
                type="button"
                disabled={done}
                aria-pressed={answer === mine}
                onClick={() => onAnswer(mine)}
                className={cn(
                  'border-b-2 px-0.5 transition-colors',
                  state === 'idle' && 'border-muted-foreground',
                  state === 'picked' && 'border-primary text-primary',
                  state === 'right' && 'border-success text-success',
                  state === 'wrong' && 'border-error text-error',
                )}
              >
                <sup className="mr-0.5 font-sans text-[10px] text-muted-foreground">{CIRCLED[mine]}</sup>
                <V3Pieces pieces={s.pieces} furigana={furigana} />
              </button>
            )
          })}
        </p>
        {q.vi && <p className="text-sm text-subtle">{q.vi}</p>}
      </>
    )
  } else if (q.k === 'star') {
    // Câu trả lời ★: 4 ô, -1 = ô trống
    const real = Array.isArray(answer) && answer.length === 4 ? answer : [-1, -1, -1, -1]
    const textOf = (id: number) => (id < 0 ? '' : q.chips!.find((c) => c.id === id)?.text ?? '')
    const place = (id: number) => {
      const free = real.indexOf(-1)
      if (free < 0) return
      onAnswer(real.map((x, j) => (j === free ? id : x)))
    }
    const clear = (i: number) => {
      const next = real.map((x, j) => (j === i ? -1 : x))
      onAnswer(next.every((x) => x < 0) ? null : next)
    }
    body = (
      <>
        <p className={cn(big, 'flex flex-wrap items-end gap-x-1.5 gap-y-3')}>
          {q.pre && q.pre.length > 0 && <V3Pieces pieces={q.pre} furigana={furigana} />}
          {real.map((id, i) => (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => clear(i)}
              aria-label={`Box ${i + 1}${i === q.star ? ' (★)' : ''}`}
              className={cn('relative min-h-10 min-w-16 rounded-t-lg border-b-2 bg-secondary/60 px-2 font-jp text-lg', i === q.star ? 'border-yellow' : 'border-border')}
            >
              {i === q.star && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs text-yellow">★</span>}
              {done ? graded.order?.[i] : textOf(id)}
            </button>
          ))}
          {q.post && q.post.length > 0 && <V3Pieces pieces={q.post} furigana={furigana} />}
        </p>
        {q.vi && <p className="text-sm text-subtle">{q.vi}</p>}
        {!done && (
          <div className="flex flex-wrap gap-2">
            {q.chips!.map((c) => (
              <button key={c.id} type="button" disabled={real.includes(c.id)} onClick={() => place(c.id)} className="rounded-xl border border-dashed border-border bg-card px-3 py-2 font-jp text-base disabled:opacity-30">
                {c.text}
              </button>
            ))}
          </div>
        )}
      </>
    )
  } else if (q.k === 'type') {
    body = (
      <>
        <p className={big}><V3Pieces pieces={q.text!} furigana={furigana} fill={done ? graded.expected : undefined} /></p>
        {q.hint && <p className="text-sm text-yellow">{q.hint}</p>}
        {q.vi && <p className="text-sm text-subtle">{q.vi}</p>}
        <input
          type="text"
          lang="ja"
          value={typeof answer === 'string' ? answer : ''}
          disabled={done}
          onChange={(e) => {
            const r = convertAtCaret(e.target.value, e.target.selectionStart ?? e.target.value.length, 'hiragana')
            onAnswer(r.value || null)
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Type in romaji or kana"
          aria-label={`Answer ${index + 1}`}
          className={cn('h-12 w-full rounded-2xl border bg-card px-4 font-jp text-lg outline-none focus:border-primary', done ? (graded.correct ? 'border-success' : 'border-error') : 'border-border')}
        />
      </>
    )
  }

  return (
    <section className={cn('flex flex-col gap-3 rounded-3xl border bg-card/60 p-4 md:p-5', done ? (graded.correct ? 'border-success/60' : 'border-error/70') : 'border-border')}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-muted-foreground tabular-nums">{index + 1}.</span>
        {showType && <span className="rounded-full bg-cyan/12 px-2 py-0.5 font-medium text-cyan">{V3_TYPE_LABEL[q.type]}</span>}
        {pattern && <span lang="ja" className="rounded-full bg-secondary px-2 py-0.5 font-jp text-subtle">{pattern}</span>}
      </div>
      {q.ctx && (
        <div className="flex flex-col gap-0.5">
          <p className="text-lg leading-[2.1]"><span className="mr-2 font-sans text-sm font-semibold text-muted-foreground">A</span><V3Pieces pieces={q.ctx} furigana={furigana} /></p>
          <p className="text-sm text-muted-foreground">B:</p>
        </div>
      )}
      {body}
      {done && (
        <div className="flex flex-col gap-1 border-t border-dashed border-border pt-3 text-sm">
          <span className={cn('font-semibold', graded.correct ? 'text-success' : 'text-error')}>{graded.correct ? 'Correct' : 'Wrong'}</span>
          {!graded.correct && q.k !== 'tf' && q.k !== 'star' && <span>Answer: <span lang="ja" className="font-jp">{q.k === 'err' ? `${CIRCLED[graded.answer as number]} ${graded.expected}` : graded.expected}</span></span>}
          {q.k === 'star' && !graded.correct && <span>★ = <span lang="ja" className="font-jp">{graded.expected}</span></span>}
          {graded.fix && <span>Correct sentence / part: <span lang="ja" className="font-jp">{graded.fix}</span></span>}
          <span className="text-subtle">{graded.ex}</span>
        </div>
      )}
    </section>
  )
}

/** Câu đã trả lời đủ chưa (★ cần đủ 4 ô). */
export function isAnswered(q: V3PublicQuestion, a: V3Answer | null): boolean {
  if (a === null || a === '') return false
  if (q.k === 'star') return Array.isArray(a) && a.length === 4 && a.every((x) => x >= 0)
  return true
}
