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
          <div className="pt-3 text-center md:pt-4">
            {stage && <p className="text-[11px] font-medium tracking-wider text-primary uppercase">{stage}</p>}
            {question && <h1 className="mt-1 text-balance text-base font-medium text-subtle">{question}</h1>}
          </div>
        )}
        {/* Nội dung đặt gần đầu trang thay vì giữa màn hình, để không bị thấp trên màn hình cao */}
        <div className="flex flex-1 items-start justify-center pt-4 pb-6 md:pt-8 md:pb-10">{children}</div>
        {controls && <div className="pb-6">{controls}</div>}
      </div>
      <div className="sticky bottom-0">{footer}</div>
    </div>
  )
}
