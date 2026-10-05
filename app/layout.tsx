import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'REDIGMA Magang',
  description: 'Sistem Informasi Pengelolaan dan Monitoring Peserta Magang',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
