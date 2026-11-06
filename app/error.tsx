'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { actionButton } from '@/components/action-button'

// Không hiện nội dung lỗi cho người dùng: có thể chứa chi tiết kỹ thuật của database.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-balance text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-subtle">We couldn&apos;t load this page. Your saved progress is safe. Check your connection and try again.</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <button type="button" onClick={() => retry()} autoFocus className={actionButton({ size: 'lg' })}>
          Try again
        </button>
        <Link href="/" className={actionButton({ size: 'lg', variant: 'secondary' })}>
          Back to Home
        </Link>
      </div>
    </div>
  )
}
