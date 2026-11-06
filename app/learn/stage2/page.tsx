import { redirect } from 'next/navigation'

// Các stage đã gộp vào một phiên khu Learn. Giữ đường dẫn cũ để link đã lưu vẫn dùng được.
export default function Stage2Page() {
  redirect('/learn/session')
}
