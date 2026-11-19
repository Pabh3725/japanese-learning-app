import { redirect } from 'next/navigation'

// V12 gói 4: phiên Review V11 đã tắt để Card không bị ôn hai lần; Card V12 ôn trong bộ thẻ ở Learn.
export default function ReviewSessionPage() {
  redirect('/learn')
}
