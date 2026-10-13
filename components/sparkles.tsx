import { cn } from '@/lib/utils'

function Star({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('absolute animate-twinkle', className)} style={style}>
      <path
        d="M12 2c.4 4.6 2.8 7.4 10 10-7.2 2.6-9.6 5.4-10 10-.4-4.6-2.8-7.4-10-10 7.2-2.6 9.6-5.4 10-10Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Soft decorative sparkles. Place inside a `relative` container. */
export function Sparkles({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
      <Star className="top-[14%] right-[12%] size-3 text-yellow" />
      <Star className="top-[52%] right-[6%] size-2 text-pink" style={{ animationDelay: '0.8s' }} />
      <Star className="top-[24%] right-[30%] size-2 text-cyan" style={{ animationDelay: '1.6s' }} />
    </div>
  )
}
