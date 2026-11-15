import { redirect } from 'next/navigation'

/** Tab Listening đã bỏ (docs/listening-rules.md §V2.1): nghe theo câu ở Grammar, nghe theo đoạn và Dictation ở Practice. */
export default function ListeningPage() {
  redirect('/practice')
}
