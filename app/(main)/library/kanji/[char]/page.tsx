import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { KanjiPartsInfo } from '@/components/kanji/kanji-parts'
import { KanjiStarButton, StarredKanjiProvider } from '@/components/kanji/kanji-star-button'
import { KanjiStrokes } from '@/components/kanji/kanji-strokes'
import { KanjiKnownToggle } from '@/components/library/kanji-known-toggle'
import { getKanjiDetail } from '@/lib/dal/kanji'
import { KANJIVG_CREDIT } from '@/lib/kanji/visual'

export const metadata: Metadata = { title: 'Kanji · Nihongo' }

function Readings({ label, readings }: { label: string; readings: string[] }) {
  if (readings.length === 0) return null
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd lang="ja" className="font-jp text-lg text-cyan">{readings.join('、')}</dd>
    </div>
  )
}

/** V9 R12: trang chi tiết một chữ — bộ thủ, thành phần, nét viết, chữ gần giống, từ có chứa chữ. */
export default async function KanjiDetailPage({ params }: { params: Promise<{ char: string }> }) {
  const { char } = await params
  const kanji = await getKanjiDetail(decodeURIComponent(char))
  if (!kanji) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link href="/library?tab=kanji" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Library
      </Link>

      <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:p-8">
        <div className="flex flex-col gap-3">
          <h1 lang="ja" className="font-jp text-7xl leading-none font-medium">{kanji.character}</h1>
          <p className="text-sm font-semibold tracking-wider text-yellow">{kanji.hanViet}</p>
          <p className="text-lg font-medium">{kanji.meaning}</p>
          <p className="text-sm text-muted-foreground">
            {kanji.jlpt !== null ? `N${kanji.jlpt}` : ''}
          </p>
          <dl className="flex flex-col gap-2 border-t border-border pt-3">
            <Readings label="On reading" readings={kanji.onyomi} />
            <Readings label="Kun reading" readings={kanji.kunyomi} />
          </dl>
          <div className="flex items-center gap-3">
            <StarredKanjiProvider ids={kanji.starred ? [kanji.id] : []}>
              <KanjiStarButton kanjiId={kanji.id} />
            </StarredKanjiProvider>
            <KanjiKnownToggle kanjiId={kanji.id} known={kanji.known} />
          </div>
        </div>
        {kanji.visual && <KanjiStrokes strokes={kanji.visual.strokes} size={180} label={`Stroke order of ${kanji.character}, ${kanji.visual.strokes.length} strokes`} />}
      </section>

      {kanji.visual && (kanji.visual.radical || kanji.visual.parts.length > 0) && (
        <section aria-labelledby="parts-title" className="rounded-3xl border border-border bg-card p-6">
          <h2 id="parts-title" className="mb-4 font-semibold">Radical and parts</h2>
          <KanjiPartsInfo visual={kanji.visual} />
        </section>
      )}

      {kanji.similar.length > 0 && (
        <section aria-labelledby="similar-title" className="rounded-3xl border border-border bg-card p-6">
          <h2 id="similar-title" className="font-semibold">Looks similar</h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {kanji.similar.map((s) => (
              <li key={s.character} className="flex flex-col gap-1 py-3">
                <Link href={`/library/kanji/${encodeURIComponent(s.character)}`} className="flex items-baseline gap-3 hover:text-primary">
                  <span lang="ja" className="font-jp text-2xl">{s.character}</span>
                  <span className="text-sm font-semibold text-yellow">{s.hanViet}</span>
                  <span className="text-sm text-subtle">{s.meaning}</span>
                </Link>
                <p className="text-sm text-muted-foreground">{s.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {kanji.words.length > 0 && (
        <section aria-labelledby="words-title" className="rounded-3xl border border-border bg-card p-6">
          <h2 id="words-title" className="font-semibold">Words with this Kanji</h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {kanji.words.map((w) => (
              <li key={w.code}>
                <Link href={`/library/${w.code}`} className="flex flex-wrap items-baseline gap-x-3 py-3 hover:text-primary">
                  <span lang="ja" className="font-jp text-xl">{w.expression}</span>
                  <span lang="ja" className="font-jp text-sm text-cyan">{w.reading}</span>
                  <span className="text-sm text-subtle">{w.meaning}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {kanji.visual && <p className="text-xs text-muted-foreground">{KANJIVG_CREDIT}</p>}
    </div>
  )
}
