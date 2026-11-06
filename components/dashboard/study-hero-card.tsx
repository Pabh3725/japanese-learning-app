import Link from 'next/link'
import { Play } from 'lucide-react'
import { actionButton } from '@/components/action-button'
import { cn } from '@/lib/utils'

/** Thẻ lớn dẫn vào một khu học. Không còn gì để làm thì ẩn nút. */
export function StudyHeroCard({ eyebrow, title, subtitle, href, cta }: { eyebrow: string; title: string; subtitle: string; href?: string; cta: string }) {
  return (
    <section className="flex flex-col justify-between gap-6 rounded-3xl border border-primary/30 bg-card p-6 md:p-8">
      <div>
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-balance text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-subtle">{subtitle}</p>
      </div>
      {href && (
        <Link href={href} className={cn(actionButton({ size: 'lg' }), 'w-full')}>
          <Play className="fill-current" aria-hidden="true" />
          {cta}
        </Link>
      )}
    </section>
  )
}
