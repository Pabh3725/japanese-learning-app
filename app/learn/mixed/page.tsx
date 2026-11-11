import { redirect } from 'next/navigation'

// V9: nút Learn chạy bài Learn (AIS), thay phiên hỗn hợp cụm 5 câu.
export default function MixedPage() {
  redirect('/learn/lesson')
}
