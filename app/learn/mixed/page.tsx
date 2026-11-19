import { redirect } from 'next/navigation'

// V12 gói 4: trang học V11 đã thay bằng bộ thẻ ba khu ở /learn (code cũ dọn ở gói 5).
export default function Page() {
  redirect('/learn')
}
