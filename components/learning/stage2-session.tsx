'use client'

// Phiên Stage 2 — chọn nghĩa / chọn kana (VOC-02). Dùng lại ChoiceExercise của v0;
// mỗi lần bấm Check gửi đáp án đã chọn lên server để chấm và ghi điểm (VOC-04).
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { WRONG_ANSWER_NOTE } from '@/components/learning/exercise-footer'
import { ChoiceExercise } from '@/components/learning/steps/choice-exercise'
import { submitStage2Answer } from '@/app/learn/stage2/actions'
import type { Stage2Question } from '@/lib/dal/stage2'
import type { ChoiceStep } from '@/lib/types'

interface Saved {
  correct: boolean
  delta: number
  movedUp: boolean
}

function toStep(q: Stage2Question, i: number): ChoiceStep {
  const kanaPrompt = q.exercise === 'kana_to_meaning'
  return {
    id: `${i}-${q.learnerVocabularyId}-${q.exercise}`,
    type: 'choice',
    stage: 'Stage 2',
    question: kanaPrompt ? 'What does this word mean?' : 'Which word means this?',
    prompt: { display: q.prompt, kind: kanaPrompt ? 'kana' : 'meaning' },
    options: q.options,
    answer: q.answer,
    optionKind: kanaPrompt ? 'meaning' : 'kana',
    explanation: '',
  }
}

export function Stage2Session({ questions, wordCount }: { questions: Stage2Question[]; wordCount: number }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState<Saved[]>([])
  const [pending, setPending] = useState(0)
  const [warning, setWarning] = useState<string | null>(null)
  const shownAt = useRef(Date.now())
  // Lưu TUẦN TỰ: câu sau chỉ gửi khi câu trước lưu xong → server cấp day_seq đúng thứ tự,
  // luật giãn cách đọc đúng câu trước. Người học không phải chờ: bấm Continue được ngay.
  const saveQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    shownAt.current = Date.now()
  }, [index])

  // Câu hỏi mới (sau khi refresh) → bắt đầu lại
  useEffect(() => {
    setIndex(0)
    setSaved([])
    setWarning(null)
  }, [questions])

  if (questions.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionHeader backHref="/learn" label="Stage 2" current={0} total={1} />
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-lg font-medium">No words in Stage 2 yet.</p>
          <p className="text-sm text-muted-foreground">Words reach Stage 2 after you finish their introduction (Stage 1).</p>
        </div>
      </div>
    )
  }

  const done = index >= questions.length

  if (done) {
    const correct = saved.filter((s) => s.correct).length
    const points = saved.reduce((n, s) => n + s.delta, 0)
    const moved = saved.filter((s) => s.movedUp).length
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={pending > 0 ? 'Saving…' : 'Session complete!'}
          subtitle={warning ?? `You practiced ${wordCount} word${wordCount === 1 ? '' : 's'} in Stage 2.`}
          stats={[
            { label: 'Correct', value: `${correct}/${questions.length}`, tone: 'text-success' },
            { label: 'Stage points', value: `${points >= 0 ? '+' : ''}${points}`, tone: 'text-cyan' },
            { label: 'Moved up', value: String(moved), tone: 'text-yellow' },
          ]}
          primary={{ href: '/learn', label: 'Back to Learn' }}
          secondary={{ href: '/', label: 'Back to Home' }}
          onRestart={() => router.refresh()}
        />
      </div>
    )
  }

  const q = questions[index]

  const answer = (chosen: string) => {
    const responseMs = Date.now() - shownAt.current
    const payload = {
      learnerVocabularyId: q.learnerVocabularyId,
      exercise: q.exercise,
      chosen,
      clientEventId: crypto.randomUUID(),
      responseMs,
    }
    setPending((n) => n + 1)
    saveQueue.current = saveQueue.current
      .then(() => submitStage2Answer(payload))
      .then((res) => {
        const r = res.save
        if (r.status === 'saved' && r.result) {
          setSaved((list) => [...list, { correct: res.outcome === 'correct', delta: r.result!.delta, movedUp: r.result!.unlockedStage !== null || r.result!.completed }])
        } else if (r.status !== 'duplicate') {
          setWarning(`Some answers were not saved (${r.status}).`)
        }
      })
      .catch(() => setWarning('Some answers were not saved (network error).'))
      .finally(() => setPending((n) => n - 1))
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader backHref="/learn" label="Stage 2" sublabel={`${wordCount} word${wordCount === 1 ? '' : 's'}`} current={index} total={questions.length} />
      {warning && <p role="alert" className="mx-auto mt-3 w-full max-w-2xl px-4 text-sm text-error">{warning}</p>}
      <ChoiceExercise key={toStep(q, index).id} step={toStep(q, index)} onAnswer={answer} instant wrongNote={WRONG_ANSWER_NOTE} onComplete={() => setIndex((i) => i + 1)} />
    </div>
  )
}
