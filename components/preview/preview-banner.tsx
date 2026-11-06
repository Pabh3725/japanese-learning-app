/** Báo rõ đây là bản xem trước, để không nhầm với tính năng đã hoạt động. */
export function PreviewBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 rounded-2xl border border-yellow/30 bg-yellow/10 px-4 py-3 text-sm text-yellow">
      <span className="font-semibold">Preview.</span> {children}
    </p>
  )
}
