'use client'

// Grammar: thẻ một mẫu (giới thiệu trong phiên Học, trang chi tiết). Câu ví dụ có furigana và nút nghe.
import { Volume2 } from 'lucide-react'
import { RubySentence } from '@/components/grammar/ruby-sentence'
import type { GrammarIntro } from '@/lib/dal/grammar'
import { speakText } from '@/lib/grammar/questions'
import { speak } from '@/lib/speech'

export function GrammarExamples({ examples, furigana }: { examples: GrammarIntro['examples']; furigana: boolean }) {
  return (
    <ul className="flex w-full flex-col gap-3">
      {examples.map((e, i) => (
        <li key={i} className="rounded-2xl border border-border bg-background/40 px-4 py-3 text-left">
          {e.context && (
            <div className="mb-1 opacity-80">
              <RubySentence pieces={e.context.pieces} furigana={furigana} className="text-lg md:text-xl" />
              <p className="text-xs text-muted-foreground">{e.context.meaning}</p>
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <RubySentence pieces={e.pieces} furigana={furigana} className="text-xl md:text-2xl" />
            <button type="button" onClick={() => speak(speakText(e.pieces))} className="mt-2 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Listen">
              <Volume2 className="size-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-subtle">{e.meaning}</p>
        </li>
      ))}
    </ul>
  )
}

export function GrammarIntroCard({ point, furigana }: { point: GrammarIntro; furigana: boolean }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-3xl border border-primary/30 bg-card px-5 py-6 text-center">
      <p lang="ja" className="font-jp text-3xl font-medium md:text-4xl">{point.pattern}</p>
      <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold text-yellow">{point.meaning}</span>
      <p className="text-pretty text-left text-base leading-relaxed text-subtle">{point.explanation}</p>
      {point.notes && <p className="w-full rounded-xl bg-secondary/60 px-3 py-2 text-left text-sm text-muted-foreground">{point.notes}</p>}
      <GrammarExamples examples={point.examples} furigana={furigana} />
    </div>
  )
}
