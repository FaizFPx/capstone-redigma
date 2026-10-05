'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface UseUnsavedChangesOptions {
  isDirty: boolean
  fallbackBackUrl?: string
  onLeave?: () => void
}

/**
 * Modal konfirmasi yang mengikuti design system REDIGMA
 */
export function UnsavedChangesModal({
  isOpen,
  onStay,
  onLeave,
}: {
  isOpen: boolean
  onStay: () => void
  onLeave: () => void
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onStay}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3
                id="unsaved-modal-title"
                className="text-base font-bold text-gray-900"
              >
                Perubahan belum disimpan
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onStay}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Tutup dialog"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          Anda memiliki perubahan yang belum disimpan. Jika meninggalkan halaman,
          data yang sudah dimasukkan akan hilang.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onStay}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Tetap di Halaman
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
          >
            Tinggalkan Halaman
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable unsaved changes protection hook
 */
export function useUnsavedChangesGuard({
  isDirty,
  fallbackBackUrl,
  onLeave,
}: UseUnsavedChangesOptions) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const isDirtyRef = useRef(isDirty)
  const isNavigatingRef = useRef(false)
  const isGuardedRef = useRef(false)
  const pendingNavRef = useRef<
    { type: 'push'; url: string } | { type: 'back' } | null
  >(null)

  // Sinkronkan ref saat isDirty berubah
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // Dipanggil setelah submit berhasil untuk mematikan guard sebelum navigasi
  const markClean = useCallback(() => {
    isDirtyRef.current = false
    isNavigatingRef.current = true
    setShowModal(false)
    pendingNavRef.current = null
  }, [])

  // 1. Browser BeforeUnload (Refresh / F5 / Close Tab / Navigasi Eksternal)
  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current || isNavigatingRef.current) return
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  // 2. Intersepsi Navigasi Link Internal (Sidebar, Breadcrumbs, Batal, Kembali)
  useEffect(() => {
    if (!isDirty) return

    const handleClickCapture = (e: MouseEvent) => {
      if (isNavigatingRef.current) return
      if (!isDirtyRef.current) return

      // Lewatkan klik dengan tombol selain klik kiri atau menggunakan tombol modifier
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return
      }

      const target = e.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        return
      }

      if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.origin)
        if (targetUrl.origin !== window.location.origin) {
          return
        }

        const currentUrl = new URL(window.location.href)
        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return
        }

        // Hentikan navigasi normal Next.js Link
        e.preventDefault()
        e.stopPropagation()

        pendingNavRef.current = {
          type: 'push',
          url: targetUrl.pathname + targetUrl.search + targetUrl.hash,
        }
        setShowModal(true)
      } catch {
        // Abaikan parse URL error
      }
    }

    document.addEventListener('click', handleClickCapture, true)
    return () => {
      document.removeEventListener('click', handleClickCapture, true)
    }
  }, [isDirty])

  // 3. Browser Back / Forward Protection (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Ketika form berubah dirty, sisipkan history guard jika belum ada
    if (isDirty && !isGuardedRef.current) {
      window.history.pushState({ __redigma_guard: true }, '', window.location.href)
      isGuardedRef.current = true
    }

    const handlePopState = () => {
      if (isNavigatingRef.current) return

      if (isDirtyRef.current) {
        // Tahan history dengan memasukkan state guard kembali
        window.history.pushState({ __redigma_guard: true }, '', window.location.href)
        isGuardedRef.current = true
        pendingNavRef.current = { type: 'back' }
        setShowModal(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isDirty])

  // Tetap di halaman
  const handleStay = useCallback(() => {
    setShowModal(false)
    pendingNavRef.current = null
  }, [])

  // Tinggalkan halaman (konfirmasi user)
  const handleLeave = useCallback(() => {
    isNavigatingRef.current = true
    isDirtyRef.current = false
    setShowModal(false)
    onLeave?.()

    const nav = pendingNavRef.current
    pendingNavRef.current = null

    if (nav?.type === 'push') {
      router.push(nav.url)
    } else if (nav?.type === 'back') {
      const currentPath = window.location.pathname
      if (window.history.length > 2) {
        window.history.go(-2)
      } else if (fallbackBackUrl) {
        router.push(fallbackBackUrl)
      } else {
        window.history.go(-2)
      }

      // Fallback jika history.go(-2) tidak berpindah setelah 200ms
      if (fallbackBackUrl) {
        setTimeout(() => {
          if (window.location.pathname === currentPath) {
            router.push(fallbackBackUrl)
          }
        }, 200)
      }
    }
  }, [router, fallbackBackUrl, onLeave])

  // Tutup modal jika tombol Escape ditekan
  useEffect(() => {
    if (!showModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleStay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, handleStay])

  return {
    markClean,
    showModal,
    handleStay,
    handleLeave,
    DialogElement: (
      <UnsavedChangesModal
        isOpen={showModal}
        onStay={handleStay}
        onLeave={handleLeave}
      />
    ),
  }
}
