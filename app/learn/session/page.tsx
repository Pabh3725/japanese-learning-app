import { redirect } from 'next/navigation'

// V9: phiên 20 câu của từng nhóm được thay bằng bài Learn lọc một nhóm.
export default async function LearnSessionPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const { skill } = await searchParams
  redirect(`/learn/lesson?groups=${skill === 'word_kanji' ? 'word_kanji' : 'vocabulary'}`)
}
