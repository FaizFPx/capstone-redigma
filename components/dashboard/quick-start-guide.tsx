'use client'

import { useState } from 'react'
import Link from 'next/link'

interface QuickStartGuideProps {
  totalApplications?: number
}

export function QuickStartGuide({ totalApplications = 0 }: QuickStartGuideProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)

  const steps = [
    {
      number: 1,
      title: 'Catat Pengajuan',
      description: 'Catat surat/permohonan magang yang masuk.',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      href: '/pengajuan/baru',
      hrefLabel: 'Buat Pengajuan',
    },
    {
      number: 2,
      title: 'Tindak Lanjut & Keputusan',
      description: 'Verifikasi pengajuan, kuota, dan proses seleksi.',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      href: '/pengajuan',
      hrefLabel: 'Lihat Daftar',
    },
    {
      number: 3,
      title: 'Daftarkan Peserta',
      description: 'Setelah pengajuan diterima, daftarkan peserta dari pengajuan tersebut.',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
      href: '/peserta',
      hrefLabel: 'Kelola Peserta',
    },
    {
      number: 4,
      title: 'Pantau Masa Magang',
      description: 'Pantau peserta aktif sampai masa magangnya selesai.',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      href: '/monitoring',
      hrefLabel: 'Monitoring',
    },
  ]

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-5 sm:p-6 shadow-xs transition-all">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            Alur Pengelolaan Magang
          </div>
          <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
            Selamat datang di REDIGMA Magang
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Ikuti 4 alur pengelolaan magang untuk menyelesaikan proses dari surat masuk hingga kelulusan peserta.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Link
            href="/pengajuan/baru"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Catat Pengajuan Baru</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            title={isCollapsed ? 'Tampilkan detail alur' : 'Sembunyikan detail alur'}
            aria-label={isCollapsed ? 'Tampilkan detail alur' : 'Sembunyikan detail alur'}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stepper Content */}
      {!isCollapsed && (
        <div className="mt-5 pt-4 border-t border-blue-100/60">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white/90 p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700 border border-blue-100">
                      {step.number}
                    </span>
                    <span className="text-gray-400">{step.icon}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <Link
                    href={step.href}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <span>{step.hrefLabel}</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {totalApplications === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>Mulai pertama kali:</strong> Belum ada pengajuan magang yang tercatat. Klik tombol{' '}
                <strong>"+ Catat Pengajuan Baru"</strong> di atas untuk membuat berkas pengajuan pertama.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QuickStartGuide
