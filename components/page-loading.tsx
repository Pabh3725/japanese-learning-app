/** Hiện ngay khi chuyển trang, để người dùng biết app đang tải dữ liệu. */
export function PageLoading() {
  return (
    <div role="status" className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
