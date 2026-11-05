import { redirect } from 'next/navigation'

// Bài ghép kana đã gộp vào /learn/stage2 (SCH-02). Giữ đường dẫn cũ để link đã lưu vẫn dùng được.
export default function LearnBuildPage() {
  redirect('/learn/stage2')
}
