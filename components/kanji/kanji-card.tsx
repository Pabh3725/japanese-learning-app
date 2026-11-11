'use client'

import { KanjiPartsInfo } from '@/components/kanji/kanji-parts'
import { KanjiStrokes } from '@/components/kanji/kanji-strokes'
import { SpeakerButton, useAutoSpeak } from '@/components/learning/speaker-button'
import type { KanjiIntroItem } from '@/lib/dal/kanji'
import type { KanjiReveal } from '@/lib/kanji/questions'

function Readings({ label, readings }: { label: string; readings: string[] }) {
  if (readings.length === 0) return null
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd lang="ja" className="font-jp text-lg text-cyan">{readings.join('、')}</dd>
    </div>
  )
}

/** Thẻ của một chữ: dùng khi giới thiệu và khi xem lại sau nhiều câu sai. */
export function KanjiCard({ kanji, examples }: { kanji: KanjiReveal; examples?: KanjiIntroItem['examples'] }) {
  const first = kanji.onyomi[0] ?? kanji.kunyomi[0] ?? ''
  useAutoSpeak(first)
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-primary/30 bg-card px-6 py-8 text-center">
      <p lang="ja" className="font-jp text-[88px] leading-none font-medium">{kanji.character}</p>
      <span className="rounded-full bg-yellow/12 px-3 py-1 text-sm font-semibold tracking-wide text-yellow">{kanji.hanViet}</span>
      <div className="flex items-center gap-2">
        <p className="text-pretty text-lg font-medium">{kanji.meaning}</p>
        {first && <SpeakerButton kana={first} />}
      </div>
      <dl className="flex w-full flex-col gap-2 border-t border-border pt-4">
        <Readings label="On reading" readings={kanji.onyomi} />
        <Readings label="Kun reading" readings={kanji.kunyomi} />
      </dl>
      {kanji.visual && (
        <div className="grid w-full items-center gap-4 border-t border-border pt-4 sm:grid-cols-[1fr_auto]">
          <KanjiPartsInfo visual={kanji.visual} />
          <KanjiStrokes strokes={kanji.visual.strokes} size={120} label={`Stroke order of ${kanji.character}, ${kanji.visual.strokes.length} strokes`} />
        </div>
      )}
      {examples && examples.length > 0 && (
        <ul className="flex w-full flex-col gap-1 border-t border-border pt-4 text-left text-sm">
          {examples.map((word) => (
            <li key={word.expression + word.reading} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span lang="ja" className="font-jp">{word.expression}</span>
              <span className="text-subtle">{word.meaning}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
