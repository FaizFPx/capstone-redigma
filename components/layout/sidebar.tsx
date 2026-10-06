'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface SubMenuItem {
  title: string
  href: string
  icon: (props: { className?: string }) => React.ReactNode
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  // Detect active sections
  const isMagangActive =
    pathname.startsWith('/pengajuan') ||
    pathname.startsWith('/peserta') ||
    pathname === '/monitoring' ||
    pathname === '/riwayat'

  const isMasterActive = pathname.startsWith('/master')
  const isDashboardActive = pathname === '/dashboard'

  // Parent menu collapsible states
  // Auto-expanded if currently in that section, default Magang open
  const [magangOpen, setMagangOpen] = useState<boolean>(
    isMagangActive || (!isMasterActive && !isDashboardActive) || true
  )
  const [masterOpen, setMasterOpen] = useState<boolean>(isMasterActive)

  // Expand parent if navigation moves into its child routes
  useEffect(() => {
    if (isMagangActive) {
      setMagangOpen(true)
    }
  }, [isMagangActive])

  useEffect(() => {
    if (isMasterActive) {
      setMasterOpen(true)
    }
  }, [isMasterActive])

  const magangSubmenu: SubMenuItem[] = [
    {
      title: 'Pengajuan',
      href: '/pengajuan',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: 'Peserta',
      href: '/peserta',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Monitoring',
      href: '/monitoring',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Riwayat',
      href: '/riwayat',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const masterSubmenu: SubMenuItem[] = [
    {
      title: 'Institusi',
      href: '/master/institusi',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: 'Jurusan',
      href: '/master/jurusan',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      title: 'Posisi',
      href: '/master/posisi',
      icon: ({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Backdrop overlay for mobile off-canvas drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity md:hidden cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container with Dark Navy theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-[#1e293b] bg-[#0b1329] text-slate-300 transition-all duration-200 ease-in-out md:static md:translate-x-0 md:pointer-events-auto md:visible ${
          isOpen
            ? 'translate-x-0 pointer-events-auto visible shadow-2xl'
            : '-translate-x-full pointer-events-none invisible'
        }`}
      >
        {/* Brand Header */}
        <div className="relative flex items-center justify-center border-b border-slate-800/90 px-4 py-5">
          <Link
            href="/dashboard"
            className="flex items-center justify-center transition-opacity hover:opacity-90"
            aria-label="REDIGMA Magang - Beranda Dashboard"
          >
            <Image
              src="/img/title.png"
              alt="REDIGMA Magang"
              width={170}
              height={46}
              className="w-[170px] h-auto object-contain"
              priority
            />
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Tutup Menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-4">
          {/* Dashboard Item */}
          <div className="mb-2">
            <Link
              href="/dashboard"
              onClick={onClose}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isDashboardActive
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <svg
                className={`h-5 w-5 shrink-0 ${
                  isDashboardActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Section: HUMAN CAPITAL */}
          <div className="pt-2">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Human Capital
            </div>

            {/* Parent Menu: Magang */}
            <button
              type="button"
              onClick={() => setMagangOpen((prev) => !prev)}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isMagangActive
                  ? 'text-white font-medium bg-slate-800/40'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
              aria-expanded={magangOpen}
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`h-5 w-5 shrink-0 ${
                    isMagangActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 14l9-5-9-5-9 5 9 5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                  />
                </svg>
                <span>Magang</span>
              </div>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                  magangOpen ? 'rotate-90' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Submenu Magang with indentation */}
            {magangOpen && (
              <div className="mt-1 space-y-1 pl-3 ml-3 border-l border-slate-800">
                {magangSubmenu.map((sub) => {
                  const active = isItemActive(sub.href)
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onClose}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-600/20 text-blue-400 font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      <sub.icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span>{sub.title}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section: KONFIGURASI */}
          <div className="pt-3">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Konfigurasi
            </div>

            {/* Parent Menu: Master Data */}
            <button
              type="button"
              onClick={() => setMasterOpen((prev) => !prev)}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isMasterActive
                  ? 'text-white font-medium bg-slate-800/40'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
              aria-expanded={masterOpen}
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`h-5 w-5 shrink-0 ${
                    isMasterActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                <span>Master Data</span>
              </div>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                  masterOpen ? 'rotate-90' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Submenu Master Data with indentation */}
            {masterOpen && (
              <div className="mt-1 space-y-1 pl-3 ml-3 border-l border-slate-800">
                {masterSubmenu.map((sub) => {
                  const active = isItemActive(sub.href)
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onClose}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-600/20 text-blue-400 font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      <sub.icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span>{sub.title}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Footer info */}
        <div className="border-t border-slate-800/90 p-3.5 text-center text-[11px] text-slate-400">
          REDIGMA &bull; Human Capital
        </div>
      </aside>
    </>
  )
}

export default Sidebar
