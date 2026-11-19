import { redirect } from 'next/navigation'

// V12 gói 4: Card đến hạn nằm trong bộ thẻ hằng ngày của từng khu ở Learn, không còn phiên Review riêng.
export default function ReviewPage() {
  redirect('/learn')
}
