'use client'

import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { SpeakerButton, useAutoSpeak } from '@/components/learning/speaker-button'
import type { WordReveal } from '@/lib/exercise/stage-questions'

/** Sai liên tiếp nhiều lần: xem lại từ trước khi học tiếp. Chỉ hiện những gì người học đã được giới thiệu. */
export function RelearnExercise({ reveal, onContinue }: { reveal: WordReveal; onContinue: () => void }) {
  useAutoSpeak(reveal.kana)
  return (
    <ExercisePanel
      stage="Let's review this word"
      question="This word needs a little more practice"
      footer={<ContinueFooter label="Continue" onClick={onContinue} />}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-primary/30 bg-card px-6 py-10 text-center">
        <p lang="ja" className="max-w-full font-jp text-[56px] leading-tight font-medium md:text-[64px]">{reveal.expression ?? reveal.kana}</p>
        {reveal.hanViet && (
          <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wide text-yellow">{reveal.hanViet}</span>
        )}
        <div className="flex items-center gap-3">
          {reveal.expression && <p lang="ja" className="font-jp text-xl text-cyan">{reveal.kana}</p>}
          {reveal.romaji && <p className="text-sm text-muted-foreground">{reveal.romaji}</p>}
          <SpeakerButton kana={reveal.kana} />
        </div>
        <p className="text-pretty text-lg font-medium">{reveal.meaning}</p>
      </div>
    </ExercisePanel>
  )
}
