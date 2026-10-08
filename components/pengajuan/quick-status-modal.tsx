'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { quickUpdateApplicationStatusAction } from '@/app/(app)/pengajuan/actions'
import type { Stage, Decision } from '@/app/(app)/pengajuan/types'

interface QuickStatusModalProps {
  applicationId: string
  currentStageId: string
  currentDecisionId: string
  institutionName?: string | null
  applicationType?: string
  stages: Stage[]
  decisions: Decision[]
}

export function QuickStatusModal({
  applicationId,
  currentStageId,
  currentDecisionId,
  institutionName,
  applicationType,
  stages,
  decisions,
}: QuickStatusModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [selectedStage, setSelectedStage] = useState<string>(currentStageId)
  const [selectedDecision, setSelectedDecision] = useState<string>(currentDecisionId)
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = () => {
    setSelectedStage(currentStageId)
    setSelectedDecision(currentDecisionId)
    setNotes('')
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
      const res = await quickUpdateApplicationStatusAction(
        applicationId,
        selectedStage,
        selectedDecision,
        notes
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
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-xs hover:bg-blue-100 hover:text-blue-800 transition-colors"
        title="Ubah tahap dan keputusan pengajuan secara cepat"
      >
        <svg
          className="h-4 w-4 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>Ubah Status</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-7 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Ubah Status Pengajuan
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {institutionName || 'Pengajuan'}
                  {applicationType ? ` • ${applicationType}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="Tutup modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                <strong>Gagal menyimpan:</strong> {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Field 1: Tahap Pengajuan */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Tahap Pengajuan <span className="text-red-500">*</span>
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  Tahap progres verifikasi berkas oleh tim Human Capital.
                </p>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  required
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Keputusan Pengajuan */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Keputusan Seleksi <span className="text-red-500">*</span>
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  Keputusan resmi penerimaan atau penolakan pengajuan magang.
                </p>
                <select
                  value={selectedDecision}
                  onChange={(e) => setSelectedDecision(e.target.value)}
                  required
                  className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                >
                  {decisions.map((dec) => (
                    <option key={dec.id} value={dec.id}>
                      {dec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Contextual Feedback Banner */}
              {selectedDecision === 'diterima' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <strong className="font-semibold text-emerald-950">Pengajuan Siap Diterima:</strong>
                    <p className="mt-0.5 text-emerald-800">
                      Setelah disimpan, pengajuan ini akan siap dilanjutkan ke pendaftaran peserta. Tombol aksi <em>"+ Daftarkan Peserta"</em> akan otomatis aktif pada halaman detail.
                    </p>
                  </div>
                </div>
              )}

              {selectedDecision === 'ditolak' && (
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900 flex items-start gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <strong className="font-semibold text-red-950">Pengajuan Ditolak:</strong>
                    <p className="mt-0.5 text-red-800">
                      Pengajuan ini ditolak. Peserta tidak dapat didaftarkan dari pengajuan ini dan sistem akan membatasi registrasi peserta baru.
                    </p>
                  </div>
                </div>
              )}

              {selectedDecision === 'dalam_proses' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <strong className="font-semibold text-amber-950">Masih Dalam Proses:</strong>
                    <p className="mt-0.5 text-amber-800">
                      Pengajuan masih memerlukan tindak lanjut verifikasi atau seleksi kuota sebelum keputusan final ditetapkan.
                    </p>
                  </div>
                </div>
              )}

              {/* Field 3: Catatan Perubahan (Opsional) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Catatan Perubahan (Opsional)
                </label>
                <p className="mt-0.5 text-xs text-gray-500">
                  Catatan tindak lanjut atau alasan perubahan status untuk riwayat aktivitas.
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Berkas telah diverifikasi, kuota disetujui untuk 2 peserta."
                  className="mt-2 block w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Footer Buttons */}
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
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
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
