import type { Metadata } from 'next'
import { KanjiSession } from '@/components/kanji/kanji-session'
import { getKanjiSession } from '@/lib/dal/kanji'

export const metadata: Metadata = { title: 'Kanji · Nihongo' }

export default async function KanjiSessionPage() {
  const data = await getKanjiSession()
  // clientEventId mới cho mỗi phiên, nên key đổi và phiên chạy lại từ đầu
  return <KanjiSession key={data.questions[0]?.clientEventId ?? data.intros[0]?.kanjiId ?? 'empty'} data={data} />
}
