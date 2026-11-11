'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { PromptDisplay } from '@/components/learning/prompt-display'
import { actionButton } from '@/components/action-button'
import { isShortcutEvent } from '@/lib/keyboard'
import type { StepPrompt } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SelfCheckExerciseProps {
  stage: string
  question: string
  prompt: StepPrompt
  answer: string
  reading?: string
  /** 'text': đáp án là nghĩa tiếng Việt (Card Kanji mặt chữ ↔ nghĩa), không phải chữ Nhật. */
  answerKind?: 'jp' | 'text'
  /** Phần hiện thêm dưới đáp án sau khi lật (vd. nét viết). */
  after?: React.ReactNode
  /** Lưu kết quả tự chấm. Trả chuỗi lỗi nếu chưa lưu được. */
  onResult: (remembered: boolean) => Promise<string | null>
  onComplete: (remembered: boolean) => void
}

/** App không chấm được chữ người học tự viết: viết ra giấy hoặc nhớ trong đầu, lật thẻ, rồi tự chấm. */
export function SelfCheckExercise({ stage, question, prompt, answer, reading, answerKind = 'jp', after, onResult, onComplete }: SelfCheckExerciseProps) {
  const [shown, setShown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async (remembered: boolean) => {
    if (saving) return
    setSaving(true)
    setError(null)
    const failed = await onResult(remembered)
    setSaving(false)
    if (failed) setError(failed)
    else onComplete(remembered)
  }

  // Sau khi lật: 1 là nhớ, 2 là quên
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!shown || !isShortcutEvent(e)) return
    if (e.key === '1') choose(true)
    if (e.key === '2') choose(false)
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <ExercisePanel
      stage={stage}
      question={question}
      footer={
        shown ? (
          <div className="border-t border-border bg-background">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {error && <p role="alert" className="text-sm text-error">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled={saving} onClick={() => choose(false)} className={cn(actionButton({ size: 'lg', variant: 'secondary' }), 'w-full')}>
                  I forgot (2)
                </button>
                <button type="button" disabled={saving} onClick={() => choose(true)} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
                  I remembered (1)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ContinueFooter label="Show answer" onClick={() => setShown(true)} hint={answerKind === 'text' ? 'Say the meaning to yourself first.' : 'Write it on paper or picture it first.'} />
        )
      }
    >
      <PromptDisplay prompt={prompt} />
      {shown && (
        <div className="mt-6 flex flex-col items-center gap-2 animate-in fade-in duration-200">
          {answerKind === 'text' ? <p className="text-center text-2xl font-medium">{answer}</p> : <p lang="ja" className="font-jp text-6xl font-medium">{answer}</p>}
          {reading && <p lang="ja" className="font-jp text-xl text-cyan">{reading}</p>}
          {after}
        </div>
      )}
    </ExercisePanel>
  )
}
