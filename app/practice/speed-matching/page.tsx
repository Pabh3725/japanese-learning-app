import type { Metadata } from 'next'
import Link from 'next/link'
import { actionButton } from '@/components/action-button'
import { SpeedMatchingSetup } from '@/components/practice/speed-matching-setup'
import { getSpeedModes } from '@/lib/dal/speed-matching'
import { MIN_SPEED_WORDS } from '@/lib/speed-matching'

export const metadata: Metadata = { title: 'Speed Matching · Nihongo' }

export default async function SpeedMatchingPage() {
  const modes = await getSpeedModes()
  const mixed = modes.find((m) => m.mode === 'mixed')?.total ?? 0

  return (
    <main className="flex min-h-dvh flex-col">
      {mixed >= MIN_SPEED_WORDS ? (
        <SpeedMatchingSetup modes={modes} />
      ) : (
        <div className="m-auto flex max-w-md flex-col items-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-semibold">Learn a few more words first</h1>
          <p className="text-subtle">Speed Matching uses the words you&apos;ve met. You need at least {MIN_SPEED_WORDS} different words, and you have {mixed}.</p>
          <Link href="/learn" className={actionButton({ size: 'lg' })}>Go to Learn</Link>
        </div>
      )}
    </main>
  )
}
