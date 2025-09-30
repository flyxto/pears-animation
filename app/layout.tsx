import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pears Animated Drawings',
  description: 'Animate your drawings with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}