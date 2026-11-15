import { Blocks, Calculator, Ear, Keyboard, MessagesSquare, PenLine, Shuffle, Timer } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { GameCard } from '@/components/practice/game-card'
import { conversationLessons, getMistakeCount } from '@/lib/dal/listening'

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

export default async function PracticePage() {
  const mistakes = await getMistakeCount()
  // Luyện nghe (docs/listening-rules.md §V2.1): nghe theo đoạn, chép chính tả, nghe số, câu nghe sai
  const listening = [
    {
      href: '/practice/dictation',
      title: 'Dictation',
      jp: '書き取り',
      description: 'Hear a sentence of a Minna lesson and type it.',
      icon: PenLine,
      tone: 'cyan' as const,
      meta: 'Lessons 1–50',
      badge: 'New',
    },
    {
      href: '/practice/numbers',
      title: 'Numbers listening',
      jp: '数字',
      description: 'Numbers, prices, times and dates that sound alike.',
      icon: Calculator,
      tone: 'yellow' as const,
      meta: 'Choose or type',
      badge: 'New',
    },
    {
      href: '/practice/listening-mistakes',
      title: 'Listening mistakes',
      jp: '聞き直し',
      description: 'Listen again to the questions you got wrong.',
      icon: Ear,
      tone: 'pink' as const,
      meta: mistakes === 1 ? '1 question' : `${mistakes} questions`,
    },
    {
      href: conversationLessons().length > 0 ? '/practice/conversations' : null,
      title: 'Conversation listening',
      jp: '会話の聞き取り',
      description: 'A long conversation with blanks: pick the word you hear.',
      icon: MessagesSquare,
      tone: 'primary' as const,
      meta: conversationLessons().length > 0 ? `Lessons ${conversationLessons()[0]}–${conversationLessons().at(-1)}` : 'Coming soon',
    },
  ]
  return (
    <>
      <PageHeader eyebrow="練習" title="Practice Arena" description="Short, playful games to sharpen what you've learned." />
      <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">Listening</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {listening.map((g) => (
          <GameCard key={g.title} {...g} />
        ))}
      </div>
      <h2 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">Games</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {games.map((g) => (
          <GameCard key={g.title} {...g} />
        ))}
      </div>
    </>
  )
}
