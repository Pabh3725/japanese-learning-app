import { Blocks, Keyboard, Shuffle, Timer } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { GameCard } from '@/components/practice/game-card'
import { GameSettings } from '@/components/practice/game-settings'

const games = [
  {
    href: '/practice/speed-matching',
    title: 'Speed Matching',
    jp: 'スピードマッチ',
    description: 'Match Japanese words with their meanings. Correct pairs vanish and new ones appear.',
    icon: Shuffle,
    tone: 'cyan' as const,
    meta: 'Best: 24 pairs',
    badge: 'Playable',
  },
  {
    href: '/practice',
    title: 'Rapid Fire',
    jp: 'ラピッドファイア',
    description: 'Quick multiple-choice questions against the clock. Keep your streak alive.',
    icon: Timer,
    tone: 'pink' as const,
    meta: '20 questions',
  },
  {
    href: '/learn/session?mode=vocab',
    title: 'Word Builder',
    jp: 'ことば作り',
    description: 'Assemble Japanese words from shuffled Hiragana or Kanji pieces.',
    icon: Blocks,
    tone: 'yellow' as const,
    meta: 'Kana & Kanji',
  },
  {
    href: '/practice',
    title: 'Recall Sprint',
    jp: 'リコール',
    description: 'Type the reading or meaning from memory. No choices, no hints.',
    icon: Keyboard,
    tone: 'primary' as const,
    meta: 'Typing',
  },
]

export default function PracticePage() {
  return (
    <>
      <PageHeader eyebrow="練習" title="Practice Arena" description="Short, playful games to sharpen what you've learned." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {games.map((g) => (
            <GameCard key={g.title} {...g} />
          ))}
        </div>
        <GameSettings />
      </div>
    </>
  )
}
