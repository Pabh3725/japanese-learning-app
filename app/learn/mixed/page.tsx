import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { StarredWordsProvider } from '@/components/learning/star-button'
import { MixedSession, type MixedSegment } from '@/components/learning/mixed-session'
import { getKanjiSession } from '@/lib/dal/kanji'
import { getLearnSession } from '@/lib/dal/stage-session'

export const metadata: Metadata = { title: 'Mixed · Nihongo' }

const CHUNK = 5

function chunks<T>(items: readonly T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK))
  return out
}

export default async function MixedPage() {
  const [vocabulary, wordKanji, kanji] = await Promise.all([getLearnSession(false, 'vocabulary'), getLearnSession(false, 'word_kanji'), getKanjiSession()])
  // Nút Learn: thẻ giới thiệu (từ mới, chữ mới, thẻ Kanji của từ) chưa xen được vào phiên trộn, nên làm trước ở phiên của nhóm đó.
  // Gói 5 (AIS) sẽ xen thẻ giới thiệu thẳng vào phiên trộn.
  if (vocabulary.intros.length > 0) redirect('/learn/session')
  if (kanji.intros.length > 0) redirect('/learn/kanji/session')
  if (wordKanji.intros.length > 0) redirect('/learn/session?skill=word_kanji')
  // Vòng ghép cuối phiên phải đứng sau mọi câu của từ đó, nên chỉ lấy câu thường cho phiên hỗn hợp
  const plain = (list: typeof vocabulary.questions) => list.filter((q) => q.kind !== 'match' && q.kind !== 'boss')
  const groups: MixedSegment[][] = [
    chunks(plain(vocabulary.questions)).map((questions): MixedSegment => ({ kind: 'stage', questions })),
    chunks(plain(wordKanji.questions)).map((questions): MixedSegment => ({ kind: 'stage', questions })),
    chunks(kanji.questions).map((questions): MixedSegment => ({ kind: 'kanji', questions })),
  ]
  const segments: MixedSegment[] = []
  for (let round = 0; groups.some((group) => group[round]); round++) {
    for (const group of groups) if (group[round]) segments.push(group[round])
  }
  return (
    <StarredWordsProvider ids={vocabulary.starredIds}>
      <MixedSession key={segments[0]?.questions[0]?.clientEventId ?? 'empty'} segments={segments} />
    </StarredWordsProvider>
  )
}
