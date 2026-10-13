export function PageHeader({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string
  description?: string
  eyebrow?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p lang="ja" className="mb-2 font-jp text-sm text-primary">{eyebrow}</p>}
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-pretty text-subtle">{description}</p>}
      </div>
      {children}
    </div>
  )
}
