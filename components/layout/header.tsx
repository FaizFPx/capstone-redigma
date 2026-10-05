'use client'

import { usePathname } from 'next/navigation'
import { logout } from '@/app/(app)/actions'

interface HeaderProps {
  userName: string
  userRole: string
  onToggleMobileMenu: () => void
}

export function Header({ userName, userRole, onToggleMobileMenu }: HeaderProps) {
  const pathname = usePathname()

  // Format role label agar user-friendly
  const formatRole = (role: string) => {
    switch (role) {
      case 'hc_admin':
        return 'HC Admin'
      case 'hc_staff':
        return 'HC Staff'
      case 'mentor':
        return 'Mentor'
      default:
        return role || 'Pengguna'
    }
  }

  // Derive breadcrumb based on route
  const getBreadcrumbs = () => {
    if (pathname === '/dashboard') {
      return ['Dashboard']
    }
    if (pathname.startsWith('/pengajuan')) {
      const crumbs = ['Human Capital', 'Magang', 'Pengajuan']
      if (pathname === '/pengajuan/baru') crumbs.push('Baru')
      else if (pathname.endsWith('/edit')) crumbs.push('Edit')
      else if (pathname !== '/pengajuan') crumbs.push('Detail')
      return crumbs
    }
    if (pathname.startsWith('/peserta')) {
      const crumbs = ['Human Capital', 'Magang', 'Peserta']
      if (pathname === '/peserta/baru') crumbs.push('Baru')
      else if (pathname.endsWith('/edit')) crumbs.push('Edit')
      else if (pathname !== '/peserta') crumbs.push('Detail')
      return crumbs
    }
    if (pathname === '/monitoring') {
      return ['Human Capital', 'Magang', 'Monitoring']
    }
    if (pathname === '/riwayat') {
      return ['Human Capital', 'Magang', 'Riwayat']
    }
    if (pathname.startsWith('/master/institusi')) {
      return ['Konfigurasi', 'Master Data', 'Institusi']
    }
    if (pathname.startsWith('/master/jurusan')) {
      return ['Konfigurasi', 'Master Data', 'Jurusan']
    }
    if (pathname.startsWith('/master/posisi')) {
      return ['Konfigurasi', 'Master Data', 'Posisi']
    }
    return ['REDIGMA Magang']
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger toggle */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
          aria-label="Buka Menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Breadcrumbs navigation aid (Desktop) & Title (Mobile) */}
        <div className="flex items-center gap-2">
          {/* Mobile concise title */}
          <span className="text-base font-bold text-gray-900 md:hidden">
            {breadcrumbs[breadcrumbs.length - 1]}
          </span>

          {/* Desktop structured breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && (
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span
                  className={
                    idx === breadcrumbs.length - 1
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-500'
                  }
                >
                  {crumb}
                </span>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* User profile & actions */}
      <div className="flex items-center gap-4">
        {/* User detail info */}
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-800 line-clamp-1 max-w-[160px] md:max-w-none">
            {userName}
          </div>
          <div className="text-xs text-blue-600 font-medium">
            {formatRole(userRole)}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

        {/* Logout button */}
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            title="Keluar dari akun"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </form>
      </div>
    </header>
  )
}

export default Header
