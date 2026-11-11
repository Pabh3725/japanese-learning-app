import { redirect } from 'next/navigation'

// V9: phiên của khu Kanji được thay bằng bài Learn lọc nhóm Kanji.
export default function KanjiSessionPage() {
  redirect('/learn/lesson?groups=kanji')
}
