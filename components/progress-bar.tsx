import { cn } from '@/lib/utils'

const tones = {
  primary: 'bg-primary',
  cyan: 'bg-cyan',
  pink: 'bg-pink',
  yellow: 'bg-yellow',
  success: 'bg-success',
} as const

export type Tone = keyof typeof tones

interface ProgressBarProps {
  value: number
  max?: number
  tone?: Tone
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export function ProgressBar({ value, max = 100, tone = 'primary', size = 'md', label, className }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cn(
        'w-full overflow-hidden rounded-full bg-[#262b36]',
        size === 'sm' && 'h-1.5',
        size === 'md' && 'h-2.5',
        size === 'lg' && 'h-3.5',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', tones[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
