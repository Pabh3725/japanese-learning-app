import { cva, type VariantProps } from 'class-variance-authority'

export const actionButton = cva(
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-[#9a8dff] shadow-[0_8px_24px_-8px_rgba(139,124,255,0.6)]',
        secondary: 'border border-border bg-secondary text-foreground hover:bg-[#252a35]',
        ghost: 'text-subtle hover:bg-secondary hover:text-foreground',
        success: 'bg-success text-primary-foreground hover:bg-success/90',
      },
      size: {
        sm: 'h-9 rounded-lg px-3 text-sm [&_svg]:size-4',
        md: 'h-11 rounded-xl px-5 text-sm [&_svg]:size-4',
        lg: 'h-14 rounded-2xl px-6 text-base [&_svg]:size-5',
        icon: 'size-11 rounded-xl [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ActionButtonProps = VariantProps<typeof actionButton>
