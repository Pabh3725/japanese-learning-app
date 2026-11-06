import type { Metadata } from 'next'
import Link from 'next/link'
import { actionButton } from '@/components/action-button'
import { SpeedMatchingGame } from '@/components/practice/speed-matching-game'
import { getSpeedMatchWords } from '@/lib/dal/speed-matching'
import { MIN_SPEED_WORDS } from '@/lib/speed-matching'

export const metadata: Metadata = { title: 'Speed Matching · Nihongo' }

export default async function SpeedMatchingPage() {
  const words = await getSpeedMatchWords()

  return (
    <main className="flex min-h-dvh flex-col">
      {words.length >= MIN_SPEED_WORDS ? (
        <SpeedMatchingGame words={words} />
      ) : (
        <div className="m-auto flex max-w-md flex-col items-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-semibold">Learn a few more words first</h1>
          <p className="text-subtle">Speed Matching uses the words you&apos;ve met. You need at least {MIN_SPEED_WORDS} different words, and you have {words.length}.</p>
          <Link href="/learn" className={actionButton({ size: 'lg' })}>Go to Learn</Link>
        </div>
      )}
    </main>
  )
}
