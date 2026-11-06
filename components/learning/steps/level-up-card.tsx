'use client'

import { ContinueFooter } from '@/components/learning/exercise-footer'
import { ExercisePanel } from '@/components/learning/exercise-panel'
import { Sparkles } from '@/components/sparkles'
import type { LevelUp } from '@/lib/learn/level-up'

/** Thẻ chúc mừng giữa hai câu. Chỉ hiện những gì người học đã được giới thiệu. */
export function LevelUpCard({ levelUp, onContinue }: { levelUp: LevelUp; onContinue: () => void }) {
  const { reveal } = levelUp
  return (
    <ExercisePanel stage="Level up" question={levelUp.title} footer={<ContinueFooter label="Continue" onClick={onContinue} />}>
      <div className="relative flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border border-primary/30 bg-card px-6 py-10 text-center animate-in fade-in zoom-in-95 duration-300">
        <Sparkles className="inset-0" />
        <p lang="ja" className="max-w-full font-jp text-[56px] leading-tight font-medium">{reveal.expression ?? reveal.kana}</p>
        {reveal.expression && <p lang="ja" className="font-jp text-xl text-cyan">{reveal.kana}</p>}
        <p className="text-lg font-medium">{reveal.meaning}</p>
        <p className="text-pretty text-sm text-subtle">{levelUp.body}</p>
      </div>
    </ExercisePanel>
  )
}
