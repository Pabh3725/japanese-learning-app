'use client'

// Grammar V3: phiên Học / Ôn theo bài 5 câu (docs/grammar-rules-v3.md). Làm hết bài rồi bấm Check: server chấm và lưu cả bài.
// Câu sai gom lại cuối buổi, làm lại bằng câu khác cùng mẫu cùng dạng (câu dự phòng) tới khi đúng; vòng làm lại không lưu.
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkV3BaiAction, openGrammarPointAction, submitV3BaiAction } from '@/app/grammar/actions'
import { GrammarIntroCard } from '@/components/grammar/grammar-intro'
import { isAnswered, V3QuestionView } from '@/components/grammar/v3/v3-question'
import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { V3_TYPE_LABEL, type V3Answer, type V3Bai, type V3Graded, type V3PublicQuestion, type V3Session, type V3Step } from '@/lib/grammar/v3/public'
import { GRAMMAR_V3 } from '@/lib/grammar/v3/rules'
import { withRetry } from '@/lib/retry'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."
const ORDER = ['G1', 'G10', 'G6', 'G3', 'G2', 'G7', 'G5', 'G9']

type Step = V3Step & { retry?: number }

function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function V3SessionPlayer({ session }: { session: V3Session }) {
  const router = useRouter()
  const [steps, setSteps] = useState<Step[]>(session.steps)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(V3Answer | null)[]>([])
  const [graded, setGraded] = useState<V3Graded[] | null>(null)
  const [verdict, setVerdict] = useState<{ correct: number; passed?: boolean; completed?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ sets: 0, correct: 0, total: 0, learned: 0, retried: 0 })
  // Câu sai trong buổi: câu gốc và bài chứa nó (để lấy câu dự phòng)
  const wrongs = useRef<{ q: V3PublicQuestion; bai: V3Bai }[]>([])
  const usedSpare = useRef(new Set<string>())
  const started = useRef(Date.now())
  const round = useRef(0)

  const baiTotal = useMemo(() => steps.filter((s) => s.kind === 'bai' && !s.retry).length, [steps])
  const baiDone = steps.slice(0, index).filter((s) => s.kind === 'bai' && !s.retry).length
  const label = session.mode === 'review' ? 'Grammar · Review' : 'Grammar · Learn'

  const goNext = () => {
    let list = steps
    if (index + 1 >= steps.length && wrongs.current.length) {
      // Vòng làm lại: câu sai gom thành bài ≤ 5 câu, câu cùng dạng đứng cạnh nhau; dùng câu dự phòng nếu còn
      round.current++
      const items = wrongs.current
        .map(({ q, bai }) => {
          const spare = bai.spare.find((x) => !usedSpare.current.has(x.ref))
          if (spare) usedSpare.current.add(spare.ref)
          const next = spare ?? { ...q, choices: q.choices ? shuffle(q.choices) : undefined, chips: q.chips ? shuffle(q.chips) : undefined }
          return { q: { ...next, type: q.type }, bai }
        })
        .sort((a, b) => ORDER.indexOf(a.q.type) - ORDER.indexOf(b.q.type))
      wrongs.current = []
      const extra: Step[] = []
      for (let i = 0; i < items.length; i += GRAMMAR_V3.perBai) {
        const chunk = items.slice(i, i + GRAMMAR_V3.perBai)
        extra.push({
          kind: 'bai',
          retry: round.current,
          bai: {
            key: `retry:${round.current}:${i}`,
            type: 'mix',
            stage: 'Try again · no points',
            guide: 'Questions you got wrong, asked again with a new sentence of the same pattern and type.',
            questions: chunk.map((x) => x.q),
            spare: chunk.flatMap((x) => x.bai.spare),
          },
        })
      }
      list = [...steps, ...extra]
      setSteps(list)
    }
    setIndex(index + 1)
    setAnswers([])
    setGraded(null)
    setVerdict(null)
    setError(null)
    started.current = Date.now()
    window.scrollTo({ top: 0 })
    return list
  }

  if (index >= steps.length) {
    const empty = session.steps.length === 0
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={empty ? 'Nothing to do right now' : session.mode === 'review' ? 'Review complete!' : 'Well done!'}
          subtitle={
            empty
              ? session.mode === 'review' ? 'No patterns are due. Come back tomorrow.' : 'Day 2 of today’s patterns opens tomorrow. Practice the patterns you have opened, or review.'
              : stats.learned > 0
                ? `${stats.learned} ${stats.learned === 1 ? 'pattern' : 'patterns'} finished Intro 3 and move to Review.`
                : 'Your progress is saved.'
          }
          stats={empty ? [] : [
            { label: 'Sets', value: String(stats.sets), tone: 'text-primary' },
            { label: 'Correct', value: `${stats.correct}/${stats.total}`, tone: 'text-success' },
            { label: 'Asked again', value: String(stats.retried), tone: 'text-yellow' },
          ]}
          primary={{ href: '/grammar', label: 'Back to Grammar' }}
          secondary={{ href: '/', label: 'Home' }}
          onRestart={() => router.refresh()}
        />
      </div>
    )
  }

  const step = steps[index]
  const header = (
    <SessionHeader
      backHref="/grammar"
      label={label}
      sublabel={step.kind === 'bai' && step.retry ? `Try again · round ${step.retry}` : `Set ${Math.min(baiDone + 1, Math.max(baiTotal, 1))} of ${Math.max(baiTotal, 1)}`}
      current={baiDone}
      total={Math.max(baiTotal, 1)}
    />
  )

  if (step.kind === 'intro') {
    const open = async () => {
      setBusy(true)
      setError(null)
      try {
        const res = await withRetry(() => openGrammarPointAction(step.intro.code))
        if (res.status !== 'saved') throw new Error(res.status)
        goNext()
      } catch {
        setError(SAVE_ERROR)
      } finally {
        setBusy(false)
      }
    }
    return (
      <div className="flex min-h-dvh flex-col">
        {header}
        <ExercisePanel stage={`New pattern · Lesson ${step.intro.lesson}`} question="Read how it is used, then the examples" footer={<ContinueFooter label={error ? 'Try again' : 'Start Intro 1'} onClick={() => void open()} disabled={busy} hint={error ?? undefined} />}>
          <GrammarIntroCard point={{ ...step.intro, examples: step.intro.examples.map((e) => ({ pieces: e.pieces, meaning: e.meaning })) }} furigana={session.furigana} />
        </ExercisePanel>
      </div>
    )
  }

  const bai = step.bai
  const qs = bai.questions
  const ready = qs.every((q, i) => isAnswered(q, answers[i] ?? null))
  const answeredCount = qs.filter((q, i) => isAnswered(q, answers[i] ?? null)).length
  const mixed = bai.type === 'mix'
  const reviewing = session.mode === 'review'

  const check = async () => {
    setBusy(true)
    setError(null)
    const ms = Math.round((Date.now() - started.current) / qs.length)
    const body = {
      mode: reviewing ? 'review' : 'learning',
      rounds: session.rounds,
      items: qs.map((q, i) => ({ ref: q.ref, answer: answers[i], clientEventId: crypto.randomUUID(), ms })),
    }
    try {
      const res = await withRetry(() => (step.retry ? checkV3BaiAction(body) : submitV3BaiAction(body)), (r) => r.status === 'conflict')
      if (res.status !== 'saved') {
        setError(res.status === 'not_active' ? 'This set was already saved. Continue to the next one.' : SAVE_ERROR)
        return
      }
      setGraded(res.results)
      setVerdict({ correct: res.correct, passed: res.passed, completed: res.completed })
      res.results.forEach((r, i) => { if (!r.correct) wrongs.current.push({ q: qs[i], bai }) })
      setStats((s) => step.retry
        ? { ...s, retried: s.retried + qs.length }
        : { ...s, sets: s.sets + 1, correct: s.correct + res.correct, total: s.total + qs.length, learned: s.learned + (res.completed ? 1 : 0) })
    } catch {
      setError(SAVE_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const footer = graded ? (
    <ContinueFooter
      label={index + 1 >= steps.length ? (wrongs.current.length ? 'Try the wrong ones again' : 'Finish') : 'Next set'}
      onClick={() => { goNext() }}
      hint={
        step.retry ? 'No points: practice only.'
          : reviewing ? `${verdict?.correct}/${qs.length} correct · used for each pattern’s review schedule.`
          : `${verdict?.correct}/${qs.length} correct · ${verdict?.completed ? 'all sets passed — the pattern moves to Review.' : verdict?.passed ? 'set passed (3 or more correct in total).' : 'not passed yet — a new set of this type comes tomorrow.'}`
      }
    />
  ) : (
    <ContinueFooter label={error && !error.startsWith('This set') ? 'Try again' : 'Check'} onClick={() => (error?.startsWith('This set') ? goNext() : void check())} disabled={busy || (!ready && !error?.startsWith('This set'))} hint={error ?? `${answeredCount}/${qs.length} answered`} />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <ExercisePanel
        stage={[bai.stage, mixed ? null : V3_TYPE_LABEL[bai.type], bai.level ? `level ${bai.level}` : null].filter(Boolean).join(' · ')}
        question={bai.guide}
        footer={footer}
      >
        <div className="flex w-full flex-col gap-4">
          {bai.pattern && !reviewing && !step.retry && <p lang="ja" className="text-center font-jp text-lg text-subtle">{bai.pattern}{bai.fallbackFor ? <span className="ml-2 font-sans text-xs text-muted-foreground">(instead of {bai.fallbackFor})</span> : null}</p>}
          {qs.map((q, i) => (
            <V3QuestionView
              key={`${bai.key}:${q.ref}:${i}`}
              q={q}
              index={i}
              answer={answers[i] ?? null}
              onAnswer={(a) => setAnswers((list) => { const next = [...list]; next[i] = a; return next })}
              graded={graded?.[i] ?? null}
              furigana={session.furigana}
              showType={mixed}
              pattern={reviewing || step.retry ? session.patterns[q.pointCode] : undefined}
            />
          ))}
        </div>
      </ExercisePanel>
    </div>
  )
}
