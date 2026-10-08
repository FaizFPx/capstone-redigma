'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { quickUpdateParticipantStatusAction } from '@/app/(app)/peserta/actions'

interface ParticipantQuickStatusProps {
  participantId: string
  participantName: string
  currentStatusId: string
  actualStartDate?: string | null
  actualEndDate?: string | null
}

export function ParticipantQuickStatus({
  participantId,
  participantName,
  currentStatusId,
  actualStartDate,
  actualEndDate,
}: ParticipantQuickStatusProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const isBelumMulai = currentStatusId === 'belum_mulai'
  const isSedangMagang = currentStatusId === 'sedang_magang'

  // Default tanggal sesuai konteks
  const defaultDate = isBelumMulai
    ? actualStartDate || todayStr
    : actualEndDate || todayStr

  const [targetDate, setTargetDate] = useState<string>(defaultDate)

  // Jika sudah selesai atau status lain, jangan tampilkan quick action lifecycle
  if (!isBelumMulai && !isSedangMagang) {
    return null
  }

  const targetStatusId = isBelumMulai ? 'sedang_magang' : 'sudah_selesai'
  const actionLabel = isBelumMulai ? 'Mulai Magang' : 'Selesaikan Magang'
  const dialogTitle = isBelumMulai ? 'Mulai Magang?' : 'Selesaikan Magang?'
  const dialogDescription = isBelumMulai
    ? 'Status peserta akan diubah menjadi Sedang Magang.'
    : 'Pastikan peserta telah menyelesaikan masa magangnya sebelum mengubah status.'
  const dateFieldLabel = isBelumMulai ? 'Tanggal Mulai Riil' : 'Tanggal Selesai Riil'
  const dateHelperText = isBelumMulai
    ? 'Catat tanggal pertama kali peserta aktif melaksanakan kegiatan magang.'
    : 'Catat tanggal resmi penyelesaian program magang peserta.'

  const handleOpen = () => {
    setTargetDate(
      isBelumMulai ? actualStartDate || todayStr : actualEndDate || todayStr
    )
    setError(null)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isLoading) return
    setIsOpen(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await quickUpdateParticipantStatusAction(
        participantId,
        targetStatusId,
        targetDate || null
      )

      if (res?.error) {
        setError(res.error)
        setIsLoading(false)
      } else {
        setIsLoading(false)
        setIsOpen(false)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
      setIsLoading(false)
    }
  }

  return (
    <>
      {isBelumMulai && (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
          title="Ubah status peserta menjadi Sedang Magang"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Mulai Magang</span>
        </button>
      )}

      {isSedangMagang && (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors"
          title="Ubah status peserta menjadi Sudah Selesai"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Selesaikan Magang</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-7 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{dialogTitle}</h2>
                <p className="mt-0.5 text-xs text-gray-500 font-medium">
                  {participantName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="Tutup dialog"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <strong>Gagal:</strong> {error}
              </div>
            )}

            {/* Content & Description */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div
                className={`rounded-xl border p-3.5 text-xs ${
                  isBelumMulai
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    : 'border-blue-200 bg-blue-50/70 text-blue-900'
                }`}
              >
                <p className="leading-relaxed">{dialogDescription}</p>
              </div>

              {/* Tanggal Pelaksanaan Riil */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  {dateFieldLabel}
                </label>
                <p className="mt-0.5 text-xs text-gray-500">{dateHelperText}</p>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-xs transition-colors disabled:opacity-50 ${
                    isBelumMulai
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>{actionLabel}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
