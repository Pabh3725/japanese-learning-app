import { BarChart3, BookOpen, ClipboardCheck, Gamepad2, GraduationCap, Hash, Home, Library, RotateCcw, ScrollText, Settings } from 'lucide-react'

export const primaryNav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/learn', label: 'Learn', icon: GraduationCap },
  // Grammar là tab chính (docs/grammar-rules.md §1); Thể động từ nằm trong tab Grammar
  { href: '/grammar', label: 'Grammar', icon: ScrollText },
  { href: '/review', label: 'Review', icon: RotateCcw },
  // JLPT: ôn thi theo dạng bài (docs/jlpt-rules.md)
  { href: '/jlpt', label: 'JLPT', icon: ClipboardCheck },
  { href: '/practice', label: 'Practice', icon: Gamepad2 },
]

export const secondaryNav = [
  { href: '/library', label: 'Library', icon: Library },
  // Bảng tra và luyện từ đếm, ngày tháng, giờ phút
  { href: '/counters', label: 'Counters', icon: Hash },
  { href: '/progress', label: 'Progress', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const BrandIcon = BookOpen

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}
