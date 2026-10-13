import type { Metadata } from 'next'
import { SpeedMatchingGame } from '@/components/practice/speed-matching-game'

export const metadata: Metadata = { title: 'Speed Matching · Nihongo' }

export default function SpeedMatchingPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <SpeedMatchingGame />
    </main>
  )
}
