import { V12Hub } from '@/components/v12/v12-hub'
import { getHub } from '@/lib/dal/v12/deck'

// V12 (gói 4, bật cho mọi người): ba khu Kana / Kanji / Từ vựng Kanji, nút "Học tất cả" (docs/learning-rules-v12.md).
export default async function LearnPage() {
  return <V12Hub hub={await getHub()} />
}
