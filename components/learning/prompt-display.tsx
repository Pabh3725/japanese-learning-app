import { jpSizeClass } from '@/lib/learning-engine'
import type { StepPrompt } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PromptDisplay({ prompt }: { prompt: StepPrompt }) {
  const isJapanese = prompt.kind !== 'meaning'
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {isJapanese ? (
        <p lang="ja" className={cn('font-jp leading-none font-medium', jpSizeClass(prompt.display, prompt.kind as 'kanji' | 'vocab' | 'kana'))}>
          {prompt.display}
        </p>
      ) : (
        <p className="text-balance text-3xl font-semibold md:text-4xl">{prompt.display}</p>
      )}
      {prompt.hint && <p className="text-lg text-muted-foreground">{prompt.hint}</p>}
    </div>
  )
}
