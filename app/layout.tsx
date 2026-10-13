import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' })
const notoJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-jp',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Nihongo — Japanese Learning',
  description:
    'A calm, focused Japanese learning space for vocabulary, kanji, spaced repetition review and playful practice games.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0F1115',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoJp.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
