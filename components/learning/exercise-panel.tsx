import { cn } from '@/lib/utils'

interface ExercisePanelProps {
  question?: string
  stage?: string
  children: React.ReactNode
  controls?: React.ReactNode
  footer: React.ReactNode
  className?: string
}

/** Layout for one exercise: centered prompt, controls in thumb reach, sticky footer. */
export function ExercisePanel({ question, stage, children, controls, footer, className }: ExercisePanelProps) {
  return (
    <div className={cn('flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-2 duration-200', className)}>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
        {(stage || question) && (
          <div className="pt-6 text-center md:pt-10">
            {stage && <p className="text-xs font-medium tracking-wider text-primary uppercase">{stage}</p>}
            {question && <h1 className="mt-2 text-balance text-lg font-medium text-subtle">{question}</h1>}
          </div>
        )}
        <div className="flex flex-1 items-center justify-center py-8 md:py-12">{children}</div>
        {controls && <div className="pb-6">{controls}</div>}
      </div>
      <div className="sticky bottom-0">{footer}</div>
    </div>
  )
}
