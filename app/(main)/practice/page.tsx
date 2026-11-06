import { Blocks, Keyboard, Shuffle, Timer } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { GameCard } from '@/components/practice/game-card'

const games = [
  {
    href: '/practice/speed-matching',
    title: 'Speed Matching',
    jp: 'スピードマッチ',
    description: 'Clear a 4×4 board of scrambled words and meanings, then a new board appears.',
    icon: Shuffle,
    tone: 'cyan' as const,
    meta: '60 seconds',
    badge: 'Playable',
  },
  {
    href: null,
    title: 'Rapid Fire',
    jp: 'ラピッドファイア',
    description: 'Quick multiple-choice questions against the clock.',
    icon: Timer,
    tone: 'pink' as const,
    meta: '20 questions',
  },
  {
    href: null,
    title: 'Word Builder',
    jp: 'ことば作り',
    description: 'Assemble Japanese words from shuffled Hiragana or Kanji pieces.',
    icon: Blocks,
    tone: 'yellow' as const,
    meta: 'Kana & Kanji',
  },
  {
    href: null,
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
      <div className="grid gap-4 sm:grid-cols-2">
        {games.map((g) => (
          <GameCard key={g.title} {...g} />
        ))}
      </div>
    </>
  )
}
